const SPACE_X_PRESENTATION = Object.freeze({
  vehicleLabelKey: 'mission.vehicle',
  locationLabelKey: 'mission.launchSite',
  vehicleIcon: 'i-heroicons-rocket-launch',
  locationIcon: 'i-heroicons-map-pin'
})

const EVENT_PRESENTATIONS = Object.freeze({
  f1: Object.freeze({
    vehicleLabelKey: 'calendar.f1.vehicle',
    locationLabelKey: 'calendar.f1.track',
    vehicleIcon: 'i-lucide-car-front',
    locationIcon: 'i-lucide-flag'
  }),
  wtt: Object.freeze({
    vehicleLabelKey: 'calendar.wtt.match',
    locationLabelKey: 'calendar.wtt.venue',
    scoreLabelKey: 'calendar.wtt.score',
    winnerLabelKey: 'calendar.wtt.winner',
    gamesLabelKey: 'calendar.wtt.games',
    vehicleIcon: 'i-lucide-trophy',
    locationIcon: 'i-lucide-map-pin'
  })
})

export function getCalendarEventPresentation(eventOrCalendarId) {
  const calendarId = typeof eventOrCalendarId === 'string'
    ? eventOrCalendarId
    : eventOrCalendarId?.calendarId || eventOrCalendarId?.provider

  return EVENT_PRESENTATIONS[calendarId] || SPACE_X_PRESENTATION
}
