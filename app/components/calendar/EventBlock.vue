<script setup lang="ts">
import { addMinutes } from 'date-fns'

// 只读时间块：无拖拽/缩放。LIVE 事件标题前加红点。
const props = withDefaults(defineProps<{
  positioned: PositionedEvent
  anchored?: boolean
}>(), { anchored: true })

const { calendars } = useCalendarEvents()
const { locale } = useI18n()

const event = computed(() => props.positioned.event)
const calendar = computed(() => calendars.value.find(item => item.id === event.value.calendarId))

const times = computed(() => {
  const start = new Date(event.value.start)
  const end = new Date(event.value.end)

  return `${formatTime(start, locale.value)} – ${formatTime(end > start ? end : addMinutes(start, SNAP_MINUTES), locale.value)}`
})

const compact = computed(() => props.positioned.height < 40)
</script>

<template>
  <CalendarEventPopover
    :event="event"
    :anchored="anchored"
  >
    <button
      type="button"
      data-event
      class="absolute flex flex-col items-start overflow-hidden rounded-xs px-3 py-1 text-xs text-start transition-colors select-none focus-visible:outline-3 z-5"
      :class="[
        eventBlockClasses[calendar?.color ?? 'primary'],
        eventOutlineClasses[calendar?.color ?? 'primary']
      ]"
      :style="eventBlockStyle(positioned)"
      :aria-label="`${event.title}, ${times}`"
      @click.stop
    >
      <span
        class="absolute inset-s-1 inset-y-1 w-1 rounded-full"
        :class="event.live ? 'bg-error' : calendarDotClasses[calendar?.color ?? 'primary']"
      />

      <span class="w-full font-medium truncate flex items-center gap-1.5">
        <span
          v-if="event.live"
          class="size-1.5 shrink-0 rounded-full bg-error animate-pulse"
        />
        {{ event.title }}
      </span>
      <span
        v-if="!compact"
        class="w-full truncate opacity-80 tabular-nums"
      >
        {{ times }}
      </span>
    </button>
  </CalendarEventPopover>
</template>
