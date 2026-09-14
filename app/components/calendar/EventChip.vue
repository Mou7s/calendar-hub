<script setup lang="ts">
defineOptions({ inheritAttrs: false })

// 只读事件 chip：无拖拽。LIVE 显示红点，比分（如 WTT 完赛）
// 显示在时间位置。
const props = withDefaults(defineProps<{
  event: CalendarEvent
  showTime?: boolean
  anchored?: boolean
}>(), { anchored: true })

const { calendars } = useCalendarEvents()

const calendar = computed(() => calendars.value.find(item => item.id === props.event.calendarId))
const color = computed(() => calendar.value?.color ?? 'primary')
const { locale } = useI18n()

const suffix = computed(() => {
  if (props.event.scores) {
    return props.event.scores
  }
  try {
    return formatTime(new Date(props.event.start), locale.value)
  } catch {
    return ''
  }
})
</script>

<template>
  <CalendarEventPopover
    v-slot="{ open }"
    :event="event"
    :anchored="anchored"
  >
    <button
      v-bind="$attrs"
      type="button"
      data-event
      class="select-none flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs text-start transition-colors focus-visible:outline-3"
      :class="[
        eventOutlineClasses[color],
        event.allDay
          ? eventBlockClasses[color]
          : ['text-default hover:bg-(--control-bg) data-active:bg-(--control-bg)', eventChipCompactClasses[color]]
      ]"
      :data-active="open || undefined"
      :aria-label="event.allDay ? event.title : `${event.title}, ${suffix}`"
      @click.stop
    >
      <span
        v-if="event.allDay"
        :class="calendarDotClasses[color]"
        class="rounded-full flex items-center justify-center p-0.5 -mx-0.75"
      >
        <UIcon
          name="i-lucide-calendar"
          class="size-2.5 shrink-0 text-inverted"
        />
      </span>
      <span
        v-else-if="event.live"
        class="size-2 shrink-0 rounded-full bg-error animate-pulse"
      />
      <span
        v-else
        class="max-lg:hidden size-2 shrink-0 rounded-full"
        :class="calendarDotClasses[color]"
      />

      <span class="font-medium truncate">{{ event.title }}</span>
      <!-- `data-time` so a call site in a tight spot can hide it from outside -->
      <span
        v-if="showTime && !event.allDay"
        data-time
        class="ms-auto shrink-0 text-muted tabular-nums text-[11px]"
      >
        {{ suffix }}
      </span>
    </button>
  </CalendarEventPopover>
</template>
