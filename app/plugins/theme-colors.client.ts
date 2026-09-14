// 主题色（主色 / 中性色）比应用自己更早一步就位：Nuxt UI 的 colors 插件在渲染时
// 读 `appConfig.ui.colors`，晚设置一步就会先用默认色画一帧。真正赶在首帧之前的
// 是 nuxt.config.ts 里的内联脚本（插件没有这个时机），它已经把选择盖到 <html> 上，
// 这里再把同一份选择补进 appConfig，让 Nuxt UI 自己的 token 与之一致。
export default defineNuxtPlugin({
  name: 'theme-colors',
  enforce: 'pre',
  setup() {
    useThemeColors()
  }
})
