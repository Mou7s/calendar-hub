export function getCalendarNavigationStep(view) {
  if (view === 'week') return 7
  if (view === 'day') return 1
  return 0
}

export function shiftCalendarDate(dateIso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateIso || ''))) return ''

  const date = new Date(`${dateIso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + Number(days || 0))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function sortCalendarEventsByStartTime(events) {
  if (!Array.isArray(events)) return []

  return [...events].sort((a, b) => {
    const aTime = Date.parse(a?.launchAt || '')
    const bTime = Date.parse(b?.launchAt || '')
    const safeATime = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER
    const safeBTime = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER
    return safeATime - safeBTime
  })
}

export function getCalendarMonthKey(dateIso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateIso || ''))
    ? String(dateIso).slice(0, 7)
    : ''
}

export function getCalendarMonthAnchor(monthKey) {
  return /^\d{4}-\d{2}$/.test(String(monthKey || ''))
    ? `${monthKey}-01`
    : ''
}
