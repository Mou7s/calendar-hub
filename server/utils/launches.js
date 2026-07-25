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
  { id: 'all', name: '全部机构', code: 'ALL' },
  { id: 'spacex', name: 'SpaceX', code: 'SpaceX' },
  { id: 'rocketlab', name: 'Rocket Lab', code: 'Rocket Lab' },
  { id: 'nasa', name: 'NASA', code: 'NASA' },
  { id: 'casc', name: 'CASC 中国航天', code: 'CASC' },
  { id: 'blue-origin', name: 'Blue Origin', code: 'Blue Origin' },
  { id: 'ula', name: 'ULA 联合发射', code: 'ULA' },
  { id: 'esa', name: 'ESA 欧洲空间局', code: 'ESA' },
];

/**
 * 将 Launch Library 2 / 外部机构名称映射为标准内部 Provider ID
 */
export function resolveProvider(providerName = '', rocketName = '') {
  const name = (providerName + ' ' + rocketName).toLowerCase();
  
  if (name.includes('spacex')) return { id: 'spacex', name: 'SpaceX' };
  if (name.includes('rocket lab') || name.includes('electron')) return { id: 'rocketlab', name: 'Rocket Lab' };
  if (name.includes('nasa')) return { id: 'nasa', name: 'NASA' };
  if (name.includes('casc') || name.includes('china') || name.includes('long march') || name.includes('长征')) return { id: 'casc', name: 'CASC 中国航天' };
  if (name.includes('blue origin') || name.includes('new shepard') || name.includes('new glenn')) return { id: 'blue-origin', name: 'Blue Origin' };
  if (name.includes('united launch alliance') || name.includes('ula') || name.includes('vulcan') || name.includes('atlas')) return { id: 'ula', name: 'ULA 联合发射' };
  if (name.includes('esa') || name.includes('ariane') || name.includes('vega')) return { id: 'esa', name: 'ESA 欧洲空间局' };
  
  return { id: 'other', name: providerName || '航天发射' };
}

/**
 * 将 Launch Library 2 的原始数据标准化为统一的 Mission 格式
 */
export function normalizeLl2Mission(item) {
  const providerInfo = resolveProvider(
    item.launch_service_provider?.name || '',
    item.rocket?.configuration?.full_name || ''
  );

  const launchAt = item.net || null;

  return {
    id: `ll2-${item.id}`,
    correlationId: item.id,
    provider: providerInfo.id,
    providerName: providerInfo.name,
    slug: item.slug || item.id,
    missionUrl: item.url || (item.vidURLs && item.vidURLs[0]?.url) || 'https://thespacedevs.com',
    title: item.name || 'Rocket Launch',
    shortTitle: item.mission?.name || item.name || 'Rocket Launch',
    missionType: item.mission?.type || 'Space Flight',
    vehicle: item.rocket?.configuration?.full_name || 'Rocket',
    launchSite: item.pad?.name || item.pad?.location?.name || 'TBD',
    returnSite: 'TBD',
    callToAction: 'View Launch',
    status: item.status?.name || 'Scheduled',
    isLive: Boolean(item.webcast_live),
    directToCell: false,
    image: item.image || item.rocket?.configuration?.image_url || null,
    launchAt,
    returnAt: null,
    launchWindow: {
      open: launchAt,
      close: item.window_end || null,
      tZero: launchAt,
      precision: item.net_precision?.name === 'Minute' || item.net_precision?.name === 'Second' ? 'exact' : 'window'
    }
  };
}

/**
 * 从 Launch Library 2 抓取全球即时航天任务（含超时和降级保护）
 */
export async function fetchGlobalLaunchesFromLl2(fetchImpl = fetch) {
  const LL2_URL = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=25&mode=detailed';
  
  // 设置 4 秒超时器，防止外部接口卡顿挂起边缘节点
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetchImpl(LL2_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'spaceXcalendar-cloudflare-worker'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`LL2 fetch failed with status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map(normalizeLl2Mission);
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Failed to fetch from LL2, gracefully falling back:', error.message || error);
    return [];
  }
}

/**
 * 合并 SpaceX 官方源与全球源，去重并归一化
 */
export async function loadGlobalLaunches(fetchImpl = fetch, now = new Date()) {
  // 并行尝试拉取 SpaceX 官方源与 LL2 全球源
  const [spacexDataResult, ll2MissionsResult] = await Promise.allSettled([
    loadSpaceXLaunchData(fetchImpl, now),
    fetchGlobalLaunchesFromLl2(fetchImpl)
  ]);

  let spacexMissions = [];
  let spacexRefreshedAt = new Date().toISOString();

  if (spacexDataResult.status === 'fulfilled') {
    spacexMissions = spacexDataResult.value.missions.map(m => ({
      ...m,
      provider: 'spacex',
      providerName: 'SpaceX'
    }));
    spacexRefreshedAt = spacexDataResult.value.refreshedAt;
  }

  let ll2Missions = [];
  if (ll2MissionsResult.status === 'fulfilled') {
    ll2Missions = ll2MissionsResult.value;
  }

  // 去重逻辑：对于 SpaceX 任务，以 SpaceX 官方源的数据为准（避免与 LL2 数据重复）
  const filteredLl2 = ll2Missions.filter(m => {
    if (m.provider === 'spacex') {
      return false; // 排除 LL2 中的 SpaceX，优先保持 SpaceX 官方源极高精确度
    }
    return isFutureMission(m, now);
  });

  if (spacexDataResult.status === 'rejected' && filteredLl2.length === 0) {
    throw new Error(`Failed to load launch data: ${spacexDataResult.reason?.message || spacexDataResult.reason}`);
  }

  // 合并数据
  const combinedMissions = sortMissions([...spacexMissions, ...filteredLl2]);

  // 重新计算按月份分布的统计
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
    refreshedAt: spacexRefreshedAt,
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
