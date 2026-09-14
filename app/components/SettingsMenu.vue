<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import tailwindColors from 'tailwindcss/colors'

import { THEME_NEUTRAL_COLORS, THEME_PRIMARY_COLORS } from '~/utils/theme-colors'

// 侧边栏底部的设置入口：语言 / 主题 / 外观。模板在这个位置放的是一个演示
// 账户块（写死的头像与 Benjamin Canac，以及 Profile / Settings / Log out 这些
// 没有 handler 的死条目）：本站在服务端不保存任何用户数据，也就不存在
// 「当前登录人」，所以这里只做设置入口，不展示身份。
const colorMode = useColorMode()
// 主色 / 中性色由 useThemeColors 持有：挑过的颜色进 localStorage，刷新后还在
const { primary, neutral } = useThemeColors()
const { t, locale, locales, setLocale } = useI18n()

// setLocale 的参数类型被 `@nuxtjs/i18n` 收成 nuxt.config 里那 7 个 locale code 的
// 联合类型，而 `locales` 项上的 code 是宽泛的 string —— 两侧来自同一份配置，
// 这里取同一个类型，免得在调用处裸断言到 string
type LocaleCode = Parameters<typeof setLocale>[0]

// `setLocale` 内部会写 i18n 的 locale cookie（setLocaleSuspend → setCookieLocale），
// 所以选择在刷新后依然生效，服务端不参与
async function selectLocale(code: LocaleCode) {
  if (code === locale.value) {
    return
  }

  try {
    await setLocale(code)
  } catch {
    // 切换失败就留在原语言，不把菜单打断
  }
}

const languageItems = computed<DropdownMenuItem[]>(() => locales.value.map((item) => {
  const code = (typeof item === 'string' ? item : item.code) as LocaleCode
  const label = typeof item === 'string' ? item : (item.name || item.code)

  return {
    label,
    type: 'checkbox' as const,
    checked: locale.value === code,
    onSelect(e: Event) {
      e.preventDefault()

      selectLocale(code)
    }
  } satisfies DropdownMenuItem
}))

// 主题色板（Tailwind 的调色板名）：清单在 app/utils/theme-colors.js，生成
// theme-colors.css 的脚本读的是同一份
const colors = THEME_PRIMARY_COLORS
const neutrals = THEME_NEUTRAL_COLORS

// Tailwind only emits the palettes the app actually references, so a chip
// reads its variable with Tailwind's own value as fallback, the same way
// Nuxt UI resolves the color when you pick it
function chipStyle(chip: string) {
  const palette = tailwindColors[chip as keyof typeof tailwindColors]

  function shade(value: 400 | 500) {
    return typeof palette === 'object' ? palette[value] : ''
  }

  return {
    '--chip-light': `var(--color-${chip}-500, ${shade(500)})`,
    '--chip-dark': `var(--color-${chip}-400, ${shade(400)})`
  }
}

// 勾选读的是 preference，不是 colorMode.value：跟随设备时 value 是解析出来的
// 明暗，用它打勾会让「跟随设备」和当前的浅色/深色同时显示为选中
const appearanceItems = computed<DropdownMenuItem[]>(() => [{
  label: t('settings.system'),
  icon: 'i-lucide-monitor-smartphone',
  type: 'checkbox',
  checked: colorMode.preference === 'system',
  onSelect(e: Event) {
    e.preventDefault()

    colorMode.preference = 'system'
  }
}, {
  label: t('settings.light'),
  icon: 'i-lucide-sun',
  type: 'checkbox',
  checked: colorMode.preference === 'light',
  onSelect(e: Event) {
    e.preventDefault()

    colorMode.preference = 'light'
  }
}, {
  label: t('settings.dark'),
  icon: 'i-lucide-moon',
  type: 'checkbox',
  checked: colorMode.preference === 'dark',
  onSelect(e: Event) {
    e.preventDefault()

    colorMode.preference = 'dark'
  }
}])

const items = computed<DropdownMenuItem[][]>(() => [[{
  label: t('settings.language'),
  icon: 'i-lucide-languages',
  content: {
    align: 'center',
    collisionPadding: 16
  },
  children: languageItems.value
}], [{
  label: t('settings.theme'),
  icon: 'i-lucide-palette',
  children: [{
    label: t('settings.primary'),
    slot: 'chip',
    chip: primary.value,
    content: {
      align: 'center',
      collisionPadding: 16
    },
    children: colors.map(color => ({
      label: color,
      chip: color,
      slot: 'chip',
      checked: primary.value === color,
      type: 'checkbox',
      onSelect: (e) => {
        e.preventDefault()

        primary.value = color
      }
    }))
  }, {
    label: t('settings.neutral'),
    slot: 'chip',
    chip: neutral.value === 'neutral' ? 'old-neutral' : neutral.value,
    content: {
      align: 'end',
      collisionPadding: 16
    },
    children: neutrals.map(color => ({
      label: color,
      chip: color === 'neutral' ? 'old-neutral' : color,
      slot: 'chip',
      type: 'checkbox',
      checked: neutral.value === color,
      onSelect: (e) => {
        e.preventDefault()

        neutral.value = color
      }
    }))
  }]
}, {
  label: t('settings.appearance'),
  icon: 'i-lucide-sun-moon',
  content: {
    align: 'end',
    collisionPadding: 16
  },
  children: appearanceItems.value
}]])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      icon="i-lucide-settings"
      color="neutral"
      variant="ghost"
      block
      :label="t('settings.label')"
      :aria-label="t('settings.label')"
      trailing-icon="i-lucide-chevrons-up-down"
      class="data-[state=open]:bg-(--control-bg)"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="chipStyle((item as any).chip)"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
