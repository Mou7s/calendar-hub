// 检查产物里的主题色规则：在不在、有没有被包进 @layer（包了就会输给 Nuxt UI colors
// 插件的 @layer theme，用户挑的颜色刷新后不生效）。
//
// 用法：node scripts/check-theme-colors-css.js [css 文件...]
//       不给参数就自己扫 .output/public/_nuxt/*.css
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const NUXT_DIR = fileURLToPath(new URL('../.output/public/_nuxt', import.meta.url))

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(NUXT_DIR)
      .filter(name => name.endsWith('.css'))
      .map(name => `${NUXT_DIR}/${name}`)

// 数到规则位置的花括号深度，记下途中的 @layer
function enclosingLayers(css, index) {
  const layers = []
  let pending = ''
  let inComment = false

  for (let i = 0; i < index; i++) {
    const char = css[i]

    if (inComment) {
      if (char === '*' && css[i + 1] === '/') inComment = false
      continue
    }

    if (char === '/' && css[i + 1] === '*') {
      inComment = true
      continue
    }

    if (char === '{') {
      if (/^@layer\s/.test(pending.trim())) layers.push(pending.trim())
      pending = ''
    } else if (char === '}') {
      layers.pop()
      pending = ''
    } else {
      pending = char === ';' ? '' : pending + char
    }
  }

  return layers
}

let failed = false

for (const file of files) {
  const css = readFileSync(file, 'utf8')
  // 压缩过的产物会把属性值上的引号去掉，所以两种写法都要认
  const index = css.search(/html\[data-ui-primary=['"]?blue['"]?\]/)

  if (index < 0) {
    console.log(`- ${file}: 没有主题色规则（不是带 tailwind 产物那一份？）`)
    continue
  }

  const rules = (css.match(/html\[data-ui-primary[^\]]*\]/g) || []).length
  const neutralRules = (css.match(/html\[data-ui-neutral[^\]]*\]/g) || []).length
  const layers = enclosingLayers(css, index)
  const primary = (css.match(/--ui-color-primary-/g) || []).length
  const neutral = (css.match(/--ui-color-neutral-/g) || []).length

  console.log(`${file}`)
  console.log(`  规则：${rules} primary + ${neutralRules} neutral；档位：${primary} + ${neutral}`)
  console.log(`  所在 layer：${layers.join(' > ') || '（无）'}`)
  console.log(layers.length ? '  ✗ 在 layer 里，会被 Nuxt UI 的 @layer theme 压住' : '  ✓ 无 layer，压得住 @layer theme')

  if (layers.length) failed = true
}

process.exitCode = failed ? 1 : 0
