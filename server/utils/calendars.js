/**
 * Calendar Hub - 多主题在线日历注册与数据生成中心
 * 本模块负责管理全站各种主题日历（SpaceX、科技发布会、F1赛车、游戏发售、节假日调休等）
 * 提供统一的数据拉取、标准化清洗以及 RFC 5545 ICS 序列化能力。
 */

import { loadLaunchData, escapeIcsText, formatIcsDate, foldIcsLine, buildSequence } from './spacex.js'

export const F1_2026_SOURCE_URL = 'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY'

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
  { round: 1, slug: 'australia', key: 'australia', nameEn: 'Australian Grand Prix', nameZh: '澳大利亚大奖赛', venue: 'Albert Park Grand Prix Circuit', sessions: { qualifying: '2026-03-07T16:00', race: '2026-03-08T15:00' }, offsetMinutes: 660 },
  { round: 2, slug: 'china', key: 'china', nameEn: 'Chinese Grand Prix', nameZh: '中国大奖赛', venue: 'Shanghai International Circuit', sessions: { sprint: '2026-03-14T11:00', qualifying: '2026-03-14T15:00', race: '2026-03-15T15:00' }, offsetMinutes: 480 },
  { round: 3, slug: 'japan', key: 'japan', nameEn: 'Japanese Grand Prix', nameZh: '日本大奖赛', venue: 'Suzuka International Racing Course', sessions: { qualifying: '2026-03-28T15:00', race: '2026-03-29T14:00' }, offsetMinutes: 540 },
  { round: 4, slug: 'bahrain', key: 'bahrain', nameEn: 'Bahrain Grand Prix', nameZh: '巴林大奖赛', venue: 'Bahrain International Circuit', sessions: { qualifying: '2026-04-11T19:00', race: '2026-04-12T18:00' }, offsetMinutes: 180 },
  { round: 5, slug: 'saudi-arabia', key: 'saudi-arabia', nameEn: 'Saudi Arabian Grand Prix', nameZh: '沙特阿拉伯大奖赛', venue: 'Jeddah Corniche Circuit', sessions: { qualifying: '2026-04-18T20:00', race: '2026-04-19T20:00' }, offsetMinutes: 180 },
  { round: 6, slug: 'miami', key: 'miami', nameEn: 'Miami Grand Prix', nameZh: '迈阿密大奖赛', venue: 'Miami International Autodrome', sessions: { sprint: '2026-05-02T12:00', qualifying: '2026-05-02T16:00', race: '2026-05-03T16:00' }, offsetMinutes: -240 },
  { round: 7, slug: 'canada', key: 'canada', nameEn: 'Canadian Grand Prix', nameZh: '加拿大大奖赛', venue: 'Circuit Gilles-Villeneuve', sessions: { sprint: '2026-05-23T12:00', qualifying: '2026-05-23T16:00', race: '2026-05-24T16:00' }, offsetMinutes: -240 },
  { round: 8, slug: 'monaco', key: 'monaco', nameEn: 'Monaco Grand Prix', nameZh: '摩纳哥大奖赛', venue: 'Circuit de Monaco', sessions: { qualifying: '2026-06-06T16:00', race: '2026-06-07T15:00' }, offsetMinutes: 120 },
  { round: 9, slug: 'barcelona-catalunya', key: 'barcelona', nameEn: 'Barcelona-Catalunya Grand Prix', nameZh: '巴塞罗那-加泰罗尼亚大奖赛', venue: 'Circuit de Barcelona-Catalunya', sessions: { qualifying: '2026-06-13T16:00', race: '2026-06-14T15:00' }, offsetMinutes: 120 },
  { round: 10, slug: 'austria', key: 'austria', nameEn: 'Austrian Grand Prix', nameZh: '奥地利大奖赛', venue: 'Red Bull Ring', sessions: { qualifying: '2026-06-27T16:00', race: '2026-06-28T15:00' }, offsetMinutes: 120 },
  { round: 11, slug: 'great-britain', key: 'great-britain', nameEn: 'British Grand Prix', nameZh: '英国大奖赛', venue: 'Silverstone Circuit', sessions: { sprint: '2026-07-04T12:00', qualifying: '2026-07-04T16:00', race: '2026-07-05T15:00' }, offsetMinutes: 60 },
  { round: 12, slug: 'belgium', key: 'belgium', nameEn: 'Belgian Grand Prix', nameZh: '比利时大奖赛', venue: 'Circuit de Spa-Francorchamps', sessions: { qualifying: '2026-07-18T16:00', race: '2026-07-19T15:00' }, offsetMinutes: 120 },
  { round: 13, slug: 'hungary', key: 'hungary', nameEn: 'Hungarian Grand Prix', nameZh: '匈牙利大奖赛', venue: 'Hungaroring', sessions: { qualifying: '2026-07-25T16:00', race: '2026-07-26T15:00' }, offsetMinutes: 120 },
  { round: 14, slug: 'netherlands', key: 'netherlands', nameEn: 'Dutch Grand Prix', nameZh: '荷兰大奖赛', venue: 'Circuit Zandvoort', sessions: { sprint: '2026-08-22T12:00', qualifying: '2026-08-22T16:00', race: '2026-08-23T15:00' }, offsetMinutes: 120 },
  { round: 15, slug: 'italy', key: 'italy', nameEn: 'Italian Grand Prix', nameZh: '意大利大奖赛', venue: 'Autodromo Nazionale Monza', sessions: { qualifying: '2026-09-05T16:00', race: '2026-09-06T15:00' }, offsetMinutes: 120 },
  { round: 16, slug: 'spain', key: 'spain', nameEn: 'Spanish Grand Prix', nameZh: '西班牙大奖赛', venue: 'Madrid, Spain', sessions: { qualifying: '2026-09-12T16:00', race: '2026-09-13T15:00' }, offsetMinutes: 120 },
  { round: 17, slug: 'azerbaijan', key: 'azerbaijan', nameEn: 'Azerbaijan Grand Prix', nameZh: '阿塞拜疆大奖赛', venue: 'Baku City Circuit', sessions: { qualifying: '2026-09-25T16:00', race: '2026-09-26T15:00' }, offsetMinutes: 240 },
  { round: 18, slug: 'singapore', key: 'singapore', nameEn: 'Singapore Grand Prix', nameZh: '新加坡大奖赛', venue: 'Marina Bay Street Circuit', sessions: { sprint: '2026-10-10T17:00', qualifying: '2026-10-10T21:00', race: '2026-10-11T20:00' }, offsetMinutes: 480 },
  { round: 19, slug: 'united-states', key: 'united-states', nameEn: 'United States Grand Prix', nameZh: '美国大奖赛', venue: 'Circuit of the Americas', sessions: { qualifying: '2026-10-24T16:00', race: '2026-10-25T15:00' }, offsetMinutes: -300 },
  { round: 20, slug: 'mexico', key: 'mexico', nameEn: 'Mexico City Grand Prix', nameZh: '墨西哥城大奖赛', venue: 'Autódromo Hermanos Rodríguez', sessions: { qualifying: '2026-10-31T15:00', race: '2026-11-01T14:00' }, offsetMinutes: -360 },
  { round: 21, slug: 'sao-paulo', key: 'brazil', nameEn: 'São Paulo Grand Prix', nameZh: '圣保罗大奖赛', venue: 'Autódromo José Carlos Pace', sessions: { qualifying: '2026-11-07T15:00', race: '2026-11-08T14:00' }, offsetMinutes: -180 },
  { round: 22, slug: 'las-vegas', key: 'las-vegas', nameEn: 'Las Vegas Grand Prix', nameZh: '拉斯维加斯大奖赛', venue: 'Las Vegas Strip Circuit', sessions: { qualifying: '2026-11-20T20:00', race: '2026-11-21T20:00' }, offsetMinutes: -480 },
  { round: 23, slug: 'qatar', key: 'qatar', nameEn: 'Qatar Grand Prix', nameZh: '卡塔尔大奖赛', venue: 'Lusail International Circuit', sessions: { qualifying: '2026-11-28T21:00', race: '2026-11-29T19:00' }, offsetMinutes: 180 },
  { round: 24, slug: 'abu-dhabi', key: 'abu-dhabi', nameEn: 'Abu Dhabi Grand Prix', nameZh: '阿布扎比大奖赛', venue: 'Yas Marina Circuit', sessions: { qualifying: '2026-12-05T18:00', race: '2026-12-06T17:00' }, offsetMinutes: 240 }
]

const F1_SOURCE_VENUES = [
  'Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami',
  'Canada', 'Monaco', 'Barcelona', 'Austria', 'Great Britain', 'Belgium',
  'Hungary', 'Netherlands', 'Italy', 'Spain', 'Azerbaijan', 'Singapore',
  'United States', 'Mexico', 'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi'
]

const localF1TimeToIso = (localDateTime, offsetMinutes) => {
  const [date, time] = localDateTime.split('T')
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

const previousDate = (date) => {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() - 1)
  return value.toISOString().slice(0, 10)
}

const normalizeF1Time = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!/^\d{4}$/.test(digits)) {
    throw new Error(`Invalid F1 session time: ${value}`)
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

const decodeHtmlText = (value) => String(value || '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .trim()

export function parseF1OfficialStartTimes(html) {
  const tableStart = html.indexOf('2026 F1 start times')
  if (tableStart < 0) {
    throw new Error('Official F1 start-times table was not found')
  }

  const tableEnd = html.indexOf('</table>', tableStart)
  if (tableEnd < 0) {
    throw new Error('Official F1 start-times table is incomplete')
  }

  const rows = []
  const tableHtml = html.slice(tableStart, tableEnd + 8)
  for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = Array.from(
      rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      match => decodeHtmlText(match[1])
    )
    if (cells.length === 4 && /,\s*[A-Z][a-z]{2}\s+\d{1,2}$/.test(cells[0])) {
      rows.push(cells)
    }
  }

  if (rows.length !== F1_2026_RACES.length) {
    throw new Error(`Expected ${F1_2026_RACES.length} official F1 races, received ${rows.length}`)
  }

  return rows.map((cells, index) => {
    const [venueAndDate, sprint, qualifying, race] = cells
    const venue = venueAndDate.slice(0, venueAndDate.lastIndexOf(',')).trim()
    if (venue !== F1_SOURCE_VENUES[index]) {
      throw new Error(`Unexpected F1 race order at round ${index + 1}: ${venue}`)
    }

    const dateText = venueAndDate.slice(venueAndDate.lastIndexOf(',') + 1).trim()
    const parsedDate = new Date(`${dateText} 2026 12:00:00 UTC`)
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid official F1 race date: ${dateText}`)
    }

    const raceDate = parsedDate.toISOString().slice(0, 10)
    const sessionDate = previousDate(raceDate)
    return {
      ...F1_2026_RACES[index],
      sessions: {
        ...(sprint !== '-' ? { sprint: `${sessionDate}T${normalizeF1Time(sprint)}` } : {}),
        qualifying: `${sessionDate}T${normalizeF1Time(qualifying)}`,
        race: `${raceDate}T${normalizeF1Time(race)}`
      }
    }
  })
}

const createF1Session = (race, sessionId, sessionEn, sessionZh, localDateTime, durationMinutes) => {
  const launchAt = localF1TimeToIso(localDateTime, race.offsetMinutes)
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

const createF1Events = (races) => races.flatMap((race) => {
  const sessions = [
    race.sessions.sprint ? createF1Session(race, 'sprint', 'Sprint', '冲刺赛', race.sessions.sprint, 90) : null,
    createF1Session(race, 'qualifying', 'Qualifying', '排位赛', race.sessions.qualifying, 60),
    createF1Session(race, 'race', 'Race', '正赛', race.sessions.race, 120)
  ]

  return sessions.filter(Boolean)
})

const F1_2026_EVENTS = createF1Events(F1_2026_RACES)

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

  return buildTopicCalendarData(topicId, STATIC_TOPIC_DATA[topicId] || []);
}

function buildTopicCalendarData(topicId, items) {
  const topicConfig = CALENDAR_TOPICS.find(t => t.id === topicId) || CALENDAR_TOPICS[0];

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

export async function loadF1CalendarData(fetchImpl = fetch) {
  const response = await fetchImpl(F1_2026_SOURCE_URL, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'calendarhub-cloudflare-worker'
    }
  })
  if (!response.ok) {
    throw new Error(`Unable to load official F1 schedule: ${response.status}`)
  }

  const races = parseF1OfficialStartTimes(await response.text())
  return buildTopicCalendarData('f1', createF1Events(races))
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
