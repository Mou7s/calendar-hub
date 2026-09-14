import { THEME_NEUTRAL_KEY, THEME_PRIMARY_KEY, isThemeNeutralColor, isThemePrimaryColor } from '~/utils/theme-colors'

// 用户在设置里挑的主色 / 中性色：存 localStorage，刷新后还在。
//
// 状态同时落到两处：
//   - `appConfig.ui.colors`：Nuxt UI 的 colors 插件据此生成 `--ui-color-*`
//   - `<html data-ui-primary / data-ui-neutral>`：`theme-colors.css`（生成的）
//     据此接管同样的 token，好处是首屏内联脚本可以先一步盖上，不等 hydration
//
// 由 `plugins/theme-colors.client.ts` 在应用渲染前创建；这里是应用级单例，
// `SettingsMenu` 再调用拿的是同一份状态。
const _useThemeColors = () => {
  const appConfig = useAppConfig()

  // 兜底值取 app.config.ts 的默认值，等于默认时就不用动 appConfig。
  // 注意：兜底值是字符串，vueuse 用 string 序列化器，存的是裸值（`blue` 无引号），
  // 首帧脚本按裸值优先、JSON 兼容的读法处理（见 utils/theme-colors.js）。
  const primary = useLocalStorage<string>(THEME_PRIMARY_KEY, appConfig.ui.colors.primary)
  const neutral = useLocalStorage<string>(THEME_NEUTRAL_KEY, appConfig.ui.colors.neutral)

  // 存储里的值可能来自旧版清单，也可能被人手动改过：Nuxt UI 拿到什么名字都会
  // 拼出一个 token（结果是没有任何颜色的），所以不认识的值一律退回默认
  if (!isThemePrimaryColor(primary.value)) {
    primary.value = appConfig.ui.colors.primary
  }

  if (!isThemeNeutralColor(neutral.value)) {
    neutral.value = appConfig.ui.colors.neutral
  }

  function apply() {
    appConfig.ui.colors.primary = primary.value
    appConfig.ui.colors.neutral = neutral.value

    if (import.meta.client) {
      document.documentElement.dataset.uiPrimary = primary.value
      document.documentElement.dataset.uiNeutral = neutral.value
    }
  }

  apply()

  watch([primary, neutral], apply)

  return { primary, neutral }
}

export const useThemeColors = createAppComposable(_useThemeColors)
