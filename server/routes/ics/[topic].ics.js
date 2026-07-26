import { defineEventHandler, setHeader, createError, getRouterParam } from 'h3'
import { getCachedData } from '../../utils/kv.js'
import { getTopicCalendarData, buildTopicCalendarFeed, CALENDAR_TOPICS } from '../../utils/calendars.js'

export default defineEventHandler(async (event) => {
  try {
    let topic = getRouterParam(event, 'topic')

    // Nitro 的带扩展名动态路由在部分本地/边缘请求适配器中不会填充 params，
    // 从原始请求路径回退解析，避免 /ics/f1.ics 错误地回退成 SpaceX 日历。
    if (!topic) {
      const requestPath = String(event.node?.req?.url || '')
      const pathname = requestPath.startsWith('http') ? new URL(requestPath).pathname : requestPath
      const match = pathname.match(/^\/ics\/([^/?#]+?)(?:\.ics)?$/i)
      topic = match?.[1]
    }

    topic = topic || 'spacex'
    // 清理后缀名为 .ics 的情况（例如 spacex.ics 提取出 spacex）
    topic = topic.replace(/\.ics$/i, '').toLowerCase()

    const topicConfig = CALENDAR_TOPICS.find(t => t.id === topic) || CALENDAR_TOPICS[0]

    // 缓存加载 key 区分主题
    const cacheKey = `calendar_topic_${topicConfig.id}`
    const loader = (fetchImpl) => getTopicCalendarData(topicConfig.id, fetchImpl)

    const data = await getCachedData(event, cacheKey, loader)
    const icsContent = buildTopicCalendarFeed(topicConfig.id, data)

    setHeader(event, "Content-Type", "text/calendar; charset=utf-8")
    setHeader(event, "Cache-Control", "public, max-age=300")
    setHeader(event, "Content-Disposition", `inline; filename="${topicConfig.id}.ics"`)
    setHeader(event, "X-Robots-Tag", "noindex")

    return icsContent
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to build calendar feed right now.",
      data: error.message || String(error)
    })
  }
})
