import type { AppLocale } from '../../platform/i18n/catalog'

export function formatNumber(value: number, locale: AppLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', options).format(value)
}

export function directionFor(locale: AppLocale) {
  return locale === 'fa' ? 'rtl' : 'ltr'
}
