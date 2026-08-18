import i18n from 'i18next'
import { type PropsWithChildren, useEffect } from 'react'
import { initReactI18next } from 'react-i18next'
import { resources, type AppLocale } from './catalog'
import { updateUiState } from '../../lib/ui-state'

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['fa', 'en'],
    interpolation: { escapeValue: false },
    returnNull: false,
  })
}

export function I18nProvider({ children }: PropsWithChildren) {
  return children
}

export function DocumentLocale({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
    document.title = locale === 'fa'
      ? 'Momentum — برنامه‌ریزی ماهانه حرکت‌های ماندگار'
      : 'Momentum — Monthly fitness and nutrition plans for lasting progress'
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      locale === 'fa'
        ? 'Momentum — برنامه‌ریزی ماهانه دو‌زبانه برای برنامه شخصی غذا، تمرین و پیگیری پیشرفت'
        : 'Momentum is a bilingual AI-assisted nutrition, training, and progress monthly planning platform.',
    )
    updateUiState({ locale })
  }, [locale])

  return null
}
