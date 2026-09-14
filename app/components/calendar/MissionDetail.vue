<script setup lang="ts">
// 只读任务详情卡：发射时间、载具/地点、比分、官方链接。
// 文案复用现有 i18n 词条（mission.* / status.* / subscribe.*），零新增。
// 各图层的字段名与图标走 calendar-event-presentation.js（F1 = 赛道、WTT = 场馆…）
import { getCalendarEventPresentation } from '~/utils/calendar-event-presentation'

const props = defineProps<{
  event: CalendarEvent
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()
const { calendars } = useCalendarEvents()

const calendar = computed(() => calendars.value.find(item => item.id === props.event.calendarId))

const presentation = computed(() => getCalendarEventPresentation(props.event))

const timeLabel = computed(() => {
  try {
    return formatFullDate(new Date(props.event.start), locale.value)
  } catch {
    return props.event.start
  }
})

</script>

<template>
  <div class="p-3 space-y-3 min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <span
        class="size-2 shrink-0 rounded-full"
        :class="calendar ? calendarDotClasses[calendar.color] : 'bg-primary'"
      />
      <span class="text-xs font-semibold text-muted truncate flex-1">
        {{ calendar?.name ?? event.calendarId }}
      </span>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        class="rounded-full shrink-0"
        :aria-label="t('common.close')"
        @click="emit('close')"
      />
    </div>

    <div>
      <div
        v-if="event.live"
        class="flex items-center gap-1.5 text-[11px] font-bold text-error uppercase tracking-wider mb-1"
      >
        <span class="size-2 rounded-full bg-error animate-pulse" />
        <span>{{ t('status.liveNow') }}</span>
      </div>
      <div
        v-if="event.scores"
        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[11px] font-bold font-mono mb-1"
      >
        {{ presentation.scoreLabelKey ? t(presentation.scoreLabelKey) : t('calendar.wtt.score') }}: {{ event.scores }}
      </div>
      <h3 class="text-base font-bold text-highlighted leading-snug text-balance">
        {{ event.title }}
      </h3>
    </div>

    <div class="space-y-1.5 text-xs text-muted">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-clock"
          class="size-4 shrink-0"
        />
        <span class="font-medium text-default truncate">{{ timeLabel }}</span>
      </div>

      <div
        v-if="event.vehicle"
        class="flex items-center gap-2"
      >
        <UIcon
          :name="presentation.vehicleIcon"
          class="size-4 shrink-0"
        />
        <span class="truncate">
          {{ t(presentation.vehicleLabelKey) }}: <strong class="text-default">{{ event.vehicle }}</strong>
        </span>
      </div>

      <div
        v-if="event.location"
        class="flex items-start gap-2"
      >
        <UIcon
          :name="presentation.locationIcon"
          class="size-4 shrink-0 mt-px"
        />
        <span class="leading-relaxed">
          {{ t(presentation.locationLabelKey) }}: <strong class="text-default">{{ event.location }}</strong>
        </span>
      </div>

      <p
        v-if="event.description"
        class="leading-relaxed line-clamp-3"
      >
        {{ event.description }}
      </p>
    </div>

    <div class="flex items-center gap-2 pt-1">
      <UButton
        v-if="event.url"
        :to="event.url"
        target="_blank"
        color="neutral"
        variant="soft"
        size="sm"
        class="flex-1 justify-center rounded-full"
        trailing-icon="i-lucide-external-link"
      >
        {{ t('mission.viewOfficialDetails') }}
      </UButton>
    </div>
  </div>
</template>
