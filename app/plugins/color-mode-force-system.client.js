// 强制跟随系统，修复旧的 localStorage 残留导致一直深色
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  try {
    const key = 'nuxt-color-mode'
    const stored = localStorage.getItem(key)
    // 如果之前存过 dark/light，说明是旧的手动模式，迁回 system
    if (stored === 'dark' || stored === 'light') {
      localStorage.removeItem(key)
      // 同步更新内存中的 __NUXT_COLOR_MODE__ 偏好
      const m = window.__NUXT_COLOR_MODE__
      if (m) m.preference = 'system'
    }
  } catch {}
})
