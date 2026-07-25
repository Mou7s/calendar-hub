import { defineEventHandler, setHeader, createError, getQuery } from 'h3'
import { getCachedData } from '../utils/kv.js'
import { loadGlobalLaunches, buildGlobalCalendarFeed } from '../utils/launches.js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const provider = String(query.provider || 'all').toLowerCase()
    
    // 使用带前缀的数据键名缓存全量多机构数据
    const data = await getCachedData(event, "global_launches_data", loadGlobalLaunches);
    const icsContent = buildGlobalCalendarFeed(data, provider);
    
    setHeader(event, "Content-Type", "text/calendar; charset=utf-8");
    setHeader(event, "Cache-Control", "public, max-age=300");
    setHeader(event, "Content-Disposition", `inline; filename="${provider === 'spacex' ? 'spacex-launches' : 'global-launches'}.ics"`);
    setHeader(event, "X-Robots-Tag", "noindex");
    
    return icsContent;
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to build global launch calendar right now.",
      data: error.message || String(error)
    });
  }
})
