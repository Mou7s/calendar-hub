// 主题色（主色 / 中性色）可选项，以及选择存在哪里。
//
// 三处共用这份清单，改完清单要重新生成 CSS：
//   - `app/components/SettingsMenu.vue` 的色板
//   - `scripts/generate-theme-colors.js` → `app/assets/css/theme-colors.css`
//   - `themeColorsBootstrapScript()`（下面的首帧脚本）
// 名字沿用 Tailwind 调色板名，因为 `appConfig.ui.colors` 收的就是这些名字。
export const THEME_PRIMARY_KEY = 'calendar-hub:ui-primary'
export const THEME_NEUTRAL_KEY = 'calendar-hub:ui-neutral'

export const THEME_PRIMARY_COLORS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
]

export const THEME_NEUTRAL_COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone']

/** @param {unknown} value */
export function isThemePrimaryColor(value) {
  return typeof value === 'string' && THEME_PRIMARY_COLORS.includes(value)
}

/** @param {unknown} value */
export function isThemeNeutralColor(value) {
  return typeof value === 'string' && THEME_NEUTRAL_COLORS.includes(value)
}

// 首帧脚本（nuxt.config.ts 把它内联进 <head>）：服务端渲染看不到 localStorage，刷新时
// 只能按 app.config.ts 的默认色画出那一帧；这段脚本在第一帧之前把选择盖到 <html> 上，
// `theme-colors.css` 里按 data-ui-* 生成的规则随即接管 token。
//
// 读法要注意：`useLocalStorage` 的兜底值是字符串，vueuse 于是用它的 string 序列化器，
// 存进去的是裸值（`blue`，没有引号）；不要想当然地 JSON.parse —— 那会解析失败，
// 属性永远盖不上（真机上表现为「刷新后又回到默认色」）。带引号的旧值顺手兼容一下。
//
// 写成函数返回源码（而不是在 nuxt.config.ts 里手拼字符串）是为了：属性名与 key 只有一份，
// 而且 `test/theme-colors.test.js` 能拿它对着假的 localStorage / document 真跑一遍。
export function themeColorsBootstrapScript() {
  return `(() => {
  var read = function (key) {
    var value = localStorage.getItem(key)
    if (!value) { return null }
    try { value = JSON.parse(value) } catch (error) { /* 裸值，原样用 */ }
    return typeof value === 'string' ? value : null
  }
  var root = document.documentElement
  var primary = read(${JSON.stringify(THEME_PRIMARY_KEY)})
  var neutral = read(${JSON.stringify(THEME_NEUTRAL_KEY)})
  if (primary) { root.dataset.uiPrimary = primary }
  if (neutral) { root.dataset.uiNeutral = neutral }
})()`
}
