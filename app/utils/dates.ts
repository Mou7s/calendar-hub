import { CalendarDate, getLocalTimeZone, parseDate, Time, toCalendarDateTime, today } from '@internationalized/date'
import { addDays, lightFormat, startOfMonth, startOfWeek } from 'date-fns'

export function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function toTime(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes())
}

// `getLocalTimeZone` resolves an `Intl.DateTimeFormat` on every call and the
// month view runs this date math on every scroll frame
let localTimeZone: string | undefined

function timeZone(): string {
  return localTimeZone ??= getLocalTimeZone()
}

export function toDate(date: CalendarDate): Date {
  return date.toDate(timeZone())
}

export function toDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(timeZone())
}

export function todayDate(): CalendarDate {
  return today(timeZone())
}

// Identifies the local calendar day an event falls on, from the date parts so
// it stays correct across DST and costs less than a formatter
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// The day a grid cell stands for, as the `data-date` a pointer gesture reads
// back off it. `dayKey` is the cheaper bucket key and does not parse back
export function isoDate(date: Date): string {
  return lightFormat(date, 'yyyy-MM-dd')
}

// A drag spends dozens of moves inside one cell, and each one would otherwise
// allocate a `CalendarDate` and convert it back through the timezone
let lastISO: string | undefined
let lastDate: Date | undefined

export function dateFromISO(iso: string): Date {
  if (iso !== lastISO) {
    lastISO = iso
    lastDate = toDate(parseDate(iso))
  }

  return lastDate!
}

// The day under a point, from whichever cell is topmost there. Hit-testing
// live rather than measuring the cells upfront is what lets a drag reach a
// month row the virtualizer only mounted once the pointer got near it
export function dateAtPoint(x: number, y: number): Date | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const iso = (element as HTMLElement).dataset?.date
    if (iso) {
      return dateFromISO(iso)
    }
  }

  return null
}

// Ranges are [start, end) so the end boundary is the first excluded instant
export function weekRange(date: CalendarDate, days = 7): DateRange {
  const start = days === 7 ? startOfWeek(toDate(date), { weekStartsOn: 1 }) : toDate(date)

  return { start, end: addDays(start, days) }
}

// Always 6 rows of 7 days so the grid height never jumps between months
export function monthRange(date: CalendarDate): DateRange {
  const start = startOfWeek(startOfMonth(toDate(date)), { weekStartsOn: 1 })

  return { start, end: addDays(start, 42) }
}

// What the month view fetches and its SSR fallback renders: the grid's six
// weeks plus the rows a tall viewport shows below them, so a refresh paints
// real events all the way down instead of placeholders
export const MONTH_FETCH_WEEKS = 12

export function monthFetchRange(date: CalendarDate): DateRange {
  const { start } = monthRange(date)

  return { start, end: addDays(start, MONTH_FETCH_WEEKS * 7) }
}

export function rangeFor(view: CalendarView, date: CalendarDate): DateRange {
  if (view === 'month') {
    return monthFetchRange(date)
  }

  return weekRange(date, view === 'day' ? 1 : 7)
}

export function eachDay({ start, end }: DateRange): Date[] {
  const days: Date[] = []
  for (let day = start; day < end; day = addDays(day, 1)) {
    days.push(day)
  }

  return days
}

// app 的 i18n locale → Intl 的 BCP-47 标签。这里原来硬编码 en-US，中文界面里的
// 月份、星期、日期也就全是英文
const INTL_LOCALES: Record<string, string> = {
  'zh-CN': 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE'
}

const FORMATTER_OPTIONS = {
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  day: { weekday: 'short', day: 'numeric' },
  fullDate: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  weekday: { weekday: 'short' },
  month: { month: 'long' },
  shortMonth: { month: 'short' },
  shortMonthYear: { month: 'short', year: 'numeric' }
} satisfies Record<string, Intl.DateTimeFormatOptions>

type FormatterKind = keyof typeof FORMATTER_OPTIONS

// Constructing a formatter costs far more than formatting with it, and these run
// once per event chip and per day cell of every rendered week — so they are built
// once per (locale, kind) and reused across the whole app
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(kind: FormatterKind, locale: string): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`

  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.DateTimeFormat(INTL_LOCALES[locale] ?? locale, FORMATTER_OPTIONS[kind])
    formatters.set(key, cached)
  }

  return cached
}

export function formatTime(date: Date, locale: string): string {
  return formatter('time', locale).format(date)
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatDay(date: Date, locale: string): string {
  return formatter('day', locale).format(date)
}

export function formatFullDate(date: Date, locale: string): string {
  return formatter('fullDate', locale).format(date)
}

export function formatWeekday(date: Date, locale: string): string {
  return formatter('weekday', locale).format(date)
}

export function formatMonth(date: Date, locale: string): string {
  return formatter('month', locale).format(date)
}

export function formatShortMonth(date: Date, locale: string): string {
  return formatter('shortMonth', locale).format(date)
}

export interface RangeTitle {
  months: string
  year: string
}

export function formatRangeTitle({ start, end }: DateRange, locale: string): RangeTitle {
  const last = addDays(end, -1)
  const year = String(last.getFullYear())

  if (start.getMonth() === last.getMonth()) {
    return { months: formatter('month', locale).format(start), year }
  }

  const startMonth = formatter(start.getFullYear() !== last.getFullYear() ? 'shortMonthYear' : 'shortMonth', locale).format(start)
  const endMonth = formatter('shortMonth', locale).format(last)

  return { months: `${startMonth} – ${endMonth}`, year }
}
