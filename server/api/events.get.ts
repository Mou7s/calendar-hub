import { getCalendarFromKv } from '../utils/calendar-sync.js'
import { getCachedData } from '../utils/kv.js'
import { loadGlobalLaunches } from '../utils/launches.js'
import { loadHistoryLaunchData } from '../utils/spacex.js'
import { getTopicCalendarData } from '../utils/calendars.js'

// 模板客户端按可见范围拉取（月视图 12 周 = 84 天），上限与模板一致 90 天
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000
const FALLBACK_DURATION_MS = 60 * 60 * 1000

interface SourceMission {
  id?: string
  slug?: string
  title?: string
  titleZh?: string
  titleEn?: string
  launchAt?: string
  launchWindow?: { close?: string }
  vehicle?: string
  launchSite?: string
  missionUrl?: string
  status?: string
  scores?: string
  isLive?: boolean
}

function pickTitle(mission: SourceMission, locale: string): string {
  if (locale === 'zh-CN') {
    return mission.titleZh || mission.title || 'Launch'
  }
  return mission.titleEn || mission.title || 'Launch'
}

function toCalendarEvent(mission: SourceMission, calendarId: string, locale: string): CalendarEvent | null {
  if (!mission?.launchAt) {
    return null
  }
  const startMs = Date.parse(mission.launchAt)
  if (!Number.isFinite(startMs)) {
    return null
  }
  const closeMs = Date.parse(mission.launchWindow?.close || '')
  const endMs = Number.isFinite(closeMs) && closeMs > startMs ? closeMs : startMs + FALLBACK_DURATION_MS

  const location = mission.launchSite || undefined
  const vehicle = mission.vehicle || undefined

  return {
    id: `${calendarId}:${mission.slug || mission.id || startMs}`,
    calendarId,
    title: pickTitle(mission, locale),
    description: [vehicle, location].filter(Boolean).join(' · ') || undefined,
    // 绝对时刻 ISO（带时区）：客户端 new Date() 解析为绝对瞬间，
    // 再按观众本地时区分桶，与模板浮动本地字符串 contract 兼容
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    live: mission.isLive === true || undefined,
    location,
    vehicle,
    url: mission.missionUrl || undefined,
    scores: mission.scores || undefined
  }
}

export default defineEventHandler(async (event): Promise<CalendarEvent[]> => {
  const query = getQuery(event)
  const locale = typeof query.locale === 'string' ? query.locale : 'en'
  const start = new Date(String(query.start || '')).getTime()
  const end = new Date(String(query.end || '')).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_RANGE_MS) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid start/end range (max 90 days).' })
  }

  // 各源独立降级：单个源失败不拖累其它图层
  const settled = await Promise.allSettled([
    getCalendarFromKv(event, 'spacex', loadGlobalLaunches),
    getCachedData(event, 'spacex_history_launches_data', loadHistoryLaunchData),
    getCalendarFromKv(event, 'f1', (fetchImpl: typeof fetch) => getTopicCalendarData('f1', fetchImpl)),
    getCachedData(event, 'calendar_topic_wtt', (fetchImpl: typeof fetch) => getTopicCalendarData('wtt', fetchImpl)),
    getCachedData(event, 'calendar_topic_dota2', (fetchImpl: typeof fetch) => getTopicCalendarData('dota2', fetchImpl))
  ])

  const pools: Array<{ result: PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: string }> = [
    { result: settled[0] as PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: 'spacex' },
    { result: settled[1] as PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: 'spacex' },
    { result: settled[2] as PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: 'f1' },
    { result: settled[3] as PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: 'wtt' },
    { result: settled[4] as PromiseSettledResult<{ missions?: SourceMission[] }>, calendarId: 'dota2' }
  ]

  if (settled.every(r => r.status === 'rejected')) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'Unable to load calendar events right now.'
    })
  }

  const events: CalendarEvent[] = []
  const seen = new Set<string>()
  for (const { result, calendarId } of pools) {
    if (result.status !== 'fulfilled') {
      continue
    }
    const missions = result.value?.missions || []
    for (const mission of missions) {
      const item = toCalendarEvent(mission, calendarId, locale)
      if (!item) {
        continue
      }
      // 同一任务在 upcoming 与 history 两个池里都出现，按 id 去重（先到先得 = upcoming 优先）
      if (seen.has(item.id)) {
        continue
      }
      // 区间交叠即收录（与模板 store 过滤语义一致）
      const itemStart = Date.parse(item.start)
      const itemEnd = Date.parse(item.end)
      if (itemStart < end && itemEnd > start) {
        seen.add(item.id)
        events.push(item)
      }
    }
  }

  setHeader(event, 'Cache-Control', 'public, max-age=300')
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

  return events
})
