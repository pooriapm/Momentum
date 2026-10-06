import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { Button } from '../../ui/primitives'
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
  const reelRef = useRef<HTMLElement>(null)
  const [beat, setBeat] = useState(0)
  const [meterOn, setMeterOn] = useState(false)
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
  const showPaid = !unavailable && !loading
  const membershipFeatures = fa
    ? [
        'هر دوره یک برنامه غذا و تمرین است، با هم، نه در دو جای جدا.',
        'سی روز از روز آماده‌شدن برنامه حساب می‌شود، نه از اول ماه تقویمی.',
        'بعد از بررسی ایمنی، همان برنامه وارد حسابت می‌شود.',
        'ماه بعد از نتیجه همین دوره ساخته می‌شود، از یک صفحه سفید نه.',
      ]
    : [
        'Each period is one food and training plan, together, not in two separate places.',
        'The thirty days start when the plan is ready, not on the first of the calendar month.',
        'After the safety check, that plan is imported into your account.',
        'Next month is built from how this period went, not from a blank page.',
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
    {
      key: 'free',
      tone: 'free',
      image: '/landing/continue.jpg',
      alt: fa ? 'ادامه راه در نور صبح' : 'Walking on into the morning light',
      kicker: fa ? 'رایگان، همیشه' : 'Free, and it stays free',
      title: fa ? 'برنامه خودت را بیاور' : 'Bring your own plan',
      price: fa ? 'بدون هزینه' : 'No charge',
      body: fa
        ? 'اگر غذا و تمرین را جای دیگری چیده‌ای، برای Momentum اشتراک لازم نیست. پرامپت آماده را در ابزاری که خودت انتخاب می‌کنی اجرا کن، یا فایل برنامه‌ات را وارد کن. کاتالوگ، حساسیت و ایمنی همین‌جا بررسی می‌شود، و Momentum آن متن را خودش به ابزار دیگری نمی‌فرستد.'
        : 'If you already built the food and the training somewhere else, Momentum does not need a subscription. Run the ready prompt in a tool you choose, or import the plan you have. Catalog, allergy, and safety checks happen here, and Momentum does not send that text on to another tool by itself.',
      features: fa
        ? ['واردکردن، تاریخچه و پیگیری روزها، بدون اشتراک.', 'بررسی کاتالوگ، حساسیت و ایمنی قبل از اینکه برنامه فعال شود.', 'هیچ ارسال خودکاری به ابزار بیرونی انجام نمی‌شود.']
        : ['Import, history, and day-to-day tracking, without a subscription.', 'Catalog, allergy, and safety checks before the plan goes live.', 'Nothing is sent to an outside tool unless you do that yourself.'],
      href: localizedPath(locale, authenticated ? '/onboarding/plan-source' : '/auth/sign-up'),
      label: fa ? 'انتخاب مسیر رایگان' : 'Choose the free path',
      primary: false,
    },
    ...(showPaid ? [
      {
        key: 'membership',
        tone: 'membership',
        image: '/landing/training.jpg',
        alt: fa ? 'تمرین قدرتی با دمبل در خانه' : 'A strength session with a dumbbell at home',
        kicker: t('pricing.membership'),
        title: t('pricing.membership'),
        price: membershipPrice ?? t('pricing.membership'),
        body: fa
          ? 'این همان یک عضویت است. Momentum برنامه سی‌روزه غذا و تمرین را می‌سازد، دوره را از روز آماده‌شدن نگه می‌دارد، و ماه بعد را از نتیجه همین دوره می‌چیند.'
          : 'This is the one membership. Momentum builds the thirty-day food and training plan, keeps the period from the day it is ready, and shapes next month from how this one went.',
        features: membershipFeatures,
        href: primaryHref,
        label: primaryLabel,
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

  useEffect(() => {
    let frame = 0
    const update = () => {
      const section = reelRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const on = offers.length > 1 && rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.28
      setMeterOn((current) => current === on ? current : on)
      let nextBeat = 0
      section.querySelectorAll<HTMLElement>('.pricing-frame').forEach((panel, index) => {
        if (panel.getBoundingClientRect().top < window.innerHeight * 0.55) nextBeat = index
      })
      setBeat((current) => current === nextBeat ? current : nextBeat)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [offers.length])

  return (
    <div className="public-page pricing-page" data-inventory={ids.join(' ')}>
      <PublicHeader locale={locale} />
      {offers.length > 1 ? (
        <div aria-hidden="true" className={`pricing-meter${meterOn ? ' is-on' : ''}`}>
          <i style={{ transform: `scaleY(${beat / Math.max(offers.length - 1, 1)})` }} />
          <ol>
            {offers.map((offer, index) => (
              <li className={index === beat ? 'is-active' : index < beat ? 'is-done' : ''} key={offer.key}>
                {formatNumber(index + 1, locale, { minimumIntegerDigits: 2, useGrouping: false })}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <main>
        <section className="pricing-hero">
          <div aria-hidden="true" className="pricing-orb pricing-orb--a" />
          <div aria-hidden="true" className="pricing-orb pricing-orb--b" />
          <p className="pricing-kicker">{t('pricing.eyebrow')}</p>
          <h1>{t('pricing.title')}</h1>
          <p className="pricing-lead">{t('pricing.subtitle')}</p>
          <p className="pricing-lead pricing-lead--next">{t('pricing.oneOffer')}</p>
          {useLiveCatalog ? (
            <div role="group" className="pricing-region glass-chrome" aria-label={locale === 'fa' ? 'انتخاب منطقه قیمت' : 'Pricing region'}>
              <button aria-pressed={manualCountry === ''} className={manualCountry === '' ? 'is-active' : ''} onClick={() => setManualCountry('')} type="button">{locale === 'fa' ? 'پیشنهاد خودکار' : 'Automatic'}</button>
              <button aria-pressed={manualCountry === 'US'} className={manualCountry === 'US' ? 'is-active' : ''} onClick={() => setManualCountry('US')} type="button">Global · USD</button>
              <button aria-pressed={manualCountry === 'IR'} className={manualCountry === 'IR' ? 'is-active' : ''} onClick={() => setManualCountry('IR')} type="button">ایران · تومان</button>
            </div>
          ) : null}
          {loading ? <p aria-live="polite" className="pricing-status">{locale === 'fa' ? 'داریم قیمت را از کاتالوگ می‌خوانیم…' : 'Reading the price from the catalog…'}</p> : null}
          {unavailable ? <p className="pricing-status" role="status">{t('pricing.catalogUnavailable')}</p> : null}
          {unavailable && useLiveCatalog ? <Button variant="secondary" disabled={pricingQuery.isFetching} onClick={() => void pricingQuery.refetch()}>{pricingQuery.isFetching ? (fa ? 'در حال تلاش…' : 'Retrying…') : (fa ? 'تلاش دوباره' : 'Try again')}</Button> : null}
        </section>

        <section aria-label={fa ? 'راه‌های داشتن برنامه' : 'Ways to get a plan'} className="pricing-reel" ref={reelRef}>
          {offers.map((offer, index) => (
            <article className={`pricing-frame pricing-frame--${offer.tone}${offer.key === 'gift' && giftUnavailable ? ' is-exhausted' : ''}`} key={offer.key}>
              <div className="pricing-frame__copy">
                <p className="pricing-frame__index">{formatNumber(index + 1, locale, { minimumIntegerDigits: 2, useGrouping: false })}</p>
                <p className="pricing-frame__kicker">{offer.kicker}</p>
                <h2>{offer.title}</h2>
                <strong>{offer.price}</strong>
                <p className="pricing-frame__body">{offer.body}</p>
                <ul>
                  {offer.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
                <Link className={`orbit-button ${offer.primary ? 'orbit-button--primary' : 'orbit-button--secondary'}`} href={offer.href}>{offer.label}</Link>
              </div>
              <figure className="pricing-frame__photo">
                <img alt={offer.alt} decoding="async" loading={index === 0 ? 'eager' : 'lazy'} src={offer.image} />
              </figure>
            </article>
          ))}
        </section>

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
