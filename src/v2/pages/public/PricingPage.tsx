import { useQuery } from '@tanstack/react-query'
import { Check, Gift, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, Eyebrow, StatusPill } from '../../ui/primitives'
import { Reveal } from '../../ui/Reveal'
import {
  formatPrice,
  giftCampaignFromContext,
  loadPricingContext,
  membershipPriceFromContext,
  type PricingContext,
} from '../../data/pricing'
import {
  PAYMENTS_LIVE,
  pricingInventoryIds,
  type GiftCampaignStatus,
} from '../../entitlement'
import '../../entitlement/entitlement.css'

export function PricingPage({
  locale,
  catalog,
  giftCampaign,
}: {
  locale: AppLocale
  catalog?: PricingContext | null
  giftCampaign?: GiftCampaignStatus
}) {
  const { t } = useTranslation()
  const { status } = useAuth()
  const [manualCountry, setManualCountry] = useState('')
  const useLiveCatalog = catalog === undefined
  const pricingQuery = useQuery({
    queryKey: ['pricing-context', manualCountry],
    queryFn: () => loadPricingContext(manualCountry || undefined),
    enabled: useLiveCatalog,
  })
  const pricingContext = useLiveCatalog ? pricingQuery.data : catalog
  const loading = useLiveCatalog && pricingQuery.isLoading
  const unavailable = useLiveCatalog
    ? Boolean(pricingQuery.isError || (!pricingQuery.isLoading && !pricingContext))
    : catalog === null
  const membership = membershipPriceFromContext(pricingContext ?? null)
  const campaign = giftCampaign ?? giftCampaignFromContext(pricingContext)
  const ids = pricingInventoryIds({
    currency: membership?.currency ?? pricingContext?.suggested_currency,
    giftCampaign: campaign,
    loading,
    productRegion: pricingContext?.suggested_product_region,
    unavailable,
  })
  const membershipPrice = membership
    ? `${formatPrice(membership.amount_minor, membership.currency, locale)} / ${locale === 'fa' ? 'ماه' : 'month'}`
    : null
  const fa = locale === 'fa'
  const authenticated = status === 'authenticated'
  const primaryHref = localizedPath(locale, authenticated ? '/app/me' : '/auth/sign-up')
  const giftHref = localizedPath(locale, authenticated ? '/onboarding/review' : '/auth/sign-up')
  const primaryLabel = authenticated ? t('pricing.viewMembership') : t('pricing.choose')
  const giftUnavailable = campaign === 'exhausted' || campaign === 'disabled'
  const membershipFeatures = fa
    ? ['یک برنامه ترکیبی تمرین و تغذیه در هر دوره', 'شروع دوره از زمان آماده‌شدن برنامه', 'ورود خودکار پس از اعتبارسنجی', 'استفاده از نتیجه دوره قبل برای برنامه بعد']
    : ['One combined workout and nutrition plan per period', 'Period starts when the plan is ready', 'Automatic import after validation', 'Prior-period outcomes inform the next plan']
  const giftFeatures = giftUnavailable
    ? (fa
      ? ['هدیه برای کاربران جدید فعلاً بسته است', 'رزروهای قبلی و برنامه‌های ذخیره‌شده باقی می‌مانند']
      : ['New-user gifts are paused for now', 'Earlier reservations and saved plans remain'])
    : (fa
      ? ['برنامه اول را بدون هزینه شروع می‌کنی', 'روش پرداخت ثبت می‌شود؛ کارت تا دوره بعد شارژ نمی‌شود']
      : ['Start the first plan at no charge', 'A payment method is saved; the card is not charged until the next period'])

  return (
    <div className="public-page" data-inventory={ids.join(' ')}>
      <PublicHeader locale={locale} />
      <main className="simple-public-page pricing-page">
        <Reveal className="simple-public-page__heading">
          <Eyebrow>{t('pricing.eyebrow')}</Eyebrow>
          <h1>{t('pricing.title')}</h1>
          <p>{t('pricing.subtitle')}</p>
          <p>{t('pricing.oneOffer')}</p>
          {useLiveCatalog ? (
            <div className="pricing-region-control glass-chrome" aria-label={locale === 'fa' ? 'انتخاب منطقه قیمت' : 'Pricing region'}>
              <button aria-pressed={manualCountry === ''} className={manualCountry === '' ? 'is-active' : ''} onClick={() => setManualCountry('')} type="button">{locale === 'fa' ? 'پیشنهاد خودکار' : 'Automatic'}</button>
              <button aria-pressed={manualCountry === 'US'} className={manualCountry === 'US' ? 'is-active' : ''} onClick={() => setManualCountry('US')} type="button">Global · USD</button>
              <button aria-pressed={manualCountry === 'IR'} className={manualCountry === 'IR' ? 'is-active' : ''} onClick={() => setManualCountry('IR')} type="button">ایران · تومان</button>
            </div>
          ) : null}
          {loading ? <p aria-live="polite">{locale === 'fa' ? 'در حال دریافت کاتالوگ قیمت…' : 'Loading the pricing catalog…'}</p> : null}
          {unavailable ? <p className="pricing-catalog-error" role="status">{t('pricing.catalogUnavailable')}</p> : null}
        </Reveal>
        {!unavailable ? (
          <div className="pricing-grid pricing-grid--canonical">
            <ContentCard className="pricing-card pricing-card--featured">
              <StatusPill tone="brand">{t('pricing.membership')}</StatusPill>
              <ShieldCheck className="pricing-card__icon" size={24} />
              <h2>{t('pricing.membership')}</h2>
              <strong>{membershipPrice ?? t('pricing.membership')}</strong>
              <ul>{membershipFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              <Link className="orbit-button orbit-button--primary" href={primaryHref}>{primaryLabel}</Link>
            </ContentCard>
            <ContentCard className={`pricing-card pricing-card--gift${giftUnavailable ? ' is-exhausted' : ''}`}>
              <StatusPill tone={giftUnavailable ? 'neutral' : 'energy'}>{t('pricing.gift')}</StatusPill>
              <Gift className="pricing-card__icon" size={24} />
              <h2>{t('pricing.gift')}</h2>
              <strong>{giftUnavailable ? (fa ? 'فعلاً برای کاربران جدید بسته است' : 'Paused for new users') : t('pricing.giftPrice')}</strong>
              <p>{giftUnavailable ? t('pricing.giftUnavailable') : campaign === 'available' ? t('pricing.giftAvailable') : t('pricing.giftReservationNote')}</p>
              <ul>{giftFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
              {giftUnavailable
                ? <Link className="orbit-button orbit-button--secondary" href={primaryHref}>{primaryLabel}</Link>
                : <Link className="orbit-button orbit-button--secondary" href={giftHref}>{t('pricing.giftCta')}</Link>}
            </ContentCard>
          </div>
        ) : null}
        <p className="pricing-local-note"><ShieldCheck size={18} />{pricingContext?.source === 'edge_hint' ? (locale === 'fa' ? 'منطقه با IP فقط پیشنهاد شده و در ساخت حساب قفل می‌شود. ' : 'IP only suggests a region; signup locks product_region. ') : ''}{t('pricing.regionNote')}</p>
        {!PAYMENTS_LIVE ? <p className="pricing-local-note">{t('pricing.paymentsNotLive')}</p> : null}
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
