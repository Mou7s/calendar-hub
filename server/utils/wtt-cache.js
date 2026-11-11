// Cache API is local to a Cloudflare data center and may be evicted. KV remains
// the durable fallback; renew unchanged snapshots daily before their TTL expires.
const RENEW_MS = 24 * 3600 * 1000

function content(value) {
  const { checkedAt, refreshedAt, persistedAt, hasChanges, ...data } = value || {}
  return JSON.stringify(data)
}

export function createWttStorage(durableStorage, cache = globalThis.caches?.default) {
  if (!cache) return durableStorage
  const request = key => new Request(`https://calendarhub.mou7s.com/__internal-cache/wtt-v1/${encodeURIComponent(key)}`)
  return {
    async get(key) {
      try {
        const hit = await cache.match(request(key))
        if (hit) return await hit.json()
      } catch (error) { console.warn('WTT edge cache read failed:', error) }
      const stored = await durableStorage?.get(key)
      if (stored !== null && stored !== undefined) {
        try {
          await cache.put(request(key), Response.json(stored, { headers: { 'Cache-Control': 'public, max-age=604800' } }))
        } catch (error) { console.warn('WTT edge cache populate failed:', error) }
      }
      return stored
    },
    async set(key, value, options) {
      let stored
      try { stored = await durableStorage?.get(key) } catch (error) { console.warn('WTT durable cache read failed:', error) }
      const now = Date.now()
      const persistedAt = Date.parse(stored?.persistedAt || stored?.checkedAt || stored?.refreshedAt)
      const changed = !stored || content(stored) !== content(value)
      const renew = !Number.isFinite(persistedAt) || now - persistedAt >= RENEW_MS
      const snapshot = { ...value, persistedAt: changed || renew ? new Date(now).toISOString() : new Date(persistedAt).toISOString() }
      // A failed edge-cache write must not leave an old durable timestamp causing
      // repeated refreshes: persist the successful check in that case as well.
      let edgeWritten = false
      try {
        await cache.put(request(key), Response.json(snapshot, { headers: { 'Cache-Control': 'public, max-age=604800' } }))
        edgeWritten = true
      } catch (error) { console.warn('WTT edge cache write failed:', error) }
      if (changed || renew || !edgeWritten) await durableStorage?.set(key, snapshot, options)
    }
  }
}

const refreshes = new WeakMap()
const fallbackScope = {}

// Bound to the storage/Worker environment, never shared between test tenants.
export function singleFlight(scope, key, loader) {
  const owner = scope && typeof scope === 'object' ? scope : fallbackScope
  let pending = refreshes.get(owner)
  if (!pending) { pending = new Map(); refreshes.set(owner, pending) }
  if (pending.has(key)) return pending.get(key)
  const promise = Promise.resolve().then(loader).finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}
