import { defineEventHandler, getRequestHeader, sendRedirect, setResponseHeaders, setResponseStatus } from 'h3'
import { evaluateCrawlerGuard } from '../utils/bot-guard.js'

export default defineEventHandler((event) => {
  const rawUrl = event.path || event.node?.req?.url || '/'
  const userAgent = getRequestHeader(event, 'user-agent') || ''
  const decision = evaluateCrawlerGuard(rawUrl, userAgent)

  if (decision.action === 'not-found') {
    setResponseStatus(event, 404, 'Not Found')
    setResponseHeaders(event, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    })
    return 'Not Found'
  }

  if (decision.action === 'forbidden') {
    setResponseStatus(event, 403, 'Forbidden')
    setResponseHeaders(event, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    })
    return 'Forbidden'
  }

  if (decision.action === 'redirect-home') {
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'noindex, nofollow'
    })
    return sendRedirect(event, '/', 301)
  }
})
