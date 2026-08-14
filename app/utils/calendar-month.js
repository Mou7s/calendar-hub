export function buildCalendarMonthKeys(missionMonthKeys, currentMonthKey) {
  const keys = new Set(Array.isArray(missionMonthKeys) ? missionMonthKeys.filter(Boolean) : [])

  if (currentMonthKey) {
    keys.add(currentMonthKey)
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}

export function resolveCalendarMonthIndex(
  monthKeys,
  currentMonthKey,
  fallbackMonthKey,
  selectedMonthKey = ''
) {
  if (!Array.isArray(monthKeys) || monthKeys.length === 0) {
    return -1
  }

  const selectedIndex = monthKeys.indexOf(selectedMonthKey)
  if (selectedIndex >= 0) {
    return selectedIndex
  }

  const currentIndex = monthKeys.indexOf(currentMonthKey)
  if (currentIndex >= 0) {
    return currentIndex
  }

  const fallbackIndex = monthKeys.indexOf(fallbackMonthKey)
  return fallbackIndex >= 0 ? fallbackIndex : 0
}
