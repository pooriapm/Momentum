import { CreditCard, Gift, ShieldAlert, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, StatusPill } from '../../ui/primitives'
import { PAYMENTS_LIVE, paywallInventoryId, type EntitlementSnapshot } from '../../entitlement'
import '../../entitlement/entitlement.css'

export function EntitlementGate({ locale, snapshot }: { locale: AppLocale; snapshot: EntitlementSnapshot }) {
  const { t } = useTranslation()
  const fa = locale === 'fa'
  const id = paywallInventoryId(snapshot)
  const copy = gateCopy(id, fa)
  const Icon = id === 'LIFE-07' ? ShieldAlert : id === 'LIFE-05' ? Gift : id === 'LIFE-10' ? CreditCard : WalletCards
  const membershipHref = localizedPath(locale, '/app/me')
  const pricingHref = localizedPath(locale, '/pricing')
  const onboardingHref = localizedPath(locale, '/onboarding')
  const primaryHref = snapshot.onboardingStatus !== 'complete' ? onboardingHref : membershipHref
  const primaryLabel = snapshot.onboardingStatus !== 'complete'
    ? t('entitlement.continueSetup')
    : id === 'LIFE-10' ? t('entitlement.recover') : t('entitlement.startMembership')

  return (
    <main className="entitlement-gate screen-enter" data-inventory={id}>
      <ContentCard>
        <span className="entitlement-gate__icon"><Icon size={28} /></span>
        <StatusPill tone={copy.tone}>{copy.eyebrow}</StatusPill>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="inline-notice" role="status">{t('entitlement.oneSku')} {t('entitlement.notTrial')}</div>
        <div className="inline-notice" role="note">{t('entitlement.generationBlocked')}</div>
        {!PAYMENTS_LIVE ? <div className="inline-notice" role="note">{t('entitlement.paymentsNotLive')}</div> : null}
        <div className="entitlement-gate__actions">
          <Link className="orbit-button orbit-button--primary" href={primaryHref}>{primaryLabel}</Link>
          <Link className="orbit-button orbit-button--secondary" href={pricingHref}>{t('entitlement.viewPricing')}</Link>
        </div>
      </ContentCard>
    </main>
  )
}

function gateCopy(id: ReturnType<typeof paywallInventoryId>, fa: boolean) {
  if (id === 'LIFE-07') {
    return {
      tone: 'energy' as const,
      eyebrow: fa ? 'ایمنی' : 'Safety',
      title: fa ? 'ساخت خودکار برنامه متوقف شد' : 'Automatic planning is paused',
      body: fa
        ? 'پاسخ سلامتی نیاز به بررسی خارج از این سرویس دارد. هیچ درخواست ماهانه‌ای مصرف نشده است.'
        : 'A health answer requires review outside this service. No monthly generation request has been consumed.',
    }
  }
  if (id === 'LIFE-05') {
    return {
      tone: 'neutral' as const,
      eyebrow: fa ? 'هدیه برنامه اول' : 'First-plan gift',
      title: fa ? 'بودجه هدیه فعلاً تمام شده' : 'The gift budget is currently exhausted',
      body: fa
        ? 'هدیه برنامه اول تضمینی یا دائمی نیست. برای ساخت برنامه، عضویت واحد لازم است. رزروهای قبلی باطل نمی‌شوند.'
        : 'The first-plan gift is not permanent or guaranteed. The single membership is required to create a plan. Earlier reservations are not revoked.',
    }
  }
  if (id === 'LIFE-10') {
    return {
      tone: 'energy' as const,
      eyebrow: fa ? 'پرداخت در انتظار' : 'Payment pending',
      title: fa ? 'پرداخت را بازیابی کن' : 'Recover payment to continue',
      body: fa
        ? 'تا تعیین وضعیت عضویت، ساخت دوره بعد شروع نمی‌شود و برنامه‌های قبلی قابل مشاهده می‌مانند.'
        : 'The next plan cannot start until membership resolves; past plans remain readable.',
    }
  }
  if (id === 'LIFE-11') {
    return {
      tone: 'neutral' as const,
      eyebrow: fa ? 'عضویت غیرفعال' : 'Membership inactive',
      title: fa ? 'عضویت برای چرخه بعد لازم است' : 'Membership is required for the next cycle',
      body: fa
        ? 'برنامه‌های قبلی خواندنی می‌مانند. چرخه بعد ساخته نمی‌شود.'
        : 'Previous plans stay readable. The next cycle is blocked.',
    }
  }
  if (id === 'LIFE-17') {
    return {
      tone: 'energy' as const,
      eyebrow: fa ? 'اطلاعات تکمیلی' : 'More information needed',
      title: fa ? 'پیش از شروع یک مورد را اصلاح کن' : 'Fix one item before generation',
      body: fa
        ? 'روش پرداخت ثبت نشده است. ایمیل، روش پرداخت و کشور صورتحساب فیلدهای جدا هستند.'
        : 'A payment method is missing. Email, payment method, and billing country are distinct named fields.',
    }
  }
  return {
    tone: 'brand' as const,
    eyebrow: fa ? 'عضویت Momentum' : 'Momentum membership',
    title: fa ? 'روش پرداخت را اضافه کن یا عضو شو' : 'Add a payment method, or subscribe',
    body: fa
      ? 'برای دریافت هدیه برنامه اول روش پرداخت ثبت کن، یا همان یک اشتراک Momentum را شروع کن. کارت تا چرخه دوم شارژ نمی‌شود.'
      : 'Add a card to receive the first-plan gift, or start the one Momentum membership. The card is not charged until cycle 2.',
  }
}
