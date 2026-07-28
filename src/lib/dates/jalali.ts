import {
  isLeapJalaaliYear,
  isValidJalaaliDate,
  jalaaliMonthLength,
  toGregorian,
  toJalaali as convertToJalaali,
} from 'jalaali-js'
import type { ISODate } from '../../types/domain'

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const

export interface JalaliDateParts {
  jy: number
  jm: number
  jd: number
}

export interface JalaliMonthCell extends JalaliDateParts {
  isoDate: ISODate
  isCurrentMonth: boolean
  weekdayIndex: number
}

export type JalaliDateFormat = 'full' | 'long' | 'numeric' | 'monthYear' | 'weekday'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parseIsoDate(isoDate: ISODate) {
  const [year, month, day] = isoDate.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error('Invalid ISO date')
  }

  return { year, month, day }
}

function dateToIso(date: Date): ISODate {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` as ISODate
}

function addIsoDays(isoDate: ISODate, amount: number): ISODate {
  const { year, month, day } = parseIsoDate(isoDate)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + amount)
  return dateToIso(date)
}

function weekdayIndex(isoDate: ISODate) {
  const { year, month, day } = parseIsoDate(isoDate)
  const gregorianWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return (gregorianWeekday + 1) % 7
}

export function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

export function getTodayIso(): ISODate {
  const today = new Date()
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` as ISODate
}

export function toJalali(isoDate: ISODate): JalaliDateParts {
  const { year, month, day } = parseIsoDate(isoDate)
  return convertToJalaali(year, month, day)
}

export function fromJalali(jy: number, jm: number, jd: number): ISODate {
  if (!isValidJalaaliDate(jy, jm, jd)) {
    throw new Error('Invalid Jalali date')
  }

  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return `${gy}-${pad(gm)}-${pad(gd)}` as ISODate
}

export function formatJalaliDate(
  isoDate: ISODate,
  format: JalaliDateFormat = 'long',
): string {
  const { jy, jm, jd } = toJalali(isoDate)
  const weekday = PERSIAN_WEEKDAYS[weekdayIndex(isoDate)]
  const day = toPersianDigits(jd)
  const year = toPersianDigits(jy)
  const month = PERSIAN_MONTHS[jm - 1]

  switch (format) {
    case 'full':
      return `${weekday}، ${day} ${month} ${year}`
    case 'numeric':
      return `${year}/${toPersianDigits(pad(jm))}/${toPersianDigits(pad(jd))}`
    case 'monthYear':
      return `${month} ${year}`
    case 'weekday':
      return weekday
    case 'long':
      return `${day} ${month} ${year}`
  }
}

export function getJalaliMonthGrid(jy: number, jm: number): JalaliMonthCell[] {
  const firstDayIso = fromJalali(jy, jm, 1)
  const leadingDays = weekdayIndex(firstDayIso)
  const daysInMonth = jalaaliMonthLength(jy, jm)
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const isoDate = addIsoDays(firstDayIso, index - leadingDays)
    const parts = toJalali(isoDate)

    return {
      ...parts,
      isoDate,
      isCurrentMonth: parts.jy === jy && parts.jm === jm,
      weekdayIndex: index % 7,
    }
  })
}

export function getJalaliWeekRange(isoDate: ISODate) {
  const offset = weekdayIndex(isoDate)
  return {
    start: addIsoDays(isoDate, -offset),
    end: addIsoDays(isoDate, 6 - offset),
  }
}

export function isSameJalaliDay(a: ISODate, b: ISODate) {
  const first = toJalali(a)
  const second = toJalali(b)
  return first.jy === second.jy && first.jm === second.jm && first.jd === second.jd
}

export function getJalaliMonthLength(jy: number, jm: number) {
  return jalaaliMonthLength(jy, jm)
}

export function isJalaliLeapYear(jy: number) {
  return isLeapJalaaliYear(jy)
}
