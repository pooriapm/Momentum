import {
  formatJalaliDate,
  fromJalali,
  getJalaliMonthGrid,
  getJalaliMonthLength,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  toJalali,
} from '../../lib/dates/jalali'
import type { AppLocale } from '../../platform/i18n/catalog'
import type { ISODate } from '../../types/domain'

export interface CalendarCell {
  day: number
  isoDate: string
  isCurrentMonth: boolean
}

export const GREGORIAN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export { PERSIAN_MONTHS, PERSIAN_WEEKDAYS }

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function todayIso() {
  const today = new Date()
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

export function shiftIsoYears(isoDate: string, amount: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const candidate = new Date(Date.UTC(year + amount, month - 1, day))
  if (candidate.getUTCMonth() !== month - 1) candidate.setUTCDate(0)
  return `${candidate.getUTCFullYear()}-${pad(candidate.getUTCMonth() + 1)}-${pad(candidate.getUTCDate())}`
}

export function calendarParts(isoDate: string, locale: AppLocale) {
  if (locale === 'fa') {
    const { jy, jm, jd } = toJalali(isoDate as ISODate)
    return { year: jy, month: jm, day: jd }
  }
  const [year, month, day] = isoDate.split('-').map(Number)
  return { year, month, day }
}

export function calendarIso(year: number, month: number, day: number, locale: AppLocale) {
  if (locale === 'fa') return fromJalali(year, month, day)
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${pad(month)}-${pad(Math.min(day, maxDay))}`
}

export function calendarMonthLength(year: number, month: number, locale: AppLocale) {
  return locale === 'fa' ? getJalaliMonthLength(year, month) : new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function monthGrid(year: number, month: number, locale: AppLocale): CalendarCell[] {
  if (locale === 'fa') {
    return getJalaliMonthGrid(year, month).map((cell) => ({
      day: cell.jd,
      isoDate: cell.isoDate,
      isCurrentMonth: cell.isCurrentMonth,
    }))
  }

  const first = new Date(Date.UTC(year, month - 1, 1))
  const leadingDays = first.getUTCDay()
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - leadingDays + 1))
    return {
      day: date.getUTCDate(),
      isoDate: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      isCurrentMonth: date.getUTCMonth() === month - 1,
    }
  })
}

export function formatLocalizedDate(isoDate: string, locale: AppLocale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
  if (locale === 'fa') return formatJalaliDate(isoDate as ISODate, 'long')
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
