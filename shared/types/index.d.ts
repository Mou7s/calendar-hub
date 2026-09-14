export type CalendarView = 'day' | 'week' | 'month'

export interface DateRange {
  start: Date
  end: Date
}

export interface Calendar {
  id: string
  name: string
  color: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary'
}

export interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
  // 只读订阅源扩展（全部可选，不破坏模板 contract）
  live?: boolean
  location?: string
  vehicle?: string
  url?: string
  scores?: string
}
