import { useQuery } from '@tanstack/react-query'
import { Check, ShieldCheck, Sparkles, Zap } from 'lucide-react'
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
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const pricingQuery = useQuery({
    queryKey: ['pricing-context', manualCountry],
    queryFn: () => loadPricingContext(manualCountry || undefined),
  })
  const pricingContext = pricingQuery.data
  const regionUnavailable = pricingContext?.ai_service_available === false
  const priceFor = (productCode: string) => pricingContext?.prices.find((price) => price.product_code === productCode && price.billing_interval === billingInterval)
  const corePrice = priceFor('core')
  const proPrice = priceFor('pro')
  const plans = [
    { key: 'trial', price: t('pricing.trialPrice'), icon: Sparkles, featured: false, features: locale === 'fa' ? ['یک برنامه شخصی', '۱۰ پیام مربی', 'Preview ثبت روزانه'] : ['1 personalized plan', '10 coach messages', 'Daily tracking preview'] },
    { key: 'core', price: corePrice ? `${formatPrice(corePrice.amount_minor, corePrice.currency, locale)} / ${billingInterval === 'month' ? (locale === 'fa' ? 'ماه' : 'month') : (locale === 'fa' ? 'سال' : 'year')}` : '—', icon: Zap, featured: true, features: locale === 'fa' ? [`${corePrice?.included_coach_messages ?? '—'} پیام مربی`, `${corePrice?.included_plan_generations ?? '—'} ساخت یا بازتنظیم برنامه`, `${corePrice?.included_body_composition_extractions ?? '—'} تحلیل ترکیب بدنی`] : [`${corePrice?.included_coach_messages ?? '—'} coach messages`, `${corePrice?.included_plan_generations ?? '—'} plan generations or adaptations`, `${corePrice?.included_body_composition_extractions ?? '—'} body-composition analyses`] },
    { key: 'pro', price: proPrice ? `${formatPrice(proPrice.amount_minor, proPrice.currency, locale)} / ${billingInterval === 'month' ? (locale === 'fa' ? 'ماه' : 'month') : (locale === 'fa' ? 'سال' : 'year')}` : '—', icon: ShieldCheck, featured: false, features: locale === 'fa' ? [`${proPrice?.included_coach_messages ?? '—'} پیام مربی`, `${proPrice?.included_plan_generations ?? '—'} ساخت یا بازتنظیم برنامه`, `${proPrice?.included_body_composition_extractions ?? '—'} تحلیل ترکیب بدنی`] : [`${proPrice?.included_coach_messages ?? '—'} coach messages`, `${proPrice?.included_plan_generations ?? '—'} plan generations or adaptations`, `${proPrice?.included_body_composition_extractions ?? '—'} body-composition analyses`] },
  ] as const
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
          <div className="pricing-region-control glass-chrome" aria-label={locale === 'fa' ? 'دوره پرداخت' : 'Billing interval'}>
            <button aria-pressed={billingInterval === 'month'} className={billingInterval === 'month' ? 'is-active' : ''} onClick={() => setBillingInterval('month')} type="button">{locale === 'fa' ? 'ماهانه' : 'Monthly'}</button>
            <button aria-pressed={billingInterval === 'year'} className={billingInterval === 'year' ? 'is-active' : ''} onClick={() => setBillingInterval('year')} type="button">{locale === 'fa' ? 'سالانه' : 'Annual'}</button>
          </div>
          {pricingQuery.isLoading ? <p aria-live="polite">{locale === 'fa' ? 'در حال دریافت کاتالوگ قیمت…' : 'Loading the pricing catalog…'}</p> : null}
          {pricingQuery.isError || (!pricingQuery.isLoading && !pricingContext) ? <p className="pricing-catalog-error" role="status">{locale === 'fa' ? 'کاتالوگ قیمت در این محیط در دسترس نیست؛ هیچ قیمت پیش‌فرضی جایگزین نشده است.' : 'The pricing catalog is unavailable in this environment; no fallback price has been substituted.'}</p> : null}
          {regionUnavailable ? <p className="pricing-catalog-error" role="status">{locale === 'fa' ? 'قابلیت‌های هوش مصنوعی Momentum فعلاً در این منطقه ارائه نمی‌شوند و هیچ پلنی قابل فعال‌سازی نیست.' : 'Momentum AI features are not currently offered in this region, so no plan can be activated.'}</p> : null}
        </div>
        <div className="pricing-grid">
          {plans.map(({ key, price, icon: Icon, features, featured }) => (
            <ContentCard className={`pricing-card ${featured ? 'pricing-card--featured' : ''}`} key={key}>
              {featured ? <StatusPill tone="brand">Recommended</StatusPill> : null}
              <Icon className="pricing-card__icon" size={24} />
              <h2>{t(`pricing.${key}`)}</h2>
              <strong>{price}</strong>
              <ul>{features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              {regionUnavailable || (key !== 'trial' && price === '—')
                ? <button className={`orbit-button ${featured ? 'orbit-button--primary' : 'orbit-button--secondary'}`} disabled type="button">{locale === 'fa' ? 'فعلاً در دسترس نیست' : 'Not currently available'}</button>
                : <Link className={`orbit-button ${featured ? 'orbit-button--primary' : 'orbit-button--secondary'}`} href={localizedPath(locale, '/auth/sign-up')}>{t('pricing.choose')}</Link>}
            </ContentCard>
          ))}
        </div>
        <p className="pricing-local-note"><ShieldCheck size={18} />{pricingContext?.source === 'edge_hint' ? (locale === 'fa' ? 'منطقه با IP فقط پیشنهاد شده و در پرداخت با کشور صورتحساب بررسی می‌شود. ' : 'IP only suggests a region; billing country is verified at checkout. ') : ''}{t('pricing.localDisabled')}</p>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
