import { defineEventHandler, setHeader, createError } from 'h3'
import { getCalendarFromKv } from '../utils/calendar-sync.js'
import { loadGlobalLaunches } from '../utils/launches.js'

export default defineEventHandler(async (event) => {
  try {
    const data = await getCalendarFromKv(event, "spacex", loadGlobalLaunches);
    
    setHeader(event, "Cache-Control", "public, max-age=300");
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    
    return data;
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "Bad Gateway",
      message: "Unable to load launch data right now.",
      data: error.message || String(error)
    });
  }
})
