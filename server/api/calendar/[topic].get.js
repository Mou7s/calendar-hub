import { defineEventHandler, setHeader, getRouterParam, createError } from 'h3'
import { getCalendarFromKv } from '../../utils/calendar-sync.js'
import { getCachedData, getKvStorage } from '../../utils/kv.js'
import { getTopicCalendarData, getTopicCalendarCacheKey, CALENDAR_TOPICS } from '../../utils/calendars.js'

export default defineEventHandler(async (event) => {
  try {
    const topicParam = getRouterParam(event, 'topic') || 'spacex'
    const topicConfig = CALENDAR_TOPICS.find(t => t.id === topicParam)
    if (!topicConfig) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Calendar topic not found.' })
    }

    const cacheKey = getTopicCalendarCacheKey(topicConfig.id)
    // Dota 2 锦标赛 Tier 元数据走 KV 长缓存：Worker 抓取抖动时仍能执行 Tier 1 过滤
    const kv = getKvStorage(event.context.cloudflare?.env || {})
    const loader = (fetchImpl) => getTopicCalendarData(topicConfig.id, fetchImpl, { kv })

    const data = topicConfig.id === 'f1'
      ? await getCalendarFromKv(event, 'f1', loader)
      : await getCachedData(event, cacheKey, loader)

    setHeader(event, "Cache-Control", "public, max-age=300")
    setHeader(event, "Content-Type", "application/json; charset=utf-8")

    return data
  } catch (error) {
    if (error?.statusCode === 404) {
      throw error
    }
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to load topic calendar data right now.",
      data: error.message || String(error)
    })
  }
})
