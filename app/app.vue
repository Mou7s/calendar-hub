<script setup lang="ts">
import { de, en, es, fr, ja, ko, zh_cn } from '@nuxt/ui/locale'

// Own the shared events state at the root: its `useFetch` server prefetch
// then completes before the whole tree renders. A mid-tree owner (sidebar
// or page) only gates its own subtree, siblings would render with empty
// events during SSR and mismatch on hydration
useCalendarEvents()

const { t, locale } = useI18n()

// Nuxt UI 自己的文案和日期格式化走它内部的 locale 上下文：UApp 的 locale 会把它交给
// ConfigProvider，迷你日历的月份/星期名、组件内置的「关闭/上个月」等才会跟着语言走
const UI_LOCALES = { 'zh-CN': zh_cn, en, ja, ko, es, fr, de }

const uiLocale = computed(() => UI_LOCALES[locale.value] ?? en)

const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

// html 的 lang 跟着 i18n 走：原来写死 'en'，切到日文后它仍是 en
useHead(() => ({
  htmlAttrs: {
    lang: locale.value
  }
}))

const title = computed(() => t('meta.title'))
const description = computed(() => t('meta.description'))

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/icon-512.png',
  twitterCard: 'summary'
})

// 下一次发射的结构化数据（Google Event 富媒体），SEO 红线：勿删
const { data: launchPayload } = useFetch('/api/launches', {
  key: 'seo-next-launch',
  default: () => null
})

const nextLaunch = computed(() => (launchPayload.value as { nextLaunch?: any } | null)?.nextLaunch ?? null)

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://calendarhub.mou7s.com/#website',
            'url': 'https://calendarhub.mou7s.com/',
            'name': title.value,
            description: description.value,
            publisher: {
              '@type': 'Organization',
              name: 'Calendar Hub Team'
            }
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://calendarhub.mou7s.com/#software',
            'name': 'Calendar Hub PWA',
            'operatingSystem': 'All',
            'applicationCategory': 'UtilitiesApplication',
            'offers': {
              '@type': 'Offer',
              price: '0.00',
              priceCurrency: 'USD'
            }
          },
          nextLaunch.value?.launchAt
            ? {
                '@type': 'Event',
                'name': nextLaunch.value.title,
                'startDate': nextLaunch.value.launchAt,
                'location': {
                  '@type': 'Place',
                  name: nextLaunch.value.launchSite || 'TBD',
                  address: nextLaunch.value.launchSite || 'TBD'
                },
                'description': `${nextLaunch.value.vehicle || ''} launch tracking: ${nextLaunch.value.title} scheduled flight.`.trim()
              }
            : null
        ].filter(Boolean)
      })
    }
  ]
}))
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLoadingIndicator />

    <div class="isolate relative flex h-svh overflow-hidden">
      <AppSidebar />

      <NuxtPage />

      <AppSearch />

      <SubscribeModal />
    </div>
  </UApp>
</template>
