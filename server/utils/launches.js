/**
 * 全球航天发射日历 - 多机构数据源抽象层
 * 本模块负责对接全球航天机构数据（SpaceX, Rocket Lab, NASA, CASC中国航天, Blue Origin 等）
 * 实现数据聚合、标准化清洗、去重排序以及多分类 ICS 订阅流输出。
 */

import {
  loadLaunchData as loadSpaceXLaunchData,
  escapeIcsText,
  formatIcsDate,
  foldIcsLine,
  buildSequence,
  buildMissionUrl,
  sortMissions,
  isFutureMission
} from './spacex.js';

export const PROVIDERS = [
  { id: 'spacex', name: 'SpaceX', code: 'SpaceX' }
];

/**
 * 拉取并封装 SpaceX 官方任务数据
 */
export async function loadGlobalLaunches(fetchImpl = fetch, now = new Date()) {
  const spacexData = await loadSpaceXLaunchData(fetchImpl, now);

  const spacexMissions = (spacexData.missions || []).map(m => ({
    ...m,
    provider: 'spacex',
    providerName: 'SpaceX'
  }));

  const combinedMissions = sortMissions(spacexMissions);

  // 计算按月份分布的统计
  const counts = new Map();
  for (const mission of combinedMissions) {
    if (!mission.launchAt) continue;
    const date = new Date(mission.launchAt);
    const isoMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    counts.set(isoMonth, (counts.get(isoMonth) || 0) + 1);
  }

  const monthSummary = Array.from(counts, ([isoMonth, count]) => ({
    isoMonth,
    label: isoMonth,
    count
  }));

  return {
    refreshedAt: spacexData.refreshedAt || new Date().toISOString(),
    providers: PROVIDERS,
    nextLaunch: combinedMissions.find(m => m.launchAt) || combinedMissions[0] || null,
    monthSummary,
    missions: combinedMissions
  };
}

/**
 * 构建多机构全量/按机构过滤的 ICS 订阅文件 (RFC 5545)
 */
export function buildGlobalCalendarFeed(data, providerFilter = 'all') {
  let missions = data.missions || [];

  if (providerFilter && providerFilter !== 'all') {
    missions = missions.filter(m => m.provider === providerFilter);
  }

  const dtStamp = formatIcsDate(data.refreshedAt || new Date().toISOString());
  const sequence = buildSequence(data.refreshedAt || new Date().toISOString());

  const calName = providerFilter === 'spacex' 
    ? 'SpaceX Launches' 
    : providerFilter === 'rocketlab'
    ? 'Rocket Lab Launches'
    : providerFilter === 'nasa'
    ? 'NASA Launches'
    : 'Global Rocket Launches';

  const events = missions
    .map(mission => {
      if (!mission.launchAt) return null;

      const eventDtStamp = mission.firstDiscovered ? formatIcsDate(mission.firstDiscovered) : dtStamp;
      const eventLastModified = mission.lastModified ? formatIcsDate(mission.lastModified) : dtStamp;
      const eventSequence = mission.sequence ?? sequence;

      // 锁定 UID 红线：如果是 spacex 且具备 correlationId/id，维持原唯一 ID 生成逻辑，避免引发重发
      const uidDomain = mission.provider === 'spacex' ? 'spacexcalendar.local' : 'launches.local';
      const uid = `${mission.correlationId || mission.id}@${uidDomain}`;

      const descLines = [
        mission.title,
        `Provider: ${mission.providerName || 'Space Flight'}`,
        `Vehicle: ${mission.vehicle || 'TBD'}`,
        `Launch site: ${mission.launchSite || 'TBD'}`,
        `Mission type: ${mission.missionType || 'TBD'}`,
      ];
      if (mission.launchWindow?.close) {
        descLines.push(`Launch window closes: ${mission.launchWindow.close}`);
      }

      const lines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${eventDtStamp}`,
        `LAST-MODIFIED:${eventLastModified}`,
        `SEQUENCE:${eventSequence}`,
        `DTSTART:${formatIcsDate(mission.launchAt)}`,
        `SUMMARY:[${mission.providerName || 'Space'}] ${escapeIcsText(mission.title)}`,
        `DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`,
        `LOCATION:${escapeIcsText(mission.launchSite || 'TBD')}`,
        `STATUS:${mission.isLive ? 'CONFIRMED' : 'TENTATIVE'}`,
        'TRANSP:OPAQUE',
        `CATEGORIES:${escapeIcsText(mission.providerName || 'Rocket Launch')}`,
        `URL:${mission.missionUrl || 'https://spacex-calendar.mou7s.com'}`,
        'END:VEVENT'
      ];

      if (mission.launchWindow?.close) {
        lines.splice(4, 0, `DTEND:${formatIcsDate(mission.launchWindow.close)}`);
      }

      return lines.map(foldIcsLine).join('\r\n');
    })
    .filter(Boolean)
    .join('\r\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//globalRocketCalendar//Global Launch Feed//EN',
    `X-WR-CALNAME:${calName}`,
    `X-WR-CALDESC:Global rocket launch schedule feed powered by Global Rocket Calendar.`,
    'X-PUBLISHED-TTL:PT1H',
    events,
    'END:VCALENDAR'
  ];

  return `${lines.filter(Boolean).join('\r\n')}\r\n`;
}
