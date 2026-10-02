// 图层颜色只能是 6 个 Nuxt UI 主题色之一：事件与圆点的 class 映射
// （app/utils/calendars.ts）是构建时静态生成的，任意 hex 走不通。
// 服务端下发的颜色是默认值，用户在侧边栏另选的颜色存 localStorage，
// useCalendarEvents 把两者合并后返回，全站自动生效。
export const CALENDAR_LAYER_COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error']

export const CALENDAR_LAYER_COLORS_KEY = 'calendar-layer-colors'

export function isCalendarLayerColor(value) {
  return CALENDAR_LAYER_COLORS.includes(value)
}

export function resolveCalendarLayerColor(defaultColor, override) {
  return isCalendarLayerColor(override) ? override : defaultColor
}
