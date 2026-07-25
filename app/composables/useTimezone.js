import { ref, computed } from 'vue'

/** Static timezone presets */
export const TIMEZONE_OPTIONS = [
  { key: 'local', tz: null },
  { key: 'utc',   tz: 'UTC' },
  { key: 'et',    tz: 'America/New_York' },
  { key: 'ct',    tz: 'America/Chicago' },
  { key: 'pt',    tz: 'America/Los_Angeles' },
]

export function useTimezone() {
  const { t, locale } = useI18n()

  const activeTimezone = ref(null)

  const activeTimezoneDisplay = computed(() => {
    if (activeTimezone.value) {
      return activeTimezone.value.split('/').pop()?.replace(/_/g, ' ') || activeTimezone.value
    }
    if (import.meta.client) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    return 'UTC'
  })

  const setTimezone = (tz) => {
    activeTimezone.value = tz
  }

  // DateTime formatting helpers
  const getDateTimeFormatter = (withZone = true, timeZoneOverride) => {
    const options = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }

    if (withZone) {
      options.timeZoneName = 'short'
    }

    const tz = timeZoneOverride !== undefined ? timeZoneOverride : activeTimezone.value
    if (tz) {
      options.timeZone = tz
    }

    return new Intl.DateTimeFormat(locale.value, options)
  }

  const formatDateTime = (iso, withZone = true) => {
    if (!iso) return t('mission.tbd')
    return getDateTimeFormatter(withZone).format(new Date(iso))
  }

  const formatDateTimeUtc = (iso) => {
    if (!iso) return t('mission.tbd')
    return getDateTimeFormatter(true, 'UTC').format(new Date(iso))
  }

  const formatEventMonth = (iso) => {
    const dateObj = new Date(iso)
    return new Intl.DateTimeFormat(locale.value, { month: 'short', timeZone: 'UTC' }).format(dateObj)
  }

  const formatEventDay = (iso) => {
    return new Date(iso).getUTCDate()
  }

  const formatEventTime = (iso) => {
    return new Intl.DateTimeFormat(locale.value, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso))
  }

  const titleCase = (value) => {
    return value
      ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
      : t('mission.unspecified')
  }

  const formatMonthPillLabel = (item) => {
    if (item.isoMonth) {
      return new Intl.DateTimeFormat(locale.value, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${item.isoMonth}-01T00:00:00.000Z`))
    }
    return item.label
  }

  return {
    activeTimezone,
    activeTimezoneDisplay,
    setTimezone,
    formatDateTime,
    formatDateTimeUtc,
    formatEventMonth,
    formatEventDay,
    formatEventTime,
    titleCase,
    formatMonthPillLabel,
  }
}
