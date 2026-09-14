<script setup lang="ts">
// 只读订阅源：popover 只展示任务详情（MissionDetail），无编辑表单、
// 无右键菜单。保留模板的延迟挂载优化：几百个事件同时在屏时，
// popover 首次可达（hover/focus）前不挂载。
const props = withDefaults(defineProps<{
  event: CalendarEvent
  anchored?: boolean
}>(), { anchored: true })

const { formSide } = useCalendar()

const armed = ref(false)

const root = useTemplateRef('root')

function arm(event: Event) {
  if (armed.value) {
    return
  }

  armed.value = true

  // Arming swaps the event out for the wrapped copy, so a keyboard user
  // tabbing onto it has to be handed the one taking its place
  if (event.type === 'focusin') {
    nextTick(() => root.value?.querySelector<HTMLElement>('[data-event]')?.focus())
  }
}

const open = ref(false)

function onUpdateOpen(value: boolean) {
  open.value = value
}
</script>

<template>
  <!-- Held across the swap so the focus has somewhere to go back to. `contents`
    keeps it out of the layout, on both this one and the one below -->
  <div
    ref="root"
    class="contents"
    @pointerover="arm"
    @focusin="arm"
  >
    <slot
      v-if="!armed"
      :open="false"
    />

    <!-- The content only mounts while it is open, which re-seeds it every time -->
    <UPopover
      v-else
      :open="open"
      :ui="{ content: 'p-1 w-80' }"
      :content="{ side: formSide }"
      @update:open="onUpdateOpen"
    >
      <slot :open="open" />

      <template #content>
        <CalendarMissionDetail
          :event="event"
          @close="open = false"
        />
      </template>
    </UPopover>
  </div>
</template>
