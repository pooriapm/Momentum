import { ChevronRight, CreditCard, Database, Globe2, Languages, LockKeyhole, LogOut, MoonStar, ShieldCheck, Sparkles, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { type MomentumPlanView, localize } from '../../data/types'
import { localizedPath, switchLocalePath } from '../../router/route-utils'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import { applyUiTheme, updateUiState } from '../../../lib/ui-state'
import { InstallExperienceCard } from '../../components/InstallExperienceCard'

export function MePage({ locale, plan, preview }: { locale: AppLocale; plan: MomentumPlanView | null; preview: boolean }) {
  const { t } = useTranslation()
  const [path] = useLocation()
  const search = useSearch()
  const { user, signOut } = useAuth()
  const [lightTheme, setLightTheme] = useState(() => document.documentElement.classList.contains('light'))
  const items = [
    [CreditCard, t('app.subscription'), plan?.progress.entitlementLabel ? localize(plan.progress.entitlementLabel, locale) : (preview ? 'Momentum Core' : 'Momentum'), localizedPath(locale, '/pricing')],
    [Globe2, t('app.region'), locale === 'fa' ? 'قیمت و دسترسی مستقل از زبان' : 'Pricing and access are separate from language', localizedPath(locale, '/pricing')],
    [ShieldCheck, t('app.privacy'), locale === 'fa' ? 'خروجی، نگهداری و حذف حساب' : 'Export, retention, and account deletion', `${localizedPath(locale, '/app/account')}${preview ? '?preview=1' : ''}`],
  ] as const
  const otherLocale: AppLocale = locale === 'fa' ? 'en' : 'fa'

  function toggleTheme() {
    const nextTheme = lightTheme ? 'dark' : 'light'
    applyUiTheme(nextTheme)
    updateUiState({ theme: nextTheme })
    setLightTheme(!lightTheme)
  }
  return (
    <main className="app-page me-page screen-enter">
      <section className="page-heading"><div><p className="orbit-eyebrow"><Sparkles size={15} />Your Momentum</p><h1>{t('nav.me')}</h1><p>{preview ? t('app.previewNotice') : user?.email}</p></div><StatusPill tone="brand">{plan?.progress.entitlementLabel ? localize(plan.progress.entitlementLabel, locale) : (preview ? 'Core' : 'Momentum')}</StatusPill></section>
      <div className="me-layout">
        <ContentCard className="profile-summary-card">
          <div className="profile-summary-card__avatar">{preview ? 'A' : user?.email?.slice(0, 1).toUpperCase()}</div>
          <div><h2>{plan ? localize(plan.userName, locale) : user?.email}</h2><p>{user?.created_at ? new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(user.created_at)) : (locale === 'fa' ? 'حساب نمایشی' : 'Preview account')}</p></div>
          <StatusPill tone="success"><LockKeyhole size={13} />Private</StatusPill>
          <dl><div><dt>{locale === 'fa' ? 'استراتژی' : 'Strategy'}</dt><dd>{plan ? localize(plan.targetStrategy, locale) : '—'}</dd></div><div><dt>{locale === 'fa' ? 'روند' : 'Streak'}</dt><dd>{plan?.progress.streak ?? 0}</dd></div><div><dt>{locale === 'fa' ? 'پایبندی' : 'Adherence'}</dt><dd>{plan?.progress.weeklyAdherence ?? 0}%</dd></div></dl>
        </ContentCard>
        <div className="settings-list">
          {items.map(([Icon, title, subtitle, href]) => (
            <ContentCard key={title}>
              <Link className="settings-link-button" href={href}><span className="settings-list__icon"><Icon size={20} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight className="directional-icon" size={18} /></Link>
            </ContentCard>
          ))}
          <ContentCard><button onClick={toggleTheme} type="button"><span className="settings-list__icon">{lightTheme ? <MoonStar size={20} /> : <Sun size={20} />}</span><span><strong>{lightTheme ? (locale === 'fa' ? 'حالت تیره' : 'Dark appearance') : (locale === 'fa' ? 'حالت روشن' : 'Light appearance')}</strong><small>{locale === 'fa' ? 'کنتراست و شفافیت با سیستم هماهنگ می‌شود' : 'Contrast and transparency remain system-aware'}</small></span><ChevronRight className="directional-icon" size={18} /></button></ContentCard>
          <ContentCard><Link className="settings-link-button" href={switchLocalePath(`${path}${search ? `?${search}` : ''}`, otherLocale)}><span className="settings-list__icon"><Languages size={20} /></span><span><strong>{otherLocale === 'fa' ? 'تغییر به فارسی' : 'Switch to English'}</strong><small>{locale === 'fa' ? 'زبان مستقل از قیمت و غذاهاست' : 'Language is independent from pricing and cuisine'}</small></span><ChevronRight className="directional-icon" size={18} /></Link></ContentCard>
        </div>
        <ContentCard className="data-promise-card"><Database size={23} /><div><h3>{locale === 'fa' ? 'داده‌ی سلامت، برای تبلیغ نیست' : 'Health data is never ad inventory'}</h3><p>{locale === 'fa' ? 'اطلاعات برنامه و بدن در دیتابیس حساب ذخیره می‌شود، نه در localStorage. فقط نشست ورود برای اتصال امن دستگاه نگهداری می‌شود.' : 'Plan and body data live in your account database, not localStorage. Only the authentication session is retained to connect this device securely.'}</p></div></ContentCard>
        <InstallExperienceCard locale={locale} />
        {!preview ? <Button onClick={() => void signOut()} variant="danger"><LogOut size={18} />{t('app.signOut')}</Button> : <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/auth/sign-up')}>{t('common.signUp')}</Link>}
      </div>
    </main>
  )
}
