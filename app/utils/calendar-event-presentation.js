const SPACE_X_PRESENTATION = Object.freeze({
  vehicleLabelKey: 'mission.vehicle',
  locationLabelKey: 'mission.launchSite',
  vehicleIcon: 'i-lucide-rocket',
  locationIcon: 'i-lucide-map-pin'
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
  }),
  dota2: Object.freeze({
    vehicleLabelKey: 'calendar.dota2.format',
    locationLabelKey: 'calendar.dota2.venue',
    scoreLabelKey: 'calendar.dota2.score',
    winnerLabelKey: 'calendar.dota2.winner',
    gamesLabelKey: 'calendar.dota2.games',
    vehicleIcon: 'i-lucide-swords',
    locationIcon: 'i-lucide-map-pin'
  })
})

export function getCalendarEventPresentation(eventOrCalendarId) {
  const calendarId = typeof eventOrCalendarId === 'string'
    ? eventOrCalendarId
    : eventOrCalendarId?.calendarId || eventOrCalendarId?.provider

  return EVENT_PRESENTATIONS[calendarId] || SPACE_X_PRESENTATION
}
