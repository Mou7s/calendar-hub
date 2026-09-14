<script setup lang="ts">
// ICS 订阅弹窗：四个图层各有 webcal 一键订阅 + HTTPS 链接复制。
// 文案复用 subscribe.* 词条，图层名为专有名词无需翻译。
const { isSubscribeOpen } = useCalendar()
const { t } = useI18n()

const layers = [
  { id: 'spacex', name: 'SpaceX', color: '#3b82f6', ics: '/spacex.ics' },
  { id: 'f1', name: 'F1', color: '#ef4444', ics: '/ics/f1.ics' },
  { id: 'wtt', name: 'WTT', color: '#f59e0b', ics: '/ics/wtt.ics' },
  { id: 'dota2', name: 'Dota 2', color: '#8b5cf6', ics: '/ics/dota2.ics' }
] as const

const provider = ref<string>('spacex')
const copied = ref(false)

const active = computed(() => layers.find(layer => layer.id === provider.value) ?? layers[0]!)

function origin(): string {
  if (import.meta.client) {
    return window.location.origin
  }
  return 'https://calendarhub.mou7s.com'
}

const icsUrl = computed(() => `${origin()}${active.value.ics}`)
const webcalUrl = computed(() => icsUrl.value.replace(/^https?:\/\//, 'webcal://'))

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(icsUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Clipboard unavailable, the input stays selectable
  }
}

watch(isSubscribeOpen, (open) => {
  if (open) {
    copied.value = false
  }
})
</script>

<template>
  <UModal v-model:open="isSubscribeOpen">
    <template #content>
      <div class="p-6 space-y-5">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="p-2 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <UIcon
                  name="i-lucide-rss"
                  class="size-5"
                />
              </span>
              <h3 class="text-base font-bold tracking-tight text-highlighted">
                {{ t('subscribe.title') }}
              </h3>
            </div>
            <p class="text-xs text-muted leading-relaxed pt-1">
              {{ t('subscribe.copy') }}
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-full shrink-0"
            :aria-label="t('common.close')"
            @click="isSubscribeOpen = false"
          />
        </div>

        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="layer in layers"
            :key="layer.id"
            type="button"
            class="min-w-0 px-2 py-1.5 rounded-full border text-xs font-semibold truncate transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            :class="provider === layer.id
              ? 'border-primary bg-primary/15 text-highlighted'
              : 'border-default text-muted hover:text-default'"
            :aria-pressed="provider === layer.id"
            @click="provider = layer.id"
          >
            <span
              class="size-2 rounded-full shrink-0"
              :style="{ backgroundColor: layer.color }"
            />
            {{ layer.name }}
          </button>
        </div>

        <UButton
          :to="webcalUrl"
          color="primary"
          size="lg"
          block
          class="rounded-full justify-center"
          icon="i-lucide-calendar-plus"
        >
          {{ t('subscribe.subscribeLink') }}
        </UButton>

        <div class="space-y-2 pt-3 border-t border-default">
          <label class="text-[10px] font-bold uppercase tracking-wider text-muted block">
            {{ t('subscribe.eyebrow') }} (Google / Web)
          </label>
          <div class="flex items-center gap-2">
            <UInput
              :model-value="icsUrl"
              readonly
              size="sm"
              variant="soft"
              class="flex-1 font-mono"
              @focus="($event.target as HTMLInputElement)?.select()"
            />
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-clipboard'"
              color="neutral"
              variant="soft"
              size="sm"
              class="rounded-full shrink-0"
              @click="copyUrl"
            >
              {{ copied ? t('subscribe.copied') : t('subscribe.copyBtn') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
