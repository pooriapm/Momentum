import { isAppLocale, type AppLocale } from '../../platform/i18n/catalog'

export function localeFromPath(pathname: string): AppLocale {
  const segment = pathname.split('/').filter(Boolean)[0]
  return isAppLocale(segment) ? segment : 'fa'
}

export function localizedPath(locale: AppLocale, path = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalized === '/' ? '' : normalized}`
}

export function switchLocalePath(pathname: string, locale: AppLocale) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return `/${locale}`
  }
  if (isAppLocale(segments[0])) {
    segments[0] = locale
  } else {
    segments.unshift(locale)
  }
  return `/${segments.join('/')}`
}
