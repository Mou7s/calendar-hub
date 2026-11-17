import { defineEventHandler, getMethod, sendRedirect, setResponseHeader } from 'h3'

function formatLocalDateYmd(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Short-circuit `GET /` and `HEAD /` before Nuxt SSR so root hits (including social
 * link-preview bots like facebookexternalhit) do not initialize `app.vue` or trigger
 * `/api/events` before issuing the 302 redirect to `/month/<today>`.
 */
export default defineEventHandler((event) => {
  const method = (getMethod(event) || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return

  const rawUrl = event.path || event.node?.req?.url || '/'
  const pathname = String(rawUrl).split('?')[0] || '/'
  if (pathname !== '/') return

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, `/month/${formatLocalDateYmd()}`, 302)
})
