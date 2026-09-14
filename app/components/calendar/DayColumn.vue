<script setup lang="ts">
import { isSameDay, isToday } from 'date-fns'

// Placeholder blocks shown while a range loads, as [start hour, hours]
const SKELETONS = [[9, 1.5], [13, 1], [16, 2]] as const

const props = defineProps<{
  day: Date
  events: PositionedEvent[]
  // The leftmost column on screen, which is where a block arriving from a day
  // the grid does not show has to take its form
  first?: boolean
  loading?: boolean
}>()

// A block running past midnight is drawn in both days, and the detail opens
// from the one holding its start so it does not open twice
function anchored(event: CalendarEvent): boolean {
  const start = new Date(event.start)

  return isSameDay(start, props.day) || (!!props.first && start < props.day)
}
</script>

<template>
  <!-- The column start is the scroller's snap point for midnight, the hour
    lines cover the rest of the day. Read-only: no draw gestures -->
  <div
    data-day-column
    :data-date="isoDate(day)"
    class="relative border-s border-default snap-start"
    :style="{ height: `${24 * HOUR_HEIGHT}px` }"
  >
    <div
      v-for="hour in 23"
      :key="hour"
      class="absolute inset-x-0 border-t border-default pointer-events-none snap-start"
      :style="{ top: `${hour * HOUR_HEIGHT}px` }"
    />

    <USkeleton
      v-for="[hour, hours] in loading ? SKELETONS : []"
      :key="hour"
      class="absolute inset-x-1 rounded-xs"
      :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${hours * HOUR_HEIGHT}px` }"
    />

    <CalendarEventBlock
      v-for="positioned in events"
      :key="positioned.event.id"
      :positioned="positioned"
      :anchored="anchored(positioned.event)"
    />

    <ClientOnly>
      <CalendarNowIndicator v-if="isToday(day)" />
    </ClientOnly>
  </div>
</template>
