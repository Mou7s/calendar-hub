import { defineEventHandler, setHeader } from 'h3'
import { CALENDAR_TOPICS } from '../utils/calendars.js'

export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "public, max-age=3600")
  setHeader(event, "Content-Type", "application/json; charset=utf-8")
  
  return {
    refreshedAt: new Date().toISOString(),
    topics: CALENDAR_TOPICS
  }
})
