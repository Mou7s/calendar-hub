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
    description: '包含 2026 赛季一级方程式赛车 24 站大奖赛，以及 Sprint、排位赛和正赛时间。',
    descriptionEn: 'The complete 2026 Formula 1 calendar with 24 Grands Prix, Sprint, qualifying and race sessions.',
    icsPath: '/ics/f1.ics',
    sourceUrl: 'https://www.formula1.com/en/racing/2026'
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

const F1_2026_RACES = [
  { round: 1, slug: 'australia', key: 'australia', nameEn: 'Australian Grand Prix', nameZh: '澳大利亚大奖赛', venue: 'Albert Park Grand Prix Circuit', date: '2026-03-08', qualifying: '16:00', race: '15:00', offsetMinutes: 660 },
  { round: 2, slug: 'china', key: 'china', nameEn: 'Chinese Grand Prix', nameZh: '中国大奖赛', venue: 'Shanghai International Circuit', date: '2026-03-15', sprint: '11:00', qualifying: '15:00', race: '15:00', offsetMinutes: 480 },
  { round: 3, slug: 'japan', key: 'japan', nameEn: 'Japanese Grand Prix', nameZh: '日本大奖赛', venue: 'Suzuka International Racing Course', date: '2026-03-29', qualifying: '15:00', race: '14:00', offsetMinutes: 540 },
  { round: 4, slug: 'bahrain', key: 'bahrain', nameEn: 'Bahrain Grand Prix', nameZh: '巴林大奖赛', venue: 'Bahrain International Circuit', date: '2026-04-12', qualifying: '19:00', race: '18:00', offsetMinutes: 180 },
  { round: 5, slug: 'saudi-arabia', key: 'saudi-arabia', nameEn: 'Saudi Arabian Grand Prix', nameZh: '沙特阿拉伯大奖赛', venue: 'Jeddah Corniche Circuit', date: '2026-04-19', qualifying: '20:00', race: '20:00', offsetMinutes: 180 },
  { round: 6, slug: 'miami', key: 'miami', nameEn: 'Miami Grand Prix', nameZh: '迈阿密大奖赛', venue: 'Miami International Autodrome', date: '2026-05-03', sprint: '12:00', qualifying: '16:00', race: '16:00', offsetMinutes: -240 },
  { round: 7, slug: 'canada', key: 'canada', nameEn: 'Canadian Grand Prix', nameZh: '加拿大大奖赛', venue: 'Circuit Gilles-Villeneuve', date: '2026-05-24', sprint: '12:00', qualifying: '16:00', race: '16:00', offsetMinutes: -240 },
  { round: 8, slug: 'monaco', key: 'monaco', nameEn: 'Monaco Grand Prix', nameZh: '摩纳哥大奖赛', venue: 'Circuit de Monaco', date: '2026-06-07', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 9, slug: 'barcelona-catalunya', key: 'barcelona', nameEn: 'Barcelona-Catalunya Grand Prix', nameZh: '巴塞罗那-加泰罗尼亚大奖赛', venue: 'Circuit de Barcelona-Catalunya', date: '2026-06-14', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 10, slug: 'austria', key: 'austria', nameEn: 'Austrian Grand Prix', nameZh: '奥地利大奖赛', venue: 'Red Bull Ring', date: '2026-06-28', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 11, slug: 'great-britain', key: 'great-britain', nameEn: 'British Grand Prix', nameZh: '英国大奖赛', venue: 'Silverstone Circuit', date: '2026-07-05', sprint: '12:00', qualifying: '16:00', race: '15:00', offsetMinutes: 60 },
  { round: 12, slug: 'belgium', key: 'belgium', nameEn: 'Belgian Grand Prix', nameZh: '比利时大奖赛', venue: 'Circuit de Spa-Francorchamps', date: '2026-07-19', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 13, slug: 'hungary', key: 'hungary', nameEn: 'Hungarian Grand Prix', nameZh: '匈牙利大奖赛', venue: 'Hungaroring', date: '2026-07-26', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 14, slug: 'netherlands', key: 'netherlands', nameEn: 'Dutch Grand Prix', nameZh: '荷兰大奖赛', venue: 'Circuit Zandvoort', date: '2026-08-23', sprint: '12:00', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 15, slug: 'italy', key: 'italy', nameEn: 'Italian Grand Prix', nameZh: '意大利大奖赛', venue: 'Autodromo Nazionale Monza', date: '2026-09-06', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 16, slug: 'spain', key: 'spain', nameEn: 'Spanish Grand Prix', nameZh: '西班牙大奖赛', venue: 'Madrid, Spain', date: '2026-09-13', qualifying: '16:00', race: '15:00', offsetMinutes: 120 },
  { round: 17, slug: 'azerbaijan', key: 'azerbaijan', nameEn: 'Azerbaijan Grand Prix', nameZh: '阿塞拜疆大奖赛', venue: 'Baku City Circuit', date: '2026-09-26', qualifying: '16:00', race: '15:00', offsetMinutes: 240 },
  { round: 18, slug: 'singapore', key: 'singapore', nameEn: 'Singapore Grand Prix', nameZh: '新加坡大奖赛', venue: 'Marina Bay Street Circuit', date: '2026-10-11', sprint: '17:00', qualifying: '21:00', race: '20:00', offsetMinutes: 480 },
  { round: 19, slug: 'united-states', key: 'united-states', nameEn: 'United States Grand Prix', nameZh: '美国大奖赛', venue: 'Circuit of the Americas', date: '2026-10-25', qualifying: '16:00', race: '15:00', offsetMinutes: -300 },
  { round: 20, slug: 'mexico', key: 'mexico', nameEn: 'Mexico City Grand Prix', nameZh: '墨西哥城大奖赛', venue: 'Autódromo Hermanos Rodríguez', date: '2026-11-01', qualifying: '15:00', race: '14:00', offsetMinutes: -360 },
  { round: 21, slug: 'sao-paulo', key: 'brazil', nameEn: 'São Paulo Grand Prix', nameZh: '圣保罗大奖赛', venue: 'Autódromo José Carlos Pace', date: '2026-11-08', qualifying: '15:00', race: '14:00', offsetMinutes: -180 },
  { round: 22, slug: 'las-vegas', key: 'las-vegas', nameEn: 'Las Vegas Grand Prix', nameZh: '拉斯维加斯大奖赛', venue: 'Las Vegas Strip Circuit', date: '2026-11-21', qualifying: '20:00', race: '20:00', offsetMinutes: -480 },
  { round: 23, slug: 'qatar', key: 'qatar', nameEn: 'Qatar Grand Prix', nameZh: '卡塔尔大奖赛', venue: 'Lusail International Circuit', date: '2026-11-29', qualifying: '21:00', race: '19:00', offsetMinutes: 180 },
  { round: 24, slug: 'abu-dhabi', key: 'abu-dhabi', nameEn: 'Abu Dhabi Grand Prix', nameZh: '阿布扎比大奖赛', venue: 'Yas Marina Circuit', date: '2026-12-06', qualifying: '18:00', race: '17:00', offsetMinutes: 240 }
]

const localF1TimeToIso = (date, time, offsetMinutes) => {
  const [hours, minutes] = time.split(':').map(Number)
  const utcMillis = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hours,
    minutes
  ) - offsetMinutes * 60 * 1000

  return new Date(utcMillis).toISOString()
}

const addMinutes = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60 * 1000).toISOString()

const createF1Session = (race, sessionId, sessionEn, sessionZh, localTime, durationMinutes) => {
  const launchAt = localF1TimeToIso(race.date, localTime, race.offsetMinutes)
  const titleEn = `2026 ${race.nameEn} - ${sessionEn}`
  const titleZh = `F1 2026 ${race.nameZh} - ${sessionZh}`

  return {
    id: `f1-2026-${race.key}-${sessionId}`,
    title: titleEn,
    titleEn,
    titleZh,
    shortTitle: `${race.nameEn} - ${sessionEn}`,
    shortTitleEn: `${race.nameEn} - ${sessionEn}`,
    shortTitleZh: `${race.nameZh} - ${sessionZh}`,
    launchAt,
    launchWindow: { open: launchAt, close: addMinutes(launchAt, durationMinutes) },
    vehicle: 'Formula 1 Car',
    launchSite: race.venue,
    missionType: `F1 ${sessionEn}`,
    missionUrl: `https://www.formula1.com/en/racing/2026/${race.slug}`,
    isLive: false
  }
}

const F1_2026_EVENTS = F1_2026_RACES.flatMap((race) => {
  const sessions = [
    race.sprint ? createF1Session(race, 'sprint', 'Sprint', '冲刺赛', race.sprint, 90) : null,
    createF1Session(race, 'qualifying', 'Qualifying', '排位赛', race.qualifying, 60),
    createF1Session(race, 'race', 'Race', '正赛', race.race, 120)
  ]

  return sessions.filter(Boolean)
})

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
  'f1': F1_2026_EVENTS,
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
    title: item.titleEn || item.title,
    titleEn: item.titleEn || item.title,
    titleZh: item.titleZh || item.title,
    shortTitle: item.shortTitleEn || item.shortTitle || item.titleEn || item.title,
    shortTitleEn: item.shortTitleEn || item.shortTitle || item.titleEn || item.title,
    shortTitleZh: item.shortTitleZh || item.titleZh || item.title,
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
    launchWindow: item.launchWindow || { open: item.launchAt, close: null },
    calendarId: topicId
  }));

  missions.sort((a, b) => Date.parse(a.launchAt || 0) - Date.parse(b.launchAt || 0));

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
        `URL:${mission.missionUrl || 'https://calendarhub.mou7s.com'}`,
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
