import { loadF1CalendarData } from './calendars.js'
import { enrichWithStableVersions, getKvStorage } from './kv.js'
import { loadGlobalLaunches } from './launches.js'

export const CALENDAR_KEYS = {
  spacex: 'calendar:spacex:data',
  f1: 'calendar:f1:data'
}

const STATUS_KEY = 'calendar:sync:status'

const stablePayload = (data) => JSON.stringify(
  (data?.missions || []).map(mission => ({
    id: mission.correlationId || mission.id,
    title: mission.title,
    launchAt: mission.launchAt,
    launchSite: mission.launchSite,
    vehicle: mission.vehicle,
    close: mission.launchWindow?.close || null
  }))
)

async function updateCalendar(kv, key, freshData) {
  const existing = await kv.get(key)
  const changed = stablePayload(existing) !== stablePayload(freshData)
  if (changed) {
    await kv.set(key, freshData)
  }
  return { changed, count: freshData.missions?.length || 0 }
}

export async function syncCalendars(env, fetchImpl = fetch, now = new Date()) {
  const kv = getKvStorage(env)
  if (!kv) {
    throw new Error('Calendar KV binding is unavailable')
  }

  const status = {
    attemptedAt: now.toISOString(),
    completedAt: null,
    calendars: {}
  }

  const results = await Promise.allSettled([
    (async () => {
      let data = await loadGlobalLaunches(fetchImpl, now)
      data = await enrichWithStableVersions(env, data)
      return updateCalendar(kv, CALENDAR_KEYS.spacex, data)
    })(),
    (async () => {
      const data = await loadF1CalendarData(fetchImpl)
      return updateCalendar(kv, CALENDAR_KEYS.f1, data)
    })()
  ])

  for (const [index, topic] of ['spacex', 'f1'].entries()) {
    const result = results[index]
    status.calendars[topic] = result.status === 'fulfilled'
      ? { ok: true, ...result.value }
      : { ok: false, error: result.reason?.message || String(result.reason) }
  }

  status.completedAt = new Date().toISOString()
  await kv.set(STATUS_KEY, status)

  if (results.every(result => result.status === 'rejected')) {
    throw new Error('All calendar synchronization jobs failed')
  }

  return status
}

/**
 * 定时任务入口的统一守卫：
 * 本地开发（无 Cloudflare 绑定且 hubKV 不可用）时优雅跳过而不是抛错；
 * 生产环境（SPACEX_KV 存在）时行为与直接调用 syncCalendars 完全一致。
 */
export async function runCalendarSyncTask(context = {}) {
  const env = context.cloudflare?.env || {}
  if (!getKvStorage(env)) {
    return { skipped: true, reason: 'Calendar KV binding is unavailable' }
  }
  return { result: await syncCalendars(env) }
}

export async function getCalendarFromKv(event, topic, fallbackLoader) {
  const env = event.context.cloudflare?.env || {}
  const kv = getKvStorage(env)
  const key = CALENDAR_KEYS[topic]

  if (kv && key) {
    const stored = await kv.get(key)
    if (stored) return stored

    if (topic === 'spacex') {
      const legacy = await kv.get('spacex_launches_data')
      if (legacy) {
        await kv.set(key, legacy)
        return legacy
      }
    }
  }

  const fallback = await fallbackLoader(fetch)
  if (kv && key) {
    await kv.set(key, fallback)
  }
  return fallback
}
