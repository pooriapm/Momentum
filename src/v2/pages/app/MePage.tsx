import { useModalDismiss } from '../../components/use-modal-dismiss'
import { ChevronRight, CircleUserRound, CreditCard, Download, FileClock, Info, Languages, LifeBuoy, LockKeyhole, LogOut, Mail, MoonStar, ShieldAlert, ShieldCheck, Sun, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { APP_CONFIG } from '../../../config/app'
import { runtimeConfig } from '../../../platform/config/runtime'
import { applyUiTheme, updateUiState } from '../../../lib/ui-state'
import { InstallExperienceCard } from '../../components/InstallExperienceCard'
import { ModalShell } from '../../components/ModalShell'
import { loadLatestCardPayment, paymentResultFromSearch, registerMembershipInterest, type LatestPayment, type PaymentResult } from '../../data/payments'
import { CardTransferPanel } from './CardTransferPanel'
import { PAYMENTS_LIVE } from '../../entitlement'
import { type MomentumPlanView, localize } from '../../data/types'
import { localizedPath, switchLocalePath } from '../../router/route-utils'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import {
  deriveMembershipStatus,
  membershipCopy,
  SUPPORT_ISSUE_CODES,
  supportMailtoHref,
  type MePanel,
  type MembershipStatus,
  type SignOutScope,
} from './me-state'
import '../../../styles/me.css'

export function MePage({
  locale,
  plan,
  preview,
  panel,
  membershipStatus,
}: {
  locale: AppLocale
  plan: MomentumPlanView | null
  preview: boolean
  panel?: MePanel
  membershipStatus?: MembershipStatus
}) {
  const { t } = useTranslation()
  const [path] = useLocation()
  const search = useSearch()
  const { user, signOut } = useAuth()
  const [lightTheme, setLightTheme] = useState(() => document.documentElement.classList.contains('light'))
  const paymentResult = paymentResultFromSearch(search)
  const [view, setView] = useState<MePanel>(panel ?? (paymentResult ? 'subscription' : 'hub'))
  const [signOutOpen, setSignOutOpen] = useState(false)
  const otherLocale: AppLocale = locale === 'fa' ? 'en' : 'fa'
  const query = preview ? '?preview=1' : ''
  const name = plan ? localize(plan.userName, locale) : (user?.email ?? t('nav.me'))
  const status = membershipStatus ?? deriveMembershipStatus(plan)
  const membership = membershipCopy(status, locale)

  function toggleTheme() {
    const nextTheme = lightTheme ? 'dark' : 'light'
    applyUiTheme(nextTheme)
    updateUiState({ theme: nextTheme })
    setLightTheme(!lightTheme)
  }

  if (view === 'subscription') {
    return <MembershipPanel locale={locale} onBack={() => setView('hub')} paymentResult={paymentResult} periodEnd={plan?.progress.entitlementPeriodEnd} preview={preview} productRegion={plan?.progress.productRegion} status={status} />
  }

  if (view === 'help') {
    return <HelpPanel locale={locale} onBack={() => setView('hub')} />
  }

  return (
    <main className="app-page me-page screen-enter">
      {plan?.progress.safetyPaused ? (
        <div className="inline-notice me-safety-note" role="status">
          {locale === 'fa' ? 'تمرین فعلاً متوقف است. هیچ فشاری برای حفظ روند متوالی نیست.' : 'Training is paused for now. There is no pressure to keep a streak.'}
        </div>
      ) : null}
      <header className="me-identity">
        <div aria-hidden="true" className="me-identity__avatar">{preview ? 'A' : (user?.email?.slice(0, 1).toUpperCase() ?? 'M')}</div>
        <div>
          <h1>{name}</h1>
          <p>{preview ? (locale === 'fa' ? 'نمایش آزمایشی' : 'Preview') : user?.email}</p>
        </div>
      </header>

      <nav aria-label={locale === 'fa' ? 'حساب' : 'Account'} className="me-group">
        <Link className="me-row" href={`${localizedPath(locale, '/app/settings')}${query}`}>
          <span className="me-row__icon"><CircleUserRound size={18} /></span>
          <span className="me-row__label">{t('app.profile')}</span>
          <ChevronRight className="directional-icon" size={18} />
        </Link>
        <button className="me-row" onClick={() => setView('subscription')} type="button">
          <span className="me-row__icon"><CreditCard size={18} /></span>
          <span className="me-row__label">{t('app.subscription')}</span>
          <span className="me-row__meta">{membership.label}</span>
          <ChevronRight className="directional-icon" size={18} />
        </button>
        <Link className="me-row" href={`${localizedPath(locale, '/app/account')}${query}`}>
          <span className="me-row__icon"><Download size={18} /></span>
          <span className="me-row__label">{t('app.privacy')}</span>
          <ChevronRight className="directional-icon" size={18} />
        </Link>
        <button className="me-row" onClick={toggleTheme} type="button">
          <span className="me-row__icon">{lightTheme ? <MoonStar size={18} /> : <Sun size={18} />}</span>
          <span className="me-row__label">{lightTheme ? (locale === 'fa' ? 'حالت تیره' : 'Dark appearance') : (locale === 'fa' ? 'حالت روشن' : 'Light appearance')}</span>
        </button>
        <Link className="me-row" href={switchLocalePath(`${path}${search ? `?${search}` : ''}`, otherLocale)}>
          <span className="me-row__icon"><Languages size={18} /></span>
          <span className="me-row__label">{otherLocale === 'fa' ? 'فارسی' : 'English'}</span>
          <ChevronRight className="directional-icon" size={18} />
        </Link>
        <button className="me-row" onClick={() => setView('help')} type="button">
          <span className="me-row__icon"><LifeBuoy size={18} /></span>
          <span className="me-row__label">{t('app.help')}</span>
          <ChevronRight className="directional-icon" size={18} />
        </button>
        <InstallExperienceCard locale={locale} />
      </nav>

      <div className="me-footer">
        <p className="me-version"><Info size={14} />{APP_CONFIG.name} v{APP_CONFIG.version}</p>
        {!preview
          ? <Button onClick={() => setSignOutOpen(true)} variant="ghost"><LogOut size={18} />{t('app.signOut')}</Button>
          : <Link className="orbit-button orbit-button--ghost" href={localizedPath(locale, '/auth/sign-up')}>{t('common.signUp')}</Link>}
      </div>
      {signOutOpen ? <SignOutDialog locale={locale} onClose={() => setSignOutOpen(false)} onSignOut={(scope) => signOut({ scope })} /> : null}
    </main>
  )
}

function MembershipPanel({
  locale,
  onBack,
  paymentResult,
  periodEnd,
  preview,
  productRegion,
  status,
}: {
  locale: AppLocale
  onBack: () => void
  paymentResult?: PaymentResult | null
  periodEnd?: string
  preview: boolean
  productRegion?: 'ir' | 'intl'
  status: MembershipStatus
}) {
  const fa = locale === 'fa'
  const { user } = useAuth()
  // The website serves everyone. Iranian members pay by card-to-card with a receipt that
  // is reviewed by hand; members outside Iran cannot pay yet and can ask to hear later.
  const cardTransfer = PAYMENTS_LIVE && productRegion === 'ir'
  const notifyAbroad = productRegion === 'intl'
  const [cardOpen, setCardOpen] = useState(false)
  const [latestCard, setLatestCard] = useState<LatestPayment>(null)
  const [interest, setInterest] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  useEffect(() => {
    if (!cardTransfer || preview || !user?.id) return
    let active = true
    loadLatestCardPayment(user.id)
      .then((value) => { if (active) setLatestCard(value) })
      .catch(() => undefined)
    return () => { active = false }
  }, [cardTransfer, preview, user?.id])
  const receiptInReview = latestCard?.status === 'pending'
  async function askToHear() {
    if (preview || interest === 'saving' || interest === 'saved') return
    setInterest('saving')
    try {
      await registerMembershipInterest()
      setInterest('saved')
    } catch {
      setInterest('failed')
    }
  }
  const copy = membershipCopy(status, locale)
  const query = preview ? '?preview=1' : ''
  const checkout = status === 'gift' || status === 'none' || status === 'cancelled' || status === 'expired' || status === 'pending'
  const tone = status === 'active' ? 'success' : status === 'pending' ? 'energy' : status === 'gift' ? 'brand' : 'neutral'
  return (
    <main className="app-page me-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><WalletCards size={15} />{fa ? 'یک اشتراک' : 'One membership'}</p>
          <h1>{copy.label}</h1>
          <p>{copy.detail}</p>
        </div>
        <Button onClick={onBack} variant="secondary">{fa ? 'بازگشت' : 'Back to Me'}</Button>
      </section>
      <ContentCard className="me-panel-card">
        <StatusPill tone={tone}>{status === 'active' ? (fa ? 'فعال' : 'Active') : copy.label}</StatusPill>
        <h2>{tMembershipTitle(status, fa)}</h2>
        <p>{periodEnd
          ? (fa ? `مرز بعدی واجد شرایط: ${periodEnd}` : `Next eligible boundary: ${periodEnd}`)
          : (fa ? 'فقط یک اشتراک Momentum وجود دارد؛ نردبان چندسطحی نیست.' : 'There is one Momentum membership. Dual plans are not offered.')}</p>
        {status === 'pending' ? <div className="inline-notice inline-notice--warning" role="status">{fa ? 'پرداخت در انتظار است. ساخت برنامه جدید شروع نمی‌شود.' : 'Payment is pending. A new plan will not start.'}</div> : null}
        {paymentResult === 'success' ? <div className="inline-notice inline-notice--success" role="status">{fa ? 'پرداخت تأیید شد و عضویت ۳۰ روزه فعال شد.' : 'Payment confirmed. Your 30-day membership is active.'}</div> : null}
        {paymentResult === 'cancelled' ? <div className="inline-notice" role="status">{fa ? 'پرداخت لغو شد و مبلغی کم نشد.' : 'Payment was cancelled. You were not charged.'}</div> : null}
        {paymentResult === 'failed' ? <div className="inline-notice inline-notice--warning" role="status">{fa ? 'پرداخت تأیید نشد. اگر مبلغی کم شده باشد، بانک آن را حداکثر تا ۷۲ ساعت برمی‌گرداند.' : 'The payment was not confirmed. If money was taken, the bank returns it within 72 hours.'}</div> : null}
        {receiptInReview ? <div className="inline-notice" role="status">{fa ? 'رسید کارت به کارتت دریافت شد و در حال بررسی است. حداکثر تا ۲۴ ساعت عضویتت فعال می‌شود.' : 'We received your card transfer receipt and are reviewing it. Your membership starts within 24 hours.'}</div> : null}
        {latestCard?.status === 'failed' && latestCard.failure_code === 'card_rejected' ? <div className="inline-notice inline-notice--warning" role="status">{fa ? 'رسید قبلی تأیید نشد. اگر فکر می‌کنی اشتباهی شده، با پشتیبانی تماس بگیر.' : 'Your last receipt was not approved. If you think this is a mistake, contact support.'}</div> : null}
        {notifyAbroad ? <div className="inline-notice" role="status">{interest === 'saved'
          ? (fa ? 'ثبت شد. وقتی عضویت برای کشورت باز شد خبرت می‌کنیم.' : 'Saved. We will let you know when membership opens in your country.')
          : (fa ? 'پرداخت عضویت برای کشورت هنوز باز نشده. مسیر رایگان در دسترس است.' : 'Membership payment is not open in your country yet. The free path is available.')}</div> : null}
        {interest === 'failed' ? <div className="inline-notice inline-notice--error" role="alert">{fa ? 'درخواست ثبت نشد. دوباره تلاش کن.' : 'Your request was not saved. Try again.'}</div> : null}
        {status === 'cancelled' || status === 'expired' ? <div className="inline-notice" role="status">{fa ? 'برنامه‌های قبلی خواندنی می‌مانند. چرخه بعد ساخته نمی‌شود.' : 'Previous plans stay readable. The next cycle is blocked.'}</div> : null}
        <div className="me-panel-card__actions">
          {cardTransfer && !receiptInReview && !cardOpen ? <Button disabled={preview} onClick={() => setCardOpen(true)}>{status === 'active' ? (fa ? 'تمدید ۳۰ روز با کارت به کارت' : 'Extend 30 days by card transfer') : (fa ? 'پرداخت کارت به کارت' : 'Pay by card transfer')}</Button> : notifyAbroad ? <Button disabled={preview || interest === 'saved'} loading={interest === 'saving'} onClick={() => void askToHear()}>{interest === 'saved' ? (fa ? 'خبرت می‌کنیم' : 'We will let you know') : (fa ? 'وقتی باز شد خبرم کن' : 'Notify me when it opens')}</Button> : cardTransfer ? null : checkout ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/pricing')}>{status === 'pending' ? (fa ? 'بازیابی پرداخت' : 'Recover payment') : (fa ? 'شروع عضویت' : 'Start membership')}</Link> : <StatusPill tone="success">{fa ? 'عضویت فعال' : 'Membership active'}</StatusPill>}
          <Link className="orbit-button orbit-button--secondary" href={`${localizedPath(locale, '/app/account')}${query}`}>{fa ? 'خروجی یا حذف' : 'Export or delete'}</Link>
        </div>
        {cardOpen ? (
          <CardTransferPanel
            locale={locale}
            onCancel={() => setCardOpen(false)}
            onSubmitted={() => {
              setCardOpen(false)
              setLatestCard({ provider: 'card_transfer', status: 'pending', failure_code: null, created_at: new Date().toISOString() })
            }}
            preview={preview}
            userId={user?.id}
          />
        ) : null}
      </ContentCard>
      <ContentCard className="me-panel-card">
        <div className="section-title-row"><h2>{fa ? 'تاریخچه برنامه‌ها' : 'Plan history'}</h2><FileClock size={18} /></div>
        <ul className="me-help-list">
          <li className="me-row me-row--static"><span className="me-row__icon"><FileClock size={18} /></span><span className="me-row__copy"><span className="me-row__label">{fa ? 'دوره جاری' : 'Current period'}</span><small>{fa ? 'نسخه فعال · فقط‌خواندنی پس از پایان' : 'Active version · read-only after it ends'}</small></span><span className="me-row__meta">{fa ? 'فعال' : 'Active'}</span></li>
        </ul>
      </ContentCard>
    </main>
  )
}

function tMembershipTitle(status: MembershipStatus, fa: boolean) {
  if (status === 'gift') return fa ? 'هدیه، برنامه کامل ۳۰روزه ماه اول است' : 'The gift is the complete 30-day plan for your first month'
  if (status === 'pending') return fa ? 'پرداخت را بازیابی کن' : 'Recover payment to continue'
  if (status === 'cancelled' || status === 'expired') return fa ? 'عضویت برای چرخه بعد لازم است' : 'Membership is required for the next cycle'
  if (status === 'none') return fa ? 'روش پرداخت را اضافه کن یا عضو شو' : 'Add a payment method, or subscribe'
  return fa ? 'عضویت Momentum' : 'Momentum membership'
}

function HelpPanel({ locale, onBack }: { locale: AppLocale; onBack: () => void }) {
  const fa = locale === 'fa'
  const supportEmail = runtimeConfig.supportEmail
  const supportMailto = supportEmail ? supportMailtoHref(supportEmail, locale) : ''
  return (
    <main className="app-page me-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><LifeBuoy size={15} />{fa ? 'پشتیبانی' : 'Support'}</p>
          <h1>{fa ? 'راهنما، ایمنی و قوانین' : 'Help, safety & legal'}</h1>
          <p>{fa ? 'مرز سلامت عمومی، حریم خصوصی و شرایط استفاده از همین‌جا در دسترس است.' : 'The general-wellness boundary, privacy, and terms stay reachable from here.'}</p>
        </div>
        <Button onClick={onBack} variant="secondary">{fa ? 'بازگشت' : 'Back to Me'}</Button>
      </section>
      <nav aria-label={fa ? 'راهنما' : 'Help'} className="me-group">
        <Link className="me-row" href={localizedPath(locale, '/safety')}><span className="me-row__icon"><ShieldAlert size={18} /></span><span className="me-row__copy"><span className="me-row__label">{fa ? 'راهنمای ایمنی' : 'Safety guidance'}</span><small>{fa ? 'چه زمانی تمرین را متوقف کنی' : 'When to stop exercising'}</small></span><ChevronRight className="directional-icon" size={18} /></Link>
        <Link className="me-row" href={localizedPath(locale, '/privacy')}><span className="me-row__icon"><LockKeyhole size={18} /></span><span className="me-row__copy"><span className="me-row__label">{fa ? 'حریم خصوصی' : 'Privacy'}</span><small>{fa ? 'خروجی، حذف و نگه‌داری داده' : 'Export, deletion, and retention'}</small></span><ChevronRight className="directional-icon" size={18} /></Link>
        <Link className="me-row" href={localizedPath(locale, '/terms')}><span className="me-row__icon"><ShieldCheck size={18} /></span><span className="me-row__copy"><span className="me-row__label">{fa ? 'شرایط استفاده' : 'Terms'}</span><small>{fa ? 'محدوده سرویس' : 'Service scope'}</small></span><ChevronRight className="directional-icon" size={18} /></Link>
        {supportEmail ? (
          <a className="me-row" href={supportMailto}>
            <span className="me-row__icon"><Mail size={18} /></span>
            <span className="me-row__copy">
              <span className="me-row__label">{fa ? 'ایمیل پشتیبانی' : 'Email support'}</span>
              <small><bdi>{supportEmail}</bdi></small>
            </span>
          </a>
        ) : null}
      </nav>
      <section aria-label={fa ? 'کدهای پشتیبانی' : 'Support codes'} className="me-panel-card">
        <h2>{fa ? 'کد موضوع را در ایمیل بنویس' : 'Put the issue code in the email'}</h2>
        <p>{fa ? 'پاسخ هدف در صورت فعال بودن صندوق، تا ۲۴ ساعت است. کد را بنویسید؛ متن سلامت، رمز یا JSON برنامه لازم نیست.' : 'When a mailbox is staffed, the reply target is 24 hours. Send the code; health text, passwords, or plan JSON are not required.'}</p>
        <ul className="me-support-codes">
          {SUPPORT_ISSUE_CODES.map((issue) => (
            <li key={issue.id}>
              {supportEmail ? (
                <a href={supportMailtoHref(supportEmail, locale, issue.id)}>{issue.id}</a>
              ) : (
                <code>{issue.id}</code>
              )}
              <span>{fa ? issue.fa : issue.en}</span>
            </li>
          ))}
        </ul>
      </section>
      {supportEmail
        ? <div className="inline-notice" role="note">{fa ? 'جزئیات سلامت، رمز عبور یا JSON برنامه را در ایمیل نفرستید.' : 'Do not send health details, passwords, or plan JSON.'}</div>
        : <div className="inline-notice" role="status">{fa ? 'دعوت عمومی تا وقتی اپراتور نشانی پشتیبانی را تنظیم کند در انتظار می‌ماند.' : 'Public invite waits until the operator sets the support address.'}</div>}
      <div className="inline-notice inline-notice--warning" role="note">{fa ? 'Momentum سرویس اورژانسی نیست. اگر علائم شدید یا ناگهانی داری با اورژانس محلی یا متخصص واجد صلاحیت تماس بگیر.' : 'Momentum is not an emergency service. If symptoms are severe or sudden, contact local emergency services or a qualified clinician.'}</div>
    </main>
  )
}

function SignOutDialog({
  locale,
  onClose: onDismiss,
  onSignOut,
}: {
  locale: AppLocale
  onClose: () => void
  onSignOut: (scope: SignOutScope) => Promise<void>
}) {
  const { modalRef, onClose } = useModalDismiss(onDismiss)
  const fa = locale === 'fa'
  const [scope, setScope] = useState<SignOutScope>('local')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setSaving(true)
    setError('')
    try {
      await onSignOut(scope)
      onClose()
    } catch {
      setError(fa ? 'خروج انجام نشد. نشست فعلی فعال می‌ماند. کد SIGNOUT-17' : 'Sign-out failed. This session stays active. Reference SIGNOUT-17')
      setSaving(false)
    }
  }

  return (
    <ModalShell className="me-signout-dialog" labelId="sign-out-title" material="content" onClose={onDismiss} ref={modalRef}>
      <header>
        <div>
          <p className="orbit-eyebrow"><LogOut size={15} />{fa ? 'خروج امن' : 'Secure sign out'}</p>
          <h2 id="sign-out-title">{fa ? 'از کجا خارج شوی؟' : 'Where should we sign you out?'}</h2>
        </div>
      </header>
      <p>{fa ? 'ثبت‌های همگام‌شده در حساب می‌مانند. Momentum داده سلامتی آفلاین را صف نمی‌کند.' : 'Synced entries stay in your account. Momentum does not queue health data while offline.'}</p>
      <div className="me-signout-choices">
        <button aria-pressed={scope === 'local'} className={`me-signout-choice${scope === 'local' ? ' is-selected' : ''}`} onClick={() => setScope('local')} type="button">
          <strong>{fa ? 'فقط این دستگاه' : 'This device only'}</strong>
          <small>{fa ? 'نشست‌های دیگر فعال می‌مانند' : 'Other sessions remain active'}</small>
        </button>
        <button aria-pressed={scope === 'global'} className={`me-signout-choice${scope === 'global' ? ' is-selected' : ''}`} onClick={() => setScope('global')} type="button">
          <strong>{fa ? 'همه دستگاه‌ها' : 'All devices'}</strong>
          <small>{fa ? 'تمام نشست‌های فعال باطل می‌شوند' : 'Every active session is revoked'}</small>
        </button>
      </div>
      {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
      <div className="me-panel-card__actions">
        <Button onClick={onClose} variant="secondary">{fa ? 'انصراف' : 'Cancel'}</Button>
        <Button loading={saving} onClick={() => void confirm()} variant="danger">{fa ? 'خروج از دستگاه انتخابی' : 'Sign out selected devices'}</Button>
      </div>
    </ModalShell>
  )
}
