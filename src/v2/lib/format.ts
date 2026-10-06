import type { AppLocale } from '../../platform/i18n/catalog'

export function formatNumber(value: number, locale: AppLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', options).format(value)
}

export function formatClock(time: string, locale: AppLocale) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return time
  const hour = formatNumber(Number(match[1]), locale, { minimumIntegerDigits: 2, useGrouping: false })
  const minute = formatNumber(Number(match[2]), locale, { minimumIntegerDigits: 2, useGrouping: false })
  return `${hour}:${minute}`
}

/** Keeps set notation readable. Persian rewrites plain counts, per-side reps, and minute markers. */
export function formatReps(reps: string, locale: AppLocale) {
  if (locale !== 'fa') return reps
  const side = /^(\d+)\s*\/\s*side$/i.exec(reps)
  if (side) return `${formatNumber(Number(side[1]), locale)} هر طرف`
  const minutes = /^(\d+)\s*min$/i.exec(reps)
  if (minutes) return `${formatNumber(Number(minutes[1]), locale)} دقیقه`
  if (/^\d+$/.test(reps)) return formatNumber(Number(reps), locale)
  return reps.replace(/\d+/g, (digits) => formatNumber(Number(digits), locale))
}

export function directionFor(locale: AppLocale) {
  return locale === 'fa' ? 'rtl' : 'ltr'
}
