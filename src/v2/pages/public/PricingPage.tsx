import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { Button } from '../../ui/primitives'
import { MonthDial } from '../../ui/MonthDial'
import { Reveal } from '../../ui/Reveal'
import { formatNumber } from '../../lib/format'
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
import './pricing.css'

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
  // Payment outside Iran is not open yet: the membership offer collects interest instead.
  const abroad = (membership?.currency ?? pricingContext?.suggested_currency) === 'USD'
  const membershipLabel = abroad ? (fa ? 'وقتی عضویت باز شد خبرم کن' : 'Notify me when membership opens') : primaryLabel
  const showPaid = !unavailable && !loading
  const membershipFeatures = fa
    ? [
        'Momentum هر ماه برنامه غذا و تمرین سی‌روزه‌ات را می‌سازد و بعد از بررسی ایمنی وارد حسابت می‌کند.',
        'ماه بعد از نتیجه همین ماه ساخته می‌شود، از یک صفحه سفید نه.',
        'چند گزینه هم‌ارز برای هر وعده، و جایگزینی هر وقت خواستی.',
        'فهرست خرید هفته، آماده.',
        'روند و مقایسه هفته‌ها و ماه‌ها در پیشرفت.',
      ]
    : [
        'Momentum builds your thirty-day food and training plan every month, safety-checked before it goes live.',
        'Next month is built from how this month went, not from a blank page.',
        'Equivalent options for every meal, and swaps whenever you want.',
        'The week’s shopping list, ready to go.',
        'Trends and week-to-week comparisons in Progress.',
      ]
  const giftFeatures = giftUnavailable
    ? (fa
      ? ['هدیه برای آدم‌های تازه‌وارد فعلاً بسته است.', 'رزروهای قبلی و برنامه‌های ذخیره‌شده سر جایشان می‌مانند.']
      : ['The gift is paused for people who are new here.', 'Earlier reservations and saved plans stay where they are.'])
    : campaign === 'available' ? (fa
      ? ['برنامه اول را بدون هزینه شروع می‌کنی.', 'برای همین دوره هدیه، اطلاعات پرداخت لازم نیست.']
      : ['You start the first plan at no charge.', 'This gifted period does not ask for payment details.'])
    : (fa
      ? ['موجودی وقتی «ساخت برنامه» را می‌زنی بررسی می‌شود، قبل از اینکه برنامه‌ای ساخته شود.', 'هدیه فقط بعد از رزرو موفق قطعی است.']
      : ['Availability is checked when you select Generate, before plan creation.', 'The gift is confirmed only after a successful reservation.'])
  const offers = [
    ...(showPaid ? [
      {
        key: 'membership',
        tone: 'membership',
        image: '/landing/training.webp',
        alt: fa ? 'تمرین قدرتی با دمبل در خانه' : 'A strength session with a dumbbell at home',
        kicker: t('pricing.membership'),
        title: t('pricing.membership'),
        price: membershipPrice ?? t('pricing.membership'),
        body: fa
          ? 'این همان یک عضویت است. Momentum برنامه سی‌روزه غذا و تمرین را می‌سازد، دوره را از روز آماده‌شدن نگه می‌دارد، و ماه بعد را از نتیجه همین دوره می‌چیند.'
          : 'This is the one membership. Momentum builds the thirty-day food and training plan, keeps the period from the day it is ready, and shapes next month from how this one went.',
        features: membershipFeatures,
        href: primaryHref,
        label: membershipLabel,
        primary: true,
      },
      {
        key: 'gift',
        tone: 'gift',
        image: '/landing/meal.webp',
        alt: fa ? 'بشقاب مرغ زعفرانی با برنج و سالاد' : 'Saffron chicken with rice and salad',
        kicker: t('pricing.gift'),
        title: t('pricing.gift'),
        price: giftUnavailable
          ? (fa ? 'فعلاً برای تازه‌واردها بسته است' : 'Paused for new people')
          : campaign === 'available'
            ? t('pricing.giftPrice')
            : (fa ? 'بسته به موجودی هدیه' : 'Subject to gift availability'),
        body: giftUnavailable ? t('pricing.giftUnavailable') : campaign === 'available' ? t('pricing.giftAvailable') : t('pricing.giftReservationNote'),
        features: giftFeatures,
        href: giftUnavailable ? primaryHref : giftHref,
        label: giftUnavailable ? primaryLabel : t('pricing.giftCta'),
        primary: false,
      },
    ] : []),
  ]

  return (
    <div className="public-page pricing-page screen-enter" data-inventory={ids.join(' ')}>
      <PublicHeader locale={locale} />
      <main>
        <section className="pricing-hero">
          <div className="pricing-hero__copy">
            <p className="pricing-kicker">{t('pricing.eyebrow')}</p>
            <h1>{t('pricing.title')}</h1>
          </div>
          <div className="pricing-hero__aside">
            <p className="pricing-lead">{t('pricing.subtitle')}</p>
            <p className="pricing-lead pricing-lead--next">{t('pricing.oneOffer')}</p>
            {useLiveCatalog ? (
              <div role="group" className="pricing-region" aria-label={locale === 'fa' ? 'انتخاب منطقه قیمت' : 'Pricing region'}>
                <button aria-pressed={manualCountry === ''} className={manualCountry === '' ? 'is-active' : ''} onClick={() => setManualCountry('')} type="button">{locale === 'fa' ? 'پیشنهاد خودکار' : 'Automatic'}</button>
                <button aria-pressed={manualCountry === 'US'} className={manualCountry === 'US' ? 'is-active' : ''} onClick={() => setManualCountry('US')} type="button">Global · USD</button>
                <button aria-pressed={manualCountry === 'IR'} className={manualCountry === 'IR' ? 'is-active' : ''} onClick={() => setManualCountry('IR')} type="button">ایران · تومان</button>
              </div>
            ) : null}
            {loading ? <p aria-live="polite" className="pricing-status">{locale === 'fa' ? 'داریم قیمت را از کاتالوگ می‌خوانیم…' : 'Reading the price from the catalog…'}</p> : null}
            {unavailable ? <p className="pricing-status" role="status">{t('pricing.catalogUnavailable')}</p> : null}
            {unavailable && useLiveCatalog ? <Button variant="secondary" disabled={pricingQuery.isFetching} onClick={() => void pricingQuery.refetch()}>{pricingQuery.isFetching ? (fa ? 'در حال تلاش…' : 'Retrying…') : (fa ? 'تلاش دوباره' : 'Try again')}</Button> : null}
          </div>
        </section>

        {offers.length ? (
          <section aria-label={fa ? 'راه‌های داشتن برنامه' : 'Ways to get a plan'} className="pricing-offers">
            {offers.map((offer, index) => (
              <Reveal
                as="article"
                className={`pricing-offer pricing-offer--${offer.tone}${offer.key === 'gift' && giftUnavailable ? ' is-exhausted' : ''}`}
                delay={index * 90}
                key={offer.key}
              >
                {offer.tone === 'membership' ? (
                  <MonthDial className="pricing-offer__dial" day={30} trainingDays={[2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27, 30]}>
                    <span className="pricing-offer__dial-num">{formatNumber(30, locale)}</span>
                    <span className="pricing-offer__dial-unit">{fa ? 'روز' : 'days'}</span>
                  </MonthDial>
                ) : (
                  <figure className="pricing-offer__photo">
                    <img alt={offer.alt} decoding="async" loading="lazy" src={offer.image} />
                  </figure>
                )}
                <div className="pricing-offer__copy">
                  <p className="pricing-offer__kicker">{formatNumber(index + 1, locale, { minimumIntegerDigits: 2, useGrouping: false })}</p>
                  <h2>{offer.title}</h2>
                  <strong className="pricing-offer__price">{offer.price}</strong>
                  <p className="pricing-offer__body">{offer.body}</p>
                  <ul>
                    {offer.features.map((feature) => <li key={feature}><Check aria-hidden="true" size={16} />{feature}</li>)}
                  </ul>
                  <Link className={`orbit-button ${offer.primary ? 'orbit-button--primary' : 'orbit-button--secondary'}`} href={offer.href}>{offer.label}</Link>
                </div>
              </Reveal>
            ))}
          </section>
        ) : null}

        <section className="pricing-notes">
          <p>
            {pricingContext?.source === 'edge_hint'
              ? (fa ? 'IP فقط زبان اولیه و مسیر پرداخت را پیشنهاد می‌کند؛ زبان همیشه قابل تغییر است. ' : 'IP only suggests the initial language and payment route; language is always editable. ')
              : null}
            {t('pricing.regionNote')}
          </p>
          {!PAYMENTS_LIVE ? <p>{t('pricing.paymentsNotLive')}</p> : null}
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
