import { test, expect } from 'bun:test'
import { createWttStorage, singleFlight } from '../server/utils/wtt-cache.js'
import { loadWttCalendarData } from '../server/utils/calendars.js'
import { getCachedData } from '../server/utils/kv.js'

function fixture() {
  const durable = new Map(), edge = new Map(), writes = []
  const kv = {
    get: async key => durable.get(key),
    set: async (key, value) => { writes.push(key); durable.set(key, structuredClone(value)) }
  }
  const cache = {
    match: async request => edge.get(request.url)?.clone(),
    put: async (request, response) => { edge.set(request.url, response.clone()) }
  }
  return { durable, edge, writes, kv, cache, storage: createWttStorage(kv, cache) }
}

test('WTT unchanged checks advance edge freshness without KV writes; corrections persist', async () => {
  const f = fixture()
  const key = 'aggregate'
  await f.storage.set(key, { refreshedAt: '2026-10-28T00:00:00Z', missions: [{ id: 'match', scores: '1-0' }] })
  await f.storage.set(key, { refreshedAt: '2026-10-28T00:05:00Z', missions: [{ id: 'match', scores: '1-0' }] })
  expect(f.writes.length).toBe(1)
  expect((await f.storage.get(key)).refreshedAt).toBe('2026-10-28T00:05:00Z')
  await f.storage.set(key, { refreshedAt: '2026-10-28T00:10:00Z', missions: [{ id: 'match', scores: '1-1' }] })
  expect(f.writes.length).toBe(2)
  f.edge.clear()
  expect((await f.storage.get(key)).missions[0].scores).toBe('1-1')
})

test('WTT renews unchanged durable snapshots daily and skips KV writes for unchanged Cache API failures', async () => {
  const f = fixture()
  f.durable.set('raw', { checkedAt: '2026-10-01T00:00:00Z', data: [] })
  await f.storage.set('raw', { checkedAt: new Date().toISOString(), data: [] })
  expect(f.writes.length).toBe(1)
  f.cache.put = async () => { throw new Error('edge unavailable') }
  await f.storage.set('raw', { checkedAt: new Date().toISOString(), data: [] })
  expect(f.writes.length).toBe(1)
  await f.storage.set('raw', { checkedAt: new Date().toISOString(), data: ['updated'] })
  expect(f.writes.length).toBe(2)
  f.edge.clear()
  expect((await f.storage.get('raw')).data).toEqual(['updated'])
})

test('single-flight merges concurrent refreshes, isolates tenants and retries failures', async () => {
  const scope = {}, other = {}
  let calls = 0
  const loader = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return 7 }
  expect(await Promise.all([singleFlight(scope, 'key', loader), singleFlight(scope, 'key', loader), singleFlight(other, 'key', loader)])).toEqual([7, 7, 7])
  expect(calls).toBe(2)
  await expect(singleFlight(scope, 'key', async () => { throw new Error('offline') })).rejects.toThrow('offline')
  expect(await singleFlight(scope, 'key', loader)).toBe(7)
  expect(calls).toBe(3)
})

test('WTT aggregate shares SWR refresh and uses edge freshness after unchanged polling', async () => {
  const f = fixture()
  const originalCaches = globalThis.caches
  globalThis.caches = { default: f.cache }
  try {
    const key = 'calendar_topic_wtt_v5'
    f.durable.set(key, { refreshedAt: new Date(Date.now() - 600000).toISOString(), missions: [] })
    const pending = []
    const event = { context: { cloudflare: {
      env: { SPACEX_KV: { get: f.kv.get, put: async (key, value) => f.kv.set(key, JSON.parse(value)) } },
      context: { waitUntil: promise => pending.push(promise) }
    } } }
    let calls = 0
    const loader = async () => {
      calls++
      await new Promise(resolve => setTimeout(resolve, 5))
      return { refreshedAt: new Date().toISOString(), missions: [] }
    }
    await Promise.all([getCachedData(event, key, loader), getCachedData(event, key, loader)])
    await Promise.all(pending)
    expect(calls).toBe(1)
    expect(f.writes.length).toBe(0)
    const result = await getCachedData(event, key, loader)
    expect(Date.now() - Date.parse(result.refreshedAt)).toBeLessThan(5000)
    expect(calls).toBe(1)
  } finally { globalThis.caches = originalCaches }
})

test('active WTT continues five-minute polling without repeatedly persisting empty responses', async () => {
  const f = fixture()
  const base = new Date('2026-10-28T00:00:00Z')
  const events = [{ eventId: 1, event_Tier_name: 'WTT Series', startDateTime: '2026-10-27T00:00:00Z', endDateTime: '2026-11-01T00:00:00Z' }]
  let calls = 0, offline = false
  const upstream = async url => {
    calls++
    if (offline) throw new Error('offline')
    return Response.json(String(url).includes('wtt_upcoming') ? events : [])
  }
  await loadWttCalendarData(upstream, base, f)
  expect(calls).toBe(3)
  expect(f.writes.length).toBe(1)
  await loadWttCalendarData(upstream, new Date(+base + 6 * 60000), f)
  expect(calls).toBe(5)
  expect(f.writes.length).toBe(1)
  await loadWttCalendarData(upstream, new Date(+base + 7 * 60000), f)
  expect(calls).toBe(5)
  offline = true
  await loadWttCalendarData(upstream, new Date(+base + 12 * 60000), f)
  expect(f.writes.length).toBe(1)
  offline = false
  await loadWttCalendarData(upstream, new Date(+base + 13 * 60000), f)
  expect(calls).toBe(9) // Failed checks must not advance successful freshness.
})

test('far-future WTT schedules refresh daily and accelerate within three days', async () => {
  const f = fixture()
  const base = new Date('2026-10-28T00:00:00Z')
  const events = [{ eventId: 2, event_Tier_name: 'WTT Series', startDateTime: '2026-11-01T00:00:00Z', endDateTime: '2026-11-05T00:00:00Z' }]
  let schedules = 0
  const upstream = async url => {
    if (String(url).includes('wtt_upcoming')) return Response.json(events)
    schedules++
    return Response.json([])
  }
  await loadWttCalendarData(upstream, base, f)
  await loadWttCalendarData(upstream, new Date(+base + 7 * 3600000), f)
  expect(schedules).toBe(1)
  await loadWttCalendarData(upstream, new Date(+base + 25 * 3600000), f)
  expect(schedules).toBe(2)
  await loadWttCalendarData(upstream, new Date(+base + 32 * 3600000), f)
  expect(schedules).toBe(3)
})

test('distant WTT schedules more than 30 days away refresh weekly', async () => {
  const f = fixture()
  const base = new Date('2026-10-28T00:00:00Z')
  const events = [{ eventId: 9, event_Tier_name: 'WTT Series', startDateTime: '2027-03-01T00:00:00Z', endDateTime: '2027-03-05T00:00:00Z' }]
  let schedules = 0
  const upstream = async url => {
    if (String(url).includes('wtt_upcoming')) return Response.json(events)
    schedules++
    return Response.json([])
  }
  await loadWttCalendarData(upstream, base, f)
  expect(schedules).toBe(1)
  await loadWttCalendarData(upstream, new Date(+base + 2 * 86400000), f)
  expect(schedules).toBe(1)
  await loadWttCalendarData(upstream, new Date(+base + 8 * 86400000), f)
  expect(schedules).toBe(2)
})

test('cold edge PoP populates Cache API on first KV read to prevent repeated KV misses', async () => {
  let kvReads = 0
  const durable = new Map([['calendar:wtt:schedule:3557:v1', { checkedAt: '2026-11-11T00:00:00Z', data: [] }]])
  const edge = new Map()
  const kv = {
    get: async key => { kvReads++; return durable.get(key) },
    set: async (key, value) => { durable.set(key, structuredClone(value)) }
  }
  const cache = {
    match: async request => edge.get(request.url)?.clone(),
    put: async (request, response) => { edge.set(request.url, response.clone()) }
  }
  const storage = createWttStorage(kv, cache)
  expect((await storage.get('calendar:wtt:schedule:3557:v1')).checkedAt).toBe('2026-11-11T00:00:00Z')
  expect((await storage.get('calendar:wtt:schedule:3557:v1')).checkedAt).toBe('2026-11-11T00:00:00Z')
  expect(kvReads).toBe(1)
})

test('consolidated WTT state keeps total subrequests (Cache API + fetch) well below 50 with 35 tournaments', async () => {
  const f = fixture()
  let subrequests = 0
  const trackedCache = {
    match: async req => {
      if (++subrequests > 50) throw new Error('Too many subrequests')
      return f.cache.match(req)
    },
    put: async (req, res) => {
      if (++subrequests > 50) throw new Error('Too many subrequests')
      return f.cache.put(req, res)
    }
  }
  const base = new Date('2026-11-17T00:00:00Z')
  const events = Array.from({ length: 35 }, (_, i) => ({
    eventId: 3500 + i,
    eventName: `WTT Future ${i}`,
    event_Tier_name: 'WTT Series',
    startDateTime: '2027-02-01T00:00:00Z',
    endDateTime: '2027-02-05T00:00:00Z',
    timeZoneId: 84,
    venueName: 'Arena'
  }))
  events.push({
    eventId: 3256,
    eventName: 'WTT Active',
    event_Tier_name: 'WTT Series',
    startDateTime: '2026-11-16T00:00:00Z',
    endDateTime: '2026-11-21T00:00:00Z',
    timeZoneId: 67,
    venueName: 'Muscat'
  })
  const upstream = async url => {
    if (++subrequests > 50) throw new Error('Too many subrequests')
    return Response.json(String(url).includes('wtt_upcoming') ? events : [])
  }

  await loadWttCalendarData(upstream, base, { kv: f.kv, cache: trackedCache })
  expect(subrequests).toBeLessThan(15)
  expect(f.writes.length).toBe(1)

  for (let i = 0; i < 4; i++) {
    subrequests = 0
    await loadWttCalendarData(upstream, base, { kv: f.kv, cache: trackedCache })
    expect(subrequests).toBeLessThan(15)
  }
  const warmedWrites = f.writes.length

  subrequests = 0
  await loadWttCalendarData(upstream, new Date(+base + 6 * 60000), { kv: f.kv, cache: trackedCache })
  expect(subrequests).toBeLessThan(6)
  expect(f.writes.length).toBe(warmedWrites)
})
