/**
 * Calendar Hub - 多主题在线日历注册与数据生成中心
 * 本模块负责管理全站各种主题日历（SpaceX、科技发布会、F1赛车、游戏发售、节假日调休等）
 * 提供统一的数据拉取、标准化清洗以及 RFC 5545 ICS 序列化能力。
 */

import { loadLaunchData, escapeIcsText, formatIcsDate, foldIcsLine, buildSequence } from './spacex.js'

export const CALENDAR_TOPICS = [
  {
    id: 'spacex',
    name: 'SpaceX 发射日历',
    nameEn: 'SpaceX Launch Calendar',
    category: 'tech',
    icon: 'i-heroicons-rocket-launch',
    color: 'blue',
    description: '实时追踪 SpaceX 猎鹰九号、重型猎鹰及星舰的最新发射日程与官方直播地址。',
    descriptionEn: 'Real-time schedule for SpaceX Falcon 9, Falcon Heavy and Starship launches.',
    icsPath: '/ics/spacex.ics'
  },
  {
    id: 'tech-events',
    name: '科技大厂发布会日历',
    nameEn: 'Tech Keynote & Events Calendar',
    category: 'tech',
    icon: 'i-heroicons-cpu-chip',
    color: 'emerald',
    description: '涵盖 Apple WWDC/秋季发布会、Google I/O、OpenAI 开发者大会及各大科技巨头重磅活动。',
    descriptionEn: 'Upcoming tech keynotes from Apple, Google, OpenAI, Microsoft, and tech giants.',
    icsPath: '/ics/tech-events.ics'
  },
  {
    id: 'f1',
    name: 'F1 赛车大奖赛赛程',
    nameEn: 'F1 Grand Prix Schedule',
    category: 'sports',
    icon: 'i-heroicons-trophy',
    color: 'red',
    description: '包含 2026 赛季一级方程式赛车所有站次排位赛与正赛的时间及大奖赛赛道。',
    descriptionEn: 'Full 2026 Formula 1 Grand Prix weekend schedules, practice, qualifying and races.',
    icsPath: '/ics/f1.ics'
  },
  {
    id: 'games',
    name: '重磅 3A 游戏发售日历',
    nameEn: 'Major Game Releases',
    category: 'entertainment',
    icon: 'i-heroicons-device-phone-mobile',
    color: 'purple',
    description: '汇总全平台 Steam、PlayStation、Xbox 及 Switch 备受瞩目的重磅大作发售日期。',
    descriptionEn: 'Upcoming AAA game release dates across PC, PlayStation, Xbox, and Nintendo.',
    icsPath: '/ics/games.ics'
  },
  {
    id: 'holidays',
    name: '中国法定节假日与调休',
    nameEn: 'China Public Holidays',
    category: 'lifestyle',
    icon: 'i-heroicons-calendar-days',
    color: 'amber',
    description: '精准包含国务院公布的元旦、春节、清明、劳动、端午、中秋及国庆放假与调休提醒。',
    descriptionEn: 'Official China public holidays and adjusted working days schedule.',
    icsPath: '/ics/holidays.ics'
  }
]

// 内置预设的非 SpaceX 主题静态/精选日历事件数据
const STATIC_TOPIC_DATA = {
  'tech-events': [
    {
      id: 'tech-apple-wwdc-2026',
      title: 'Apple WWDC 2026 全球开发者大会',
      launchAt: '2026-06-08T17:00:00.000Z',
      launchWindow: { close: '2026-06-08T19:00:00.000Z' },
      vehicle: 'Keynote 演讲',
      launchSite: 'Apple Park / 在线直播',
      missionType: 'Tech Conference',
      missionUrl: 'https://developer.apple.com/wwdc/',
      isLive: false
    },
    {
      id: 'tech-google-io-2026',
      title: 'Google I/O 2026 开发者大会',
      launchAt: '2026-05-19T17:00:00.000Z',
      launchWindow: { close: '2026-05-19T19:00:00.000Z' },
      vehicle: 'Google AI & Android Update',
      launchSite: 'Mountain View, CA',
      missionType: 'Tech Conference',
      missionUrl: 'https://io.google/',
      isLive: false
    },
    {
      id: 'tech-apple-fall-2026',
      title: 'Apple 2026 秋季新品发布会 (iPhone 18)',
      launchAt: '2026-09-15T17:00:00.000Z',
      launchWindow: { close: '2026-09-15T19:00:00.000Z' },
      vehicle: 'iPhone & Apple Watch',
      launchSite: 'Steve Jobs Theater',
      missionType: 'Product Event',
      missionUrl: 'https://www.apple.com/apple-events/',
      isLive: false
    }
  ],
  'f1': [
    {
      id: 'f1-bahrain-2026',
      title: 'F1 2026 巴林大奖赛 - 正赛',
      launchAt: '2026-03-29T15:00:00.000Z',
      launchWindow: { close: '2026-03-29T17:00:00.000Z' },
      vehicle: 'Formula 1 Car',
      launchSite: 'Bahrain International Circuit',
      missionType: 'Grand Prix Race',
      missionUrl: 'https://www.formula1.com',
      isLive: false
    },
    {
      id: 'f1-monaco-2026',
      title: 'F1 2026 摩纳哥大奖赛 - 正赛',
      launchAt: '2026-05-24T13:00:00.000Z',
      launchWindow: { close: '2026-05-24T15:00:00.000Z' },
      vehicle: 'Formula 1 Car',
      launchSite: 'Circuit de Monaco',
      missionType: 'Grand Prix Race',
      missionUrl: 'https://www.formula1.com',
      isLive: false
    },
    {
      id: 'f1-shanghai-2026',
      title: 'F1 2026 中国大奖赛 - 上海站正赛',
      launchAt: '2026-04-19T07:00:00.000Z',
      launchWindow: { close: '2026-04-19T09:00:00.000Z' },
      vehicle: 'Formula 1 Car',
      launchSite: 'Shanghai International Circuit',
      missionType: 'Grand Prix Race',
      missionUrl: 'https://www.formula1.com',
      isLive: false
    }
  ],
  'games': [
    {
      id: 'game-gta6-2026',
      title: '《Grand Theft Auto VI》(GTA6) 正式发售',
      launchAt: '2026-10-27T00:00:00.000Z',
      launchWindow: { close: null },
      vehicle: 'PS5 / Xbox Series X|S',
      launchSite: 'Global Digital Release',
      missionType: 'Game Launch',
      missionUrl: 'https://www.rockstargames.com/VI',
      isLive: false
    },
    {
      id: 'game-elder-scrolls-6',
      title: '《上古卷轴6》最新重磅情报公布',
      launchAt: '2026-06-14T18:00:00.000Z',
      launchWindow: { close: null },
      vehicle: 'Bethesda Games Showcase',
      launchSite: 'Xbox Games Showcase 2026',
      missionType: 'Game Reveal',
      missionUrl: 'https://bethesda.net',
      isLive: false
    }
  ],
  'holidays': [
    {
      id: 'holiday-laborday-2026',
      title: '🇨🇳 劳动节假期 (5月1日 ~ 5月5日)',
      launchAt: '2026-05-01T00:00:00.000Z',
      launchWindow: { close: '2026-05-05T23:59:59.000Z' },
      vehicle: '法定节假日',
      launchSite: '中国',
      missionType: 'Public Holiday',
      missionUrl: 'http://www.gov.cn',
      isLive: false
    },
    {
      id: 'holiday-nationalday-2026',
      title: '🇨🇳 国庆节与中秋节黄金周 (10月1日 ~ 10月8日)',
      launchAt: '2026-10-01T00:00:00.000Z',
      launchWindow: { close: '2026-10-08T23:59:59.000Z' },
      vehicle: '法定节假日',
      launchSite: '中国',
      missionType: 'Public Holiday',
      missionUrl: 'http://www.gov.cn',
      isLive: false
    }
  ]
}

/**
 * 根据 Topic ID 获取主题日历数据（SpaceX 实时 API 或预设数据）
 */
export async function getTopicCalendarData(topicId, fetchImpl = fetch) {
  if (topicId === 'spacex') {
    return await loadLaunchData(fetchImpl);
  }

  const topicConfig = CALENDAR_TOPICS.find(t => t.id === topicId) || CALENDAR_TOPICS[0];
  const items = STATIC_TOPIC_DATA[topicId] || [];

  const missions = items.map(item => ({
    id: item.id,
    correlationId: item.id,
    slug: item.id,
    missionUrl: item.missionUrl,
    title: item.title,
    shortTitle: item.title,
    missionType: item.missionType,
    vehicle: item.vehicle,
    launchSite: item.launchSite,
    returnSite: 'N/A',
    callToAction: 'View Event',
    status: 'Confirmed',
    isLive: item.isLive,
    directToCell: false,
    image: null,
    launchAt: item.launchAt,
    returnAt: null,
    launchWindow: item.launchWindow || { open: item.launchAt, close: null }
  }));

  // 计算月份分布
  const counts = new Map();
  for (const m of missions) {
    if (!m.launchAt) continue;
    const date = new Date(m.launchAt);
    const isoMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    counts.set(isoMonth, (counts.get(isoMonth) || 0) + 1);
  }

  const monthSummary = Array.from(counts, ([isoMonth, count]) => ({
    isoMonth,
    label: isoMonth,
    count
  }));

  return {
    refreshedAt: new Date().toISOString(),
    topic: topicConfig,
    nextLaunch: missions[0] || null,
    monthSummary,
    missions
  };
}

/**
 * 通用主题日历 ICS (RFC 5545) 生成器
 */
export function buildTopicCalendarFeed(topicId, data) {
  const topicConfig = CALENDAR_TOPICS.find(t => t.id === topicId) || { nameEn: 'Calendar Hub Feed' };
  const missions = data.missions || [];

  const dtStamp = formatIcsDate(data.refreshedAt || new Date().toISOString());
  const sequence = buildSequence(data.refreshedAt || new Date().toISOString());

  const events = missions
    .map(mission => {
      if (!mission.launchAt) return null;

      const eventDtStamp = mission.firstDiscovered ? formatIcsDate(mission.firstDiscovered) : dtStamp;
      const eventLastModified = mission.lastModified ? formatIcsDate(mission.lastModified) : dtStamp;
      const eventSequence = mission.sequence ?? sequence;

      const uidDomain = topicId === 'spacex' ? 'spacexcalendar.local' : 'calendarhub.local';
      const uid = `${mission.correlationId || mission.id}@${uidDomain}`;

      const descLines = [
        mission.title,
        `Category: ${topicConfig.nameEn || 'Event'}`,
        `Details: ${mission.vehicle || 'N/A'}`,
        `Location: ${mission.launchSite || 'Online'}`,
      ];
      if (mission.launchWindow?.close) {
        descLines.push(`Ends at: ${mission.launchWindow.close}`);
      }

      const lines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${eventDtStamp}`,
        `LAST-MODIFIED:${eventLastModified}`,
        `SEQUENCE:${eventSequence}`,
        `DTSTART:${formatIcsDate(mission.launchAt)}`,
        `SUMMARY:${escapeIcsText(mission.title)}`,
        `DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`,
        `LOCATION:${escapeIcsText(mission.launchSite || 'Online')}`,
        `STATUS:${mission.isLive ? 'CONFIRMED' : 'TENTATIVE'}`,
        'TRANSP:OPAQUE',
        `CATEGORIES:${escapeIcsText(topicConfig.nameEn || 'Event')}`,
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
    'PRODID:-//calendarHub//Universal Calendar Feed//EN',
    `X-WR-CALNAME:${topicConfig.nameEn || 'Calendar Feed'}`,
    `X-WR-CALDESC:Online calendar subscription powered by Calendar Hub.`,
    'X-PUBLISHED-TTL:PT1H',
    events,
    'END:VCALENDAR'
  ];

  return `${lines.filter(Boolean).join('\r\n')}\r\n`;
}
