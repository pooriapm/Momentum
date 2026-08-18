import i18n from 'i18next'
import { type PropsWithChildren, useEffect } from 'react'
import { DocumentLocale, I18nProvider } from '../src/platform/i18n/I18nProvider'
import type { AppLocale } from '../src/platform/i18n/catalog'

export function LocalizedStory({ children, locale }: PropsWithChildren<{ locale: AppLocale }>) {
  useEffect(() => {
    void i18n.changeLanguage(locale)
  }, [locale])

  return (
    <I18nProvider>
      <DocumentLocale locale={locale} />
      {children}
    </I18nProvider>
  )
}
