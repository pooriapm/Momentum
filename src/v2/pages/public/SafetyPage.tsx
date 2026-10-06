import type { AppLocale } from '../../../platform/i18n/catalog'
import { LegalShell } from './LegalPage'
import { legalDocument } from './legal-copy'

export function SafetyPage({ locale }: { locale: AppLocale }) {
  return <LegalShell document={legalDocument('safety', locale)} locale={locale} />
}
