<template>
  <header class="flex items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800/80 pb-3 mb-3 shrink-0">
    <div class="brand flex items-baseline gap-2 cursor-pointer select-none">
      <span class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-mono">CALENDAR</span>
      <span class="text-[9px] sm:text-[10px] tracking-[0.25em] text-neutral-500 dark:text-neutral-400 font-bold uppercase">HUB</span>
    </div>

    <!-- Actions & Controls -->
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
      <!-- Subscribe Button -->
      <UButton
        icon="i-heroicons-rss"
        color="primary"
        variant="solid"
        size="xs"
        class="rounded-full font-bold px-3 sm:px-4 py-1.5 shadow-md shadow-primary-500/20"
        @click="$emit('open-subscribe')"
      >
        <span class="hidden sm:inline">{{ t('subscribe.buttonLabel') }}</span>
        <span class="sm:hidden">{{ t('subscribe.buttonShort') }}</span>
      </UButton>

      <!-- Language Selector -->
      <USelectMenu
        v-model="activeLocaleModel"
        :items="localeItems"
        value-key="value"
        label-key="label"
        icon="i-heroicons-language"
        size="xs"
        color="neutral"
        variant="subtle"
        aria-label="Change language"
        class="w-24 sm:w-32"
      />

      <!-- Theme Toggle -->
      <UButton
        ref="themeBtnRef"
        :icon="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
        color="neutral"
        variant="subtle"
        size="xs"
        class="rounded-full"
        @click="toggleTheme($event)"
        :aria-label="t('header.themeToggleAria')"
      />

      <!-- GitHub Link -->
      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="outline"
        size="xs"
        class="rounded-full font-semibold uppercase tracking-wider text-[10px] hidden md:inline-flex"
        to="https://github.com/Mou7s/spacex-calendar"
        target="_blank"
        aria-label="GitHub Repository"
      >
        GitHub
      </UButton>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const emit = defineEmits(['open-subscribe'])

const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const themeBtnRef = ref(null)

const activeLocaleModel = computed({
  get: () => locale.value,
  set: (val) => setLocale(val)
})

const localeItems = computed(() => locales.value.map(lang => ({
  value: typeof lang === 'string' ? lang : lang.code,
  label: typeof lang === 'string' ? lang : lang.name
})))

const toggleTheme = (event) => {
  const isAppearanceTransition = document.startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    return
  }

  let x = event?.clientX
  let y = event?.clientY

  const btnEl = themeBtnRef.value?.$el || themeBtnRef.value
  if (btnEl && typeof btnEl.getBoundingClientRect === 'function') {
    const rect = btnEl.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }

  const xp = ((x / window.innerWidth) * 100).toFixed(2)
  const yp = ((y / window.innerHeight) * 100).toFixed(2)

  document.documentElement.classList.add('view-transitioning')

  const transition = document.startViewTransition(async () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    await nextTick()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${xp}% ${yp}%)`,
      `circle(150vmax at ${xp}% ${yp}%)`,
    ]
    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 450,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })

  transition.finished.then(() => {
    document.documentElement.classList.remove('view-transitioning')
  })
}
</script>
