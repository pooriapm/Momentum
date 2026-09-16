import { ShieldAlert, Sparkles, UserRoundCheck } from 'lucide-react'
import { Link } from 'wouter'
import { resources, type AppLocale } from '../../../platform/i18n/catalog'
import type { AccountDashboardView } from '../../data/repository'
import { isEntitledForGeneration } from '../../entitlement'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard } from '../../ui/primitives'
import { GenerationWait } from './GenerationWait'
import { useGenerationWait } from './use-generation-wait'
import { useOnlineStatus } from '../../../platform/pwa/network'
import '../../../styles/today.css'

export function PrePlanState({ account, locale }: { account: AccountDashboardView; locale: AppLocale }) {
  const online = useOnlineStatus()
  const wait = useGenerationWait(locale, Boolean(account.plan))
  const fa = locale === 'fa'
  const copy = resources[locale].translation.app
  const started = account.onboardingStatus === 'started' || account.onboardingStatus === 'profile_complete'
  const blocked = account.onboardingStatus === 'automation_blocked' || account.aiPlanAccess.state === 'safety_blocked'
  const entitled = isEntitledForGeneration({
    aiPlanState: account.aiPlanAccess.state,
    automationBlocked: blocked,
    hasSavedPlan: Boolean(account.plan),
    membership: account.entitlementStatus ?? 'none',
    onboardingStatus: account.onboardingStatus,
  })
  const giftCandidate = account.planSourcePreference === 'momentum' && account.entitlementStatus === 'none'
  const ready = account.onboardingStatus === 'complete' && account.aiPlanAccess.state === 'ready' && (entitled || giftCandidate)
  const external = account.onboardingStatus === 'complete' && account.planSourcePreference === 'external' && !blocked

  if (wait.session) {
    return (
      <GenerationWait
        failure={wait.session.failure}
        hasPriorPlan={wait.session.hasPriorPlan}
        locale={locale}
        onRetry={() => wait.retry()}
        onTimeout={() => wait.markTimeout()}
        online={online}
        phase={wait.session.phase}
        startedAt={wait.session.startedAt}
      />
    )
  }

  return (
    <main className="pre-plan-state screen-enter">
      <ContentCard>
        <span className="pre-plan-state__icon">{blocked ? <ShieldAlert size={28} /> : started ? <UserRoundCheck size={28} /> : <Sparkles size={28} />}</span>
        <h1>{started ? (fa ? 'اول شناختت را کامل کنیم' : 'Let’s finish your setup') : blocked ? (fa ? 'مسیر امن‌تر برای تو' : 'A safer path for you') : external ? (fa ? 'برنامه‌ات را رایگان وارد کن' : 'Import your plan for free') : ready ? (fa ? 'آماده ساخت برنامه‌ای' : 'You are ready for a plan') : (fa ? 'حساب آماده است؛ دسترسی در انتظار تأیید' : 'Your account is ready; access is awaiting verification')}</h1>
        <p>{started ? (fa ? 'اطلاعات لازم هنوز کامل نشده است.' : 'Required profile information is not complete yet.') : blocked ? (fa ? 'برنامه‌ریزی خودکار برای شرایط ثبت‌شده مناسب نیست. Momentum می‌تواند فقط اطلاعات عمومی نشان دهد.' : 'Automated planning is not appropriate for the recorded health context. Momentum can only provide general information.') : external ? (fa ? 'از پرامپت آماده Momentum در ابزار دلخواهت استفاده کن یا فایل برنامه موجود را وارد کن. اشتراک لازم نیست.' : 'Use Momentum’s ready prompt in a tool you choose, or import an existing plan. No subscription is required.') : ready ? (fa ? 'می‌توانی برنامه ماهانه را بسازی.' : 'You can generate your monthly plan.') : account.aiPlanAccess.state === 'disabled' ? (fa ? 'ساخت برنامه در این محیط توسط اپراتور متوقف است.' : 'Plan generation is currently disabled by the operator.') : (fa ? 'ساخت برنامه هنوز آماده نیست؛ کمی بعد دوباره تلاش کن.' : 'Plan generation is not ready yet; try again shortly.')}</p>
        {started ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/onboarding')}>{fa ? 'ادامه آنبوردینگ' : 'Continue onboarding'}</Link> : null}
        {ready ? (
          <>
            <div className="inline-notice" role="status">
              {account.entitlementStatus === 'gift'
                ? (fa ? 'هدیه برنامه برای حسابت رزرو شده است و برای این دوره اطلاعات پرداخت لازم نیست.' : 'A plan gift is reserved for your account. No payment details are required for this cycle.')
                : giftCandidate
                ? (fa ? 'واجد شرایط بودن و موجودی هدیه هنگام شروع بررسی می‌شود؛ هدیه فقط پس از رزرو موفق قطعی است.' : 'Gift eligibility and availability are checked when you start. The gift is confirmed only after a successful reservation.')
                : `${copy.paymentRequiredBody} ${copy.paymentRequiredNote}`}
            </div>
            {!online ? <div className="inline-notice inline-notice--warning" role="status">{fa ? 'برای ساخت برنامه دوباره آنلاین شو.' : 'Reconnect to generate your plan.'}</div> : null}
            <Button disabled={!online} onClick={() => wait.start()}><Sparkles size={18} />{fa ? 'ساخت برنامه' : 'Generate plan'}</Button>
            <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/onboarding/review')}>{fa ? 'بازبینی پاسخ‌ها' : 'Review answers'}</Link>
            {account.entitlementStatus !== 'gift' ? <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/me')}>{copy.openMembership}</Link> : null}
          </>
        ) : null}
        {external ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/import-plan')}>{fa ? 'ساخت یا واردکردن برنامه' : 'Create or import a plan'}</Link> : null}
        {!started && !blocked && !entitled && !external && !ready ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/me')}>{fa ? 'شروع عضویت' : 'Start membership'}</Link> : null}
        {!ready ? <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>{fa ? 'دیدن Preview' : 'View preview'}</Link> : null}
      </ContentCard>
    </main>
  )
}
