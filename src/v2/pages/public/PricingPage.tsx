import { useQuery } from '@tanstack/react-query'
import { Check, Gift, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, Eyebrow, StatusPill } from '../../ui/primitives'
import { formatPrice, loadPricingContext } from '../../data/pricing'

export function PricingPage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const [manualCountry, setManualCountry] = useState('')
  const pricingQuery = useQuery({
    queryKey: ['pricing-context', manualCountry],
    queryFn: () => loadPricingContext(manualCountry || undefined),
  })
  const pricingContext = pricingQuery.data
  const membership = pricingContext?.prices.find((price) => price.product_code === 'membership' && price.billing_interval === 'month')
  const membershipPrice = membership
    ? `${formatPrice(membership.amount_minor, membership.currency, locale)} / ${locale === 'fa' ? 'ماه' : 'month'}`
    : t('pricing.membershipPrice')
  const fa = locale === 'fa'
  const membershipFeatures = fa
    ? ['یک برنامه ترکیبی تمرین و تغذیه در هر دوره', 'شروع دوره از زمان آماده‌شدن برنامه', 'ورود خودکار پس از اعتبارسنجی', 'استفاده از نتیجه دوره قبل برای برنامه بعد']
    : ['One combined workout and nutrition plan per period', 'Period starts when the plan is ready', 'Automatic import after validation', 'Prior-period outcomes inform the next plan']
  const giftFeatures = fa
    ? ['برنامه اول را بدون هزینه شروع می‌کنی', 'روش پرداخت ثبت می‌شود؛ کارت تا دوره بعد شارژ نمی‌شود']
    : ['Start the first plan at no charge', 'A payment method is saved; the card is not charged until the next period']

  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main className="simple-public-page pricing-page">
        <div className="simple-public-page__heading">
          <Eyebrow>{t('pricing.eyebrow')}</Eyebrow>
          <h1>{t('pricing.title')}</h1>
          <p>{t('pricing.subtitle')}</p>
          <div className="pricing-region-control glass-chrome" aria-label={locale === 'fa' ? 'انتخاب منطقه قیمت' : 'Pricing region'}>
            <button aria-pressed={manualCountry === ''} className={manualCountry === '' ? 'is-active' : ''} onClick={() => setManualCountry('')} type="button">{locale === 'fa' ? 'پیشنهاد خودکار' : 'Automatic'}</button>
            <button aria-pressed={manualCountry === 'US'} className={manualCountry === 'US' ? 'is-active' : ''} onClick={() => setManualCountry('US')} type="button">Global · USD</button>
            <button aria-pressed={manualCountry === 'IR'} className={manualCountry === 'IR' ? 'is-active' : ''} onClick={() => setManualCountry('IR')} type="button">ایران · تومان</button>
          </div>
          {pricingQuery.isLoading ? <p aria-live="polite">{locale === 'fa' ? 'در حال دریافت کاتالوگ قیمت…' : 'Loading the pricing catalog…'}</p> : null}
          {pricingQuery.isError || (!pricingQuery.isLoading && !pricingContext) ? <p className="pricing-catalog-error" role="status">{locale === 'fa' ? 'کاتالوگ قیمت در این محیط در دسترس نیست؛ هیچ قیمت پیش‌فرضی جایگزین نشده است.' : 'The pricing catalog is unavailable in this environment; no fallback price has been substituted.'}</p> : null}
        </div>
        <div className="pricing-grid pricing-grid--canonical">
          <ContentCard className="pricing-card pricing-card--featured">
            <StatusPill tone="brand">{t('pricing.membership')}</StatusPill>
            <ShieldCheck className="pricing-card__icon" size={24} />
            <h2>{t('pricing.membership')}</h2>
            <strong>{membershipPrice}</strong>
            <ul>{membershipFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>{t('pricing.choose')}</Link>
          </ContentCard>
          <ContentCard className="pricing-card pricing-card--gift">
            <StatusPill tone="energy">{t('pricing.gift')}</StatusPill>
            <Gift className="pricing-card__icon" size={24} />
            <h2>{t('pricing.gift')}</h2>
            <strong>{t('pricing.giftPrice')}</strong>
            <ul>{giftFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/auth/sign-up')}>{t('pricing.giftCta')}</Link>
          </ContentCard>
        </div>
        <p className="pricing-local-note"><ShieldCheck size={18} />{pricingContext?.source === 'edge_hint' ? (locale === 'fa' ? 'منطقه با IP فقط پیشنهاد شده و در ساخت حساب قفل می‌شود. ' : 'IP only suggests a region; signup locks product_region. ') : ''}{t('pricing.regionNote')}</p>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
