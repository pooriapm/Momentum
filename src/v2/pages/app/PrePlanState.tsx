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
  const giftReady = account.planSourcePreference === 'momentum' && account.entitlementStatus === 'none'
  const ready = account.onboardingStatus === 'complete' && account.aiPlanAccess.state === 'ready' && (entitled || giftReady)
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
              {giftReady ? (fa ? 'برنامه اول هدیه است و برای شروع به اطلاعات پرداخت نیاز ندارد.' : 'Your first plan is a gift. No payment details are required to start.') : `${copy.paymentRequiredBody} ${copy.paymentRequiredNote}`}
            </div>
            <Button onClick={() => wait.start()}><Sparkles size={18} />{fa ? 'ساخت برنامه' : 'Generate plan'}</Button>
            <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/me')}>{copy.openMembership}</Link>
          </>
        ) : null}
        {external ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/import-plan')}>{fa ? 'ساخت یا واردکردن برنامه' : 'Create or import a plan'}</Link> : null}
        {!started && !blocked && !entitled && !external ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/me')}>{fa ? 'شروع عضویت' : 'Start membership'}</Link> : null}
        {!ready ? <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>{fa ? 'دیدن Preview' : 'View preview'}</Link> : null}
      </ContentCard>
    </main>
  )
}
