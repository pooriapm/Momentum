import { ChevronRight, CircleUserRound, CreditCard, Download, FileClock, Info, Languages, LifeBuoy, LockKeyhole, LogOut, Mail, MoonStar, ShieldAlert, ShieldCheck, Sun, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { APP_CONFIG } from '../../../config/app'
import { runtimeConfig } from '../../../platform/config/runtime'
import { applyUiTheme, updateUiState } from '../../../lib/ui-state'
import { InstallExperienceCard } from '../../components/InstallExperienceCard'
import { ModalShell } from '../../components/ModalShell'
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
  const [view, setView] = useState<MePanel>(panel ?? 'hub')
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
    return <MembershipPanel locale={locale} onBack={() => setView('hub')} periodEnd={plan?.progress.entitlementPeriodEnd} preview={preview} status={status} />
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
  periodEnd,
  preview,
  status,
}: {
  locale: AppLocale
  onBack: () => void
  periodEnd?: string
  preview: boolean
  status: MembershipStatus
}) {
  const fa = locale === 'fa'
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
        {status === 'cancelled' || status === 'expired' ? <div className="inline-notice" role="status">{fa ? 'برنامه‌های قبلی خواندنی می‌مانند. چرخه بعد ساخته نمی‌شود.' : 'Previous plans stay readable. The next cycle is blocked.'}</div> : null}
        <div className="me-panel-card__actions">
          {checkout ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/pricing')}>{status === 'pending' ? (fa ? 'بازیابی پرداخت' : 'Recover payment') : (fa ? 'شروع عضویت' : 'Start membership')}</Link> : <Button disabled variant="secondary">{fa ? 'تمدید فعال است' : 'Renewal is active'}</Button>}
          <Link className="orbit-button orbit-button--secondary" href={`${localizedPath(locale, '/app/account')}${query}`}>{fa ? 'خروجی یا حذف' : 'Export or delete'}</Link>
        </div>
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
              <small>{supportEmail}</small>
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
  onClose,
  onSignOut,
}: {
  locale: AppLocale
  onClose: () => void
  onSignOut: (scope: SignOutScope) => Promise<void>
}) {
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
    <ModalShell className="me-signout-dialog" labelId="sign-out-title" material="content" onClose={onClose}>
      <header>
        <div>
          <p className="orbit-eyebrow"><LogOut size={15} />{fa ? 'خروج امن' : 'Secure sign out'}</p>
          <h2 id="sign-out-title">{fa ? 'از کجا خارج شوی؟' : 'Where should we sign you out?'}</h2>
        </div>
      </header>
      <p>{fa ? 'ثبت‌های همگام‌شده در حساب می‌مانند. Momentum داده سلامتی آفلاین را صف نمی‌کند.' : 'Synced entries stay in your account. Momentum does not queue health data while offline.'}</p>
      <div className="me-signout-choices">
        <button className={`me-signout-choice${scope === 'local' ? ' is-selected' : ''}`} onClick={() => setScope('local')} type="button">
          <strong>{fa ? 'فقط این دستگاه' : 'This device only'}</strong>
          <small>{fa ? 'نشست‌های دیگر فعال می‌مانند' : 'Other sessions remain active'}</small>
        </button>
        <button className={`me-signout-choice${scope === 'global' ? ' is-selected' : ''}`} onClick={() => setScope('global')} type="button">
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
