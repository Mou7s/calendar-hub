import { test, expect } from 'bun:test'
import { createApp, createRouter, toWebHandler } from 'h3'
import { evaluateCrawlerGuard } from '../server/utils/bot-guard.js'
import rootRedirectMiddleware from '../server/middleware/zzz-root-redirect.js'

test('allows human browsers across all views and historical/future dates', () => {
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
  expect(evaluateCrawlerGuard('/', chromeUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/month/2026-11-11', chromeUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/day/2022-05-20', chromeUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/week/2029-03-10', chromeUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/api/events?start=2026-11-01&end=2026-12-01', chromeUA, 2026)).toEqual({ action: 'allow' })
})

test('allows ICS subscription clients unconditionally', () => {
  const iosCalendarUA = 'iOS/27.3 (24C5037i) dataaccessd/1.0'
  expect(evaluateCrawlerGuard('/spacex.ics', iosCalendarUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/ics/wtt.ics', iosCalendarUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/ics/f1.ics', iosCalendarUA, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/ics/dota2.ics', iosCalendarUA, 2026)).toEqual({ action: 'allow' })
})

test('welcomes benign crawlers on canonical routes while guiding them out of spider traps', () => {
  const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  const claudebot = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'

  expect(evaluateCrawlerGuard('/', googlebot, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/month/2026-11-11', googlebot, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/month/2027-02-01', claudebot, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/llms.txt', claudebot, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/spacex.ics', googlebot, 2026)).toEqual({ action: 'allow' })

  expect(evaluateCrawlerGuard('/day/2026-11-10', googlebot, 2026)).toEqual({ action: 'redirect-home' })
  expect(evaluateCrawlerGuard('/week/2026-11-10', claudebot, 2026)).toEqual({ action: 'redirect-home' })
  expect(evaluateCrawlerGuard('/month/2022-09-10', googlebot, 2026)).toEqual({ action: 'redirect-home' })
  expect(evaluateCrawlerGuard('/month/2029-03-10', claudebot, 2026)).toEqual({ action: 'redirect-home' })
})

test('short-circuits vulnerability scanner probes and non-search bulk scrapers while preserving robots.txt', () => {
  const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  expect(evaluateCrawlerGuard('/.env.staging', chromeUA, 2026)).toEqual({ action: 'not-found' })
  expect(evaluateCrawlerGuard('/dev/.env', chromeUA, 2026)).toEqual({ action: 'not-found' })
  expect(evaluateCrawlerGuard('/config.php', chromeUA, 2026)).toEqual({ action: 'not-found' })
  expect(evaluateCrawlerGuard('/web.config', chromeUA, 2026)).toEqual({ action: 'not-found' })
  expect(evaluateCrawlerGuard('/composer.json', chromeUA, 2026)).toEqual({ action: 'not-found' })
  expect(evaluateCrawlerGuard('/storage/logs/laravel.log', chromeUA, 2026)).toEqual({ action: 'not-found' })

  const elevenlabs = 'Mozilla/5.0 (compatible; ElevenlabsCrawler/1.0; +https://elevenlabs.io/docs/bots)'
  const scanner = 'TLM-Audit-Scanner/2.0'
  expect(evaluateCrawlerGuard('/robots.txt', elevenlabs, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/llms.txt', elevenlabs, 2026)).toEqual({ action: 'allow' })
  expect(evaluateCrawlerGuard('/day/2026-09-06', elevenlabs, 2026)).toEqual({ action: 'forbidden' })
  expect(evaluateCrawlerGuard('/', scanner, 2026)).toEqual({ action: 'forbidden' })
})

test('root redirect middleware short-circuits GET and HEAD / with 302 before SSR', async () => {
  const app = createApp()
  let ssrCalls = 0
  app.use(rootRedirectMiddleware)
  app.use(createRouter().get('/**', () => {
    ssrCalls++
    return 'ssr-body'
  }))
  const handler = toWebHandler(app)

  const getRoot = await handler(new Request('https://calendarhub.mou7s.com/?fbclid=abc'))
  expect(getRoot.status).toBe(302)
  expect(getRoot.headers.get('location')).toMatch(/^\/month\/\d{4}-\d{2}-\d{2}$/)
  expect(getRoot.headers.get('cache-control')).toBe('no-store')
  expect(ssrCalls).toBe(0)

  const headRoot = await handler(new Request('https://calendarhub.mou7s.com/', { method: 'HEAD' }))
  expect(headRoot.status).toBe(302)
  expect(headRoot.headers.get('location')).toMatch(/^\/month\/\d{4}-\d{2}-\d{2}$/)
  expect(ssrCalls).toBe(0)

  const getMonth = await handler(new Request('https://calendarhub.mou7s.com/month/2026-11-17'))
  expect(getMonth.status).toBe(200)
  expect(await getMonth.text()).toBe('ssr-body')
  expect(ssrCalls).toBe(1)
})
