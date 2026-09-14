<script setup lang="ts">
const { isSearchOpen, isSubscribeOpen, isSidebarOpen } = useCalendar()
const { t } = useI18n()

const route = useRoute()

// Same query the sidebar switches on. Closing is only right below it: above,
// the model drives the desktop collapse instead
const isMobile = useMediaQuery('(max-width: 1023px)')

// Everything the menu offers takes over the screen on a phone, so it steps
// out of the way once one of them is on its way in
watch([() => route.fullPath, isSearchOpen, isSubscribeOpen], () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
})
</script>

<template>
  <!-- Below `lg` the sidebar becomes a slideover the header opens, inset and
    cut from the same glass so it reads as the floating one sliding in rather
    than a sheet of its own. The collapsible variants leave the root to the
    gap that reserves the width, so the padding belongs to the fixed
    container, and it drops the border they hand it there: the sidebar is
    framed by its own ring, `pe-px` is the whole gap to the page -->
  <USidebar
    v-model:open="isSidebarOpen"
    variant="floating"
    :menu="{ inset: true, transition: false }"
    :ui="{ container: 'p-2 pe-px border-0', body: 'pt-1' }"
  >
    <template #header="{ close }">
      <NuxtLink
        to="/"
        :aria-label="t('calendar.sidebar.home')"
        class="flex items-end gap-0.5 text-highlighted outline-primary/25 focus-visible:outline-3 rounded-md"
      >
        <AppLogo class="h-8 w-auto shrink-0" />
        <span class="text-xl font-bold text-highlighted">Calendar</span>
      </NuxtLink>

      <UTheme :props="{ button: { size: 'sm', class: 'rounded-full!' } }">
        <div class="ms-auto flex items-center gap-1.5">
          <UTooltip
            :text="t('subscribe.buttonLabel')"
            :kbds="['n']"
          >
            <UButton
              icon="i-lucide-rss"
              :aria-label="t('subscribe.buttonLabel')"
              @click="isSubscribeOpen = true"
            />
          </UTooltip>

          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="soft"
            :aria-label="t('calendar.sidebar.closeMenu')"
            class="lg:hidden rounded-full"
            @click="close"
          />
        </div>
      </UTheme>
    </template>

    <UButton
      icon="i-lucide-search"
      color="neutral"
      variant="soft"
      :label="t('calendar.sidebar.search')"
      @click="isSearchOpen = true"
    >
      <template #trailing>
        <span class="hidden lg:flex items-center gap-0.5 ms-auto">
          <UKbd
            value="meta"
            variant="soft"
          />
          <UKbd
            value="k"
            variant="soft"
          />
        </span>
      </template>
    </UButton>

    <CalendarList />

    <USeparator class="mt-auto" />

    <CalendarMini />

    <template #footer>
      <SettingsMenu />
    </template>
  </USidebar>
</template>
