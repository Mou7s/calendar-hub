export default defineEventHandler((): Calendar[] => {
  // 只读订阅图层：专有名词无需翻译；颜色映射到 Nuxt UI 主题色，
  // 与模板的 eventBlockClasses / calendarDotClasses 色板对齐
  return [
    { id: 'spacex', name: 'SpaceX', color: 'info' },
    { id: 'f1', name: 'F1', color: 'error' },
    { id: 'wtt', name: 'WTT', color: 'warning' },
    { id: 'dota2', name: 'Dota 2', color: 'secondary' }
  ]
})
