import { HeartHandshake, LockKeyhole, Scale, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { ContentCard, Eyebrow } from '../../ui/primitives'

export function SafetyPage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const cards = [
    [Scale, t('safety.adult')],
    [HeartHandshake, t('safety.clinical')],
    [ShieldCheck, t('safety.control')],
    [LockKeyhole, t('safety.privacy')],
  ] as const
  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main className="simple-public-page safety-page">
        <div className="simple-public-page__heading">
          <Eyebrow>General wellness</Eyebrow>
          <h1>{t('safety.title')}</h1>
          <p>{t('safety.intro')}</p>
        </div>
        <div className="safety-grid">
          {cards.map(([Icon, copy]) => <ContentCard key={copy}><Icon size={26} /><p>{copy}</p></ContentCard>)}
        </div>
        <ContentCard className="safety-disclaimer">
          <strong>Important</strong>
          <p>Momentum is not an emergency service. If you feel unwell or believe you may be in danger, contact local emergency services or a qualified clinician.</p>
        </ContentCard>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
