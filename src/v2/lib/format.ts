import type { AppLocale } from '../../platform/i18n/catalog'

export function formatNumber(value: number, locale: AppLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', options).format(value)
}

export function formatToday(locale: AppLocale, localDate?: string, timezone?: string) {
  const date = localDate ? new Date(`${localDate}T12:00:00`) : new Date()
  return new Intl.DateTimeFormat(
    locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(localDate || !timezone ? {} : { timeZone: timezone }),
    },
  ).format(date)
}

export function directionFor(locale: AppLocale) {
  return locale === 'fa' ? 'rtl' : 'ltr'
}
