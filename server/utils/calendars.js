/**
 * Calendar Hub - 多主题在线日历注册与数据生成中心
 * 本模块负责管理全站各种主题日历（SpaceX、科技发布会、F1赛车、游戏发售、节假日调休等）
 * 提供统一的数据拉取、标准化清洗以及 RFC 5545 ICS 序列化能力。
 */

import { loadLaunchData, escapeIcsText, formatIcsDate, foldIcsLine, buildSequence } from './spacex.js'

export const F1_2026_SOURCE_URL = 'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY'

export const WTT_EVENTS_SOURCE_URL = 'https://wtt-web-frontdoor-cthahjeqhbh6aqe3.a01.azurefd.net/websitestaticapifiles/general/wtt_upcoming_only_events_list.json'
export const WTT_SCHEDULE_SOURCE_URL = 'https://wtt-website-api-vm-frontdoor-hhaec5epbhdyfugz.a01.azurefd.net/liveeventsapi/api/cms/GetEventSchedule'
export const WTT_MAIN_SERIES_TIER = 'WTT Series'

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
    id: 'wtt',
    name: 'WTT 乒乓球比赛日历',
    nameEn: 'WTT Table Tennis Calendar',
    category: 'sports',
    icon: 'i-heroicons-trophy',
    color: 'amber',
    description: '同步 WTT 主系列赛事中已经公布对阵和开赛时间的具体比赛。',
    descriptionEn: 'Scheduled matchups from the main WTT Series with confirmed players and start times.',
    icsPath: '/ics/wtt.ics',
    sourceUrl: 'https://www.worldtabletennis.com/events_calendar'
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

const WTT_REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'calendarhub-cloudflare-worker',
  Referer: 'https://www.worldtabletennis.com/'
}

// WTT publishes local venue times without an offset. These IDs and offsets
// mirror the timezone_codes table used by the official WTT frontend.
const WTT_TIMEZONE_OFFSETS = Object.freeze({
  3: '-12:00', 4: '-11:00', 5: '-10:00', 6: '-09:00', 7: '-08:00',
  8: '-07:00', 9: '-08:00', 10: '-07:00', 11: '-07:00', 12: '-07:00',
  13: '-06:00', 14: '-06:00', 15: '-06:00', 16: '-06:00',
  17: '-05:00', 18: '-05:00', 19: '-05:00', 20: '-04:30',
  21: '-04:00', 22: '-04:00', 23: '-04:00', 24: '-04:00', 25: '-04:00',
  26: '-03:30', 27: '-03:00', 28: '-03:00', 29: '-03:00', 30: '-03:00',
  31: '-03:00', 32: '-03:00', 33: '-02:00', 34: '-02:00',
  35: '-01:00', 36: '-01:00', 37: '00:00', 38: '00:00', 39: '00:00',
  40: '+01:00', 41: '00:00', 42: '00:00', 43: '+01:00', 44: '+01:00',
  45: '+01:00', 46: '+01:00', 47: '+01:00', 48: '+01:00',
  49: '+02:00', 50: '+02:00', 51: '+02:00', 52: '+02:00', 53: '+02:00',
  54: '+02:00', 55: '+02:00', 56: '+03:00', 57: '+02:00', 58: '+02:00',
  59: '+03:00', 60: '+03:00', 61: '+02:00', 62: '+03:00', 63: '+03:00',
  64: '+03:00', 65: '+04:00', 66: '+03:30', 67: '+04:00', 68: '+04:00',
  69: '+04:00', 70: '+04:00', 71: '+04:00', 72: '+04:30', 73: '+05:00',
  74: '+05:00', 75: '+05:00', 76: '+05:30', 77: '+05:30', 78: '+05:45',
  79: '+06:00', 80: '+06:00', 81: '+06:30', 82: '+07:00', 83: '+07:00',
  84: '+08:00', 85: '+08:00', 86: '+08:00', 87: '+08:00', 88: '+08:00',
  89: '+08:00', 90: '+08:00', 91: '+09:00', 92: '+09:00', 93: '+09:30',
  94: '+09:30', 95: '+10:00', 96: '+10:00', 97: '+10:00', 98: '+10:00',
  99: '+09:00', 100: '+11:00', 101: '+11:00', 102: '+12:00', 103: '+12:00',
  104: '+12:00', 105: '+12:00', 106: '+12:00', 107: '+13:00', 108: '+13:00'
})

const getWttTimezoneSuffix = (timeZoneId) => {
  if (timeZoneId === null || timeZoneId === undefined || timeZoneId === '') return null

  const offset = WTT_TIMEZONE_OFFSETS[Number(timeZoneId)]
  return offset ? (offset === '00:00' ? 'Z' : offset) : null
}

export function normalizeWttDate(value, timeZoneId) {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  // WTT schedule timestamps without a suffix are local venue times. Keep
  // explicit offsets untouched and use UTC only when the WTT timezone ID is
  // missing or unknown, preserving the legacy fallback behavior.
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
  const normalized = hasExplicitTimezone
    ? raw
    : `${raw}${getWttTimezoneSuffix(timeZoneId) || 'Z'}`
  const timestamp = Date.parse(normalized)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

const isWttNamedCompetitor = (value) => {
  const name = String(value || '').trim()
  if (!name) return false

  return !/^(?:bye|tbd|to be determined|winner|loser)(?:\b|\s)/i.test(name)
}

const getWttCompetitorName = (start) => {
  const competitor = start?.Competitor || {}
  const description = competitor.Description || {}
  const teamName = String(description.TeamName || '').trim()
  if (isWttNamedCompetitor(teamName)) return teamName

  const individualName = [description.FamilyName, description.GivenName]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
  if (isWttNamedCompetitor(individualName)) return individualName

  const athletes = Array.isArray(competitor.Composition?.Athlete)
    ? competitor.Composition.Athlete
    : []
  const athleteNames = athletes
    .map(athlete => [athlete?.Description?.FamilyName, athlete?.Description?.GivenName]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join(' '))
    .filter(isWttNamedCompetitor)

  return athleteNames.join('/')
}

export function normalizeWttOfficialResult(event, resultItem) {
  const matchCard = resultItem?.match_card
  const documentCode = String(resultItem?.documentCode || matchCard?.documentCode || '').trim()
  if (!documentCode) return null

  const rawCompetitors = Array.isArray(matchCard?.competitiors)
    ? matchCard.competitiors
    : Array.isArray(matchCard?.competitors)
      ? matchCard.competitors
      : []
  if (rawCompetitors.length < 2) return null

  const comp1 = rawCompetitors[0]
  const comp2 = rawCompetitors[1]
  const name1 = String(comp1?.competitiorName || comp1?.competitorName || comp1?.players?.[0]?.playerName || '').trim()
  const name2 = String(comp2?.competitiorName || comp2?.competitorName || comp2?.players?.[0]?.playerName || '').trim()
  if (!name1 || !name2 || !isWttNamedCompetitor(name1) || !isWttNamedCompetitor(name2)) return null

  const overallScores = String(matchCard?.resultOverallScores || matchCard?.overallScores || '').trim()
  const rawGameScores = String(matchCard?.resultsGameScores || matchCard?.gameScores || '').trim()
  const gameScores = rawGameScores
    ? rawGameScores.split(',').map(s => s.trim()).filter(s => s && s !== '0-0' && s !== '0 - 0')
    : []

  let winner = null
  let isWinner1 = false
  let isWinner2 = false
  if (overallScores.includes('-')) {
    const [s1, s2] = overallScores.split('-').map(Number)
    if (!Number.isNaN(s1) && !Number.isNaN(s2)) {
      if (s1 > s2) {
        winner = name1
        isWinner1 = true
      } else if (s2 > s1) {
        winner = name2
        isWinner2 = true
      }
    }
  }

  const startUtc = matchCard?.matchDateTime?.startDateUTC
  const startLocal = matchCard?.matchDateTime?.startDateLocal || resultItem?.startDateLocal
  let launchAt = null

  if (startUtc) {
    const m = String(startUtc).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      const [, month, day, year, hour, min, sec = '00'] = m
      launchAt = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`).toISOString()
    } else {
      const parsed = Date.parse(startUtc.includes('Z') ? startUtc : `${startUtc}Z`)
      if (!Number.isNaN(parsed)) {
        launchAt = new Date(parsed).toISOString()
      }
    }
  }

  if (!launchAt && startLocal) {
    const m = String(startLocal).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      const [, month, day, year, hour, min, sec = '00'] = m
      launchAt = normalizeWttDate(`${year}-${month}-${day}T${hour}:${min}:${sec}`, event?.timeZoneId)
    } else {
      launchAt = normalizeWttDate(startLocal, event?.timeZoneId)
    }
  }

  if (!launchAt && (event?.endDateTime || event?.startDateTime)) {
    launchAt = normalizeWttDate(event.startDateTime, event?.timeZoneId)
  }
  if (!launchAt) return null

  const titleEn = `${name1} vs ${name2}`
  const titleZh = `${name1} 对阵 ${name2}`
  const id = `wtt-${event.eventId}-${documentCode.replace(/[-]+$/, '')}`
  const venue = matchCard?.venueName || event?.venueName || ''
  const discipline = matchCard?.subEventName || resultItem?.subEventType || 'Table Tennis Match'
  const roundDesc = matchCard?.subEventDescription || `${discipline} Official Result`

  return {
    id,
    title: titleEn,
    titleEn,
    titleZh,
    shortTitle: titleEn,
    shortTitleEn: titleEn,
    shortTitleZh: titleZh,
    missionType: roundDesc,
    vehicle: discipline,
    launchSite: venue,
    missionUrl: `https://www.worldtabletennis.com/eventInfo?eventId=${encodeURIComponent(event.eventId)}`,
    launchAt,
    launchWindow: { open: launchAt, close: null },
    isLive: false,
    status: 'Finished',
    calendarGroup: 'history',
    scores: overallScores || null,
    gameScores,
    winner,
    competitor1: {
      name: name1,
      org: comp1?.competitiorOrg || comp1?.competitorOrg || comp1?.players?.[0]?.playerOrgCode || '',
      isWinner: isWinner1
    },
    competitor2: {
      name: name2,
      org: comp2?.competitiorOrg || comp2?.competitorOrg || comp2?.players?.[0]?.playerOrgCode || '',
      isWinner: isWinner2
    }
  }
}

export function normalizeWttScheduleUnit(event, unit, now = new Date()) {
  const timeZoneId = event?.timeZoneId
  const launchAt = normalizeWttDate(unit?.StartDate, timeZoneId)
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now)
  if (!launchAt || Number.isNaN(nowMs) || Date.parse(launchAt) < nowMs) return null

  const starts = Array.isArray(unit?.StartList?.Start)
    ? [...unit.StartList.Start].sort((a, b) => (a?.StartOrder || 0) - (b?.StartOrder || 0))
    : []
  const competitors = starts.map(getWttCompetitorName).filter(Boolean)
  if (competitors.length < 2) return null

  const close = normalizeWttDate(unit.EndDate, timeZoneId)
  const launchWindow = close && Date.parse(close) > Date.parse(launchAt)
    ? { open: launchAt, close }
    : { open: launchAt, close: null }
  const matchCode = String(unit.Code || '').trim()
  if (!matchCode || unit.ScheduleStatus === 'Cancelled') return null

  const titleEn = `${competitors[0]} vs ${competitors[1]}`
  const titleZh = `${competitors[0]} 对阵 ${competitors[1]}`
  const id = `wtt-${event.eventId}-${matchCode}`
  const venue = unit.VenueDescription?.VenueName || event.venueName || ''
  const discipline = unit.SubEvent || 'Table Tennis Match'

  return {
    id,
    title: titleEn,
    titleEn,
    titleZh,
    shortTitle: titleEn,
    shortTitleEn: titleEn,
    shortTitleZh: titleZh,
    missionType: unit.ItemDescription?.find(item => item.Language === 'ENG')?.Value
      || `${discipline} ${unit.Round || ''}`.trim(),
    vehicle: discipline,
    launchSite: venue,
    missionUrl: `https://www.worldtabletennis.com/eventInfo?eventId=${encodeURIComponent(event.eventId)}`,
    launchAt,
    launchWindow,
    isLive: false,
    status: 'Scheduled',
    calendarGroup: 'upcoming'
  }
}

export function getWttScheduleUnits(schedule) {
  const entries = Array.isArray(schedule) ? schedule : [schedule]
  return entries.flatMap(entry => {
    const competitions = Array.isArray(entry?.Competition)
      ? entry.Competition
      : entry?.Competition
        ? [entry.Competition]
        : []

    return competitions.flatMap(competition => (
      Array.isArray(competition?.Unit) ? competition.Unit : []
    ))
  })
}

const getWttFutureMainSeriesEvents = (events, now) => {
  const nowMs = now.getTime()
  return (Array.isArray(events) ? events : [])
    .filter(event => event?.event_Tier_name === WTT_MAIN_SERIES_TIER)
    .filter(event => {
      const endDate = normalizeWttDate(
        event.endDateTime || event.startDateTime,
        event.timeZoneId
      )
      return endDate && Date.parse(endDate) >= nowMs
    })
}

export async function loadWttCalendarData(fetchImpl = fetch, now = new Date()) {
  const eventListUrl = `${WTT_EVENTS_SOURCE_URL}?q=${encodeURIComponent(now.toISOString())}`
  const eventResponse = await fetchImpl(eventListUrl, { headers: WTT_REQUEST_HEADERS })
  if (!eventResponse.ok) {
    throw new Error(`Unable to load official WTT event list: ${eventResponse.status}`)
  }

  const rawEvents = await eventResponse.json()
  const events = getWttFutureMainSeriesEvents(rawEvents, now)

  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now)
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const recentEvents = (Array.isArray(rawEvents) ? rawEvents : [])
    .filter(event => event?.event_Tier_name === WTT_MAIN_SERIES_TIER)
    .filter(event => {
      const endDate = normalizeWttDate(event.endDateTime || event.startDateTime, event.timeZoneId)
      const endMs = endDate ? Date.parse(endDate) : NaN
      return !Number.isNaN(endMs) && endMs >= (nowMs - THIRTY_DAYS_MS)
    })

  const [scheduleResults, officialResults] = await Promise.all([
    Promise.allSettled(events.map(async event => {
      const response = await fetchImpl(
        `${WTT_SCHEDULE_SOURCE_URL}/${encodeURIComponent(event.eventId)}`,
        { headers: WTT_REQUEST_HEADERS }
      )

      if (response.status === 204) return { event, units: [] }
      if (!response.ok) throw new Error(`WTT schedule ${event.eventId}: ${response.status}`)
      return { event, units: getWttScheduleUnits(await response.json()) }
    })),
    Promise.allSettled(recentEvents.map(async event => {
      const staticUrl = `https://wtt-web-frontdoor-cthahjeqhbh6aqe3.a01.azurefd.net/websitestaticapifiles/${event.eventId}/${event.eventId}_take_10_official_results.json`
      const response = await fetchImpl(staticUrl, { headers: WTT_REQUEST_HEADERS })
      if (response.status === 204 || response.status === 404) return { event, results: [] }
      if (!response.ok) throw new Error(`WTT official results ${event.eventId}: ${response.status}`)
      const data = await response.json()
      return { event, results: Array.isArray(data) ? data : [] }
    }))
  ])

  const items = []
  const seenIds = new Set()

  officialResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value?.results) {
      const { event, results } = result.value
      for (const resItem of results) {
        const item = normalizeWttOfficialResult(event, resItem)
        if (item && !seenIds.has(item.id)) {
          seenIds.add(item.id)
          items.push(item)
        }
      }
    }
  })

  scheduleResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value?.units) {
      const { event, units } = result.value
      for (const unit of units) {
        const item = normalizeWttScheduleUnit(event, unit, now)
        if (item && !seenIds.has(item.id)) {
          seenIds.add(item.id)
          items.push(item)
        }
      }
    }
  })

  return buildTopicCalendarData('wtt', items)
}

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

  if (topicId === 'wtt') {
    return await loadWttCalendarData(fetchImpl);
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
    status: item.status || 'Confirmed',
    calendarGroup: item.calendarGroup || (item.status === 'Finished' ? 'history' : 'upcoming'),
    isLive: item.isLive,
    directToCell: false,
    image: null,
    launchAt: item.launchAt,
    returnAt: null,
    launchWindow: item.launchWindow || { open: item.launchAt, close: null },
    calendarId: topicId,
    scores: item.scores || null,
    gameScores: item.gameScores || [],
    winner: item.winner || null,
    competitor1: item.competitor1 || null,
    competitor2: item.competitor2 || null
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
    nextLaunch: missions.find(m => m.calendarGroup !== 'history' && m.status !== 'Finished') || missions[0] || null,
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

      let summary = mission.title;
      if (topicId === 'wtt' && mission.status === 'Finished' && mission.scores) {
        summary = `[${mission.scores}] ${mission.title}`;
      }

      const descLines = [
        mission.title,
        `Category: ${topicConfig.nameEn || 'Event'}`,
        `Details: ${mission.vehicle || 'N/A'}`,
        `Location: ${mission.launchSite || 'Online'}`,
      ];
      if (mission.scores) {
        descLines.push(`Score: ${mission.scores}`);
      }
      if (mission.winner) {
        descLines.push(`Winner: ${mission.winner}`);
      }
      if (mission.gameScores && mission.gameScores.length > 0) {
        descLines.push(`Games: ${mission.gameScores.join(', ')}`);
      }
      if (mission.launchWindow?.close) {
        descLines.push(`Ends at: ${mission.launchWindow.close}`);
      }

      const isConfirmed = mission.status === 'Finished' || mission.isLive || mission.status === 'Confirmed';

      const lines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${eventDtStamp}`,
        `LAST-MODIFIED:${eventLastModified}`,
        `SEQUENCE:${eventSequence}`,
        `DTSTART:${formatIcsDate(mission.launchAt)}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`,
        `LOCATION:${escapeIcsText(mission.launchSite || 'Online')}`,
        `STATUS:${isConfirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
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
