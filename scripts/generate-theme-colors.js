// 生成 app/assets/css/theme-colors.css —— 把「用户选中的调色板」还原成 Nuxt UI 读的
// `--ui-color-*` token。
//
// 为什么需要它：Nuxt UI 自己的 colors 插件把 `appConfig.ui.colors` 写成一段 `@layer theme`
// 里的 CSS 变量，而这段变量是构建后才能由 app 配置生成的，服务端渲染时只能按 app.config.ts
// 的默认值写出来。用户在设置里挑的颜色存在 localStorage 里，服务端看不到，所以要在首屏渲染前
// 由内联脚本把选择写到 <html data-ui-primary> 上，再由本文件生成的（无 layer，优先级高于
// `@layer theme`）规则接管 —— 否则刷新时会先闪一下默认色。
//
// 用法：bun run generate:theme-colors（改了 app/utils/theme-colors.js 的清单后必须重跑）
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindColors from 'tailwindcss/colors'

import { THEME_NEUTRAL_COLORS, THEME_PRIMARY_COLORS } from '../app/utils/theme-colors.js'

export const OUTPUT_PATH = fileURLToPath(new URL('../app/assets/css/theme-colors.css', import.meta.url))

// Nuxt UI 自己也是这 11 档
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

// 每个 token 都写成 `var(--color-x-500, #hex)`：Tailwind 只会把用到的调色板变量留在
// 产物里，没留下的那部分靠兜底值顶上，跟 Nuxt UI 的写法一致。`neutral` 这个名字跟
// Nuxt UI 自己的中性色别名撞车，它的变量被改名成 `old-neutral`
const NEUTRAL_SOURCE = 'old-neutral'

const BANNER = `/* 由 \`bun run generate:theme-colors\` 生成，不要手改。
 *
 * 设置菜单把选中的调色板写进 localStorage，nuxt.config.ts 的首屏内联脚本把它盖到
 * <html data-ui-primary / data-ui-neutral> 上，这里把这两个属性翻译回 Nuxt UI 的
 * \`--ui-color-*\` token。规则没有包在 layer 里，所以能压过 Nuxt UI colors 插件所在的
 * \`@layer theme\`，刷新时不会先闪默认色。
 *
 * 清单在 app/utils/theme-colors.js，改了清单要重跑生成脚本。 */`

/**
 * @param {string} role
 * @param {readonly string[]} palettes
 */
function rulesFor(role, palettes) {
  return palettes.map((palette) => {
    const source = palette === 'neutral' ? NEUTRAL_SOURCE : palette
    const shades = SHADES.map((shade) => {
      const fallback = tailwindColors[palette]?.[shade]
      const value = fallback ? `, ${fallback}` : ''

      return `  --ui-color-${role}-${shade}: var(--color-${source}-${shade}${value});`
    })

    return [`html[data-ui-${role}='${palette}'] {`, ...shades, '}'].join('\n')
  })
}

export function generateThemeColorsCss() {
  const rules = [
    ...rulesFor('primary', THEME_PRIMARY_COLORS),
    ...rulesFor('neutral', THEME_NEUTRAL_COLORS)
  ]

  return `${BANNER}\n\n${rules.join('\n\n')}\n`
}

// 直接执行时写文件；被 test 引入时只导出生成函数
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = generateThemeColorsCss()
  const current = (() => {
    try {
      return readFileSync(OUTPUT_PATH, 'utf8').replace(/\r\n/g, '\n')
    } catch {
      return ''
    }
  })()

  writeFileSync(OUTPUT_PATH, css)
  console.log(
    current === css
      ? `theme-colors.css 已是最新（${THEME_PRIMARY_COLORS.length} 主色 + ${THEME_NEUTRAL_COLORS.length} 中性色）`
      : `theme-colors.css 已更新（${THEME_PRIMARY_COLORS.length} 主色 + ${THEME_NEUTRAL_COLORS.length} 中性色）`
  )
}
