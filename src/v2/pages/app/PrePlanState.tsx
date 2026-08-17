import { ShieldAlert, Sparkles, UserRoundCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import type { AccountDashboardView } from '../../data/repository'
import { isEntitledForGeneration } from '../../entitlement'
import { requestPlanGeneration } from '../../onboarding/repository'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard } from '../../ui/primitives'
import { GenerationWait } from './GenerationWait'
import { TODAY_GENERATION_WAIT_MS } from './today-state'
import '../../../styles/today.css'

export function PrePlanState({ account, locale }: { account: AccountDashboardView; locale: AppLocale }) {
  const [generating, setGenerating] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState('')
  const generationKey = useRef(crypto.randomUUID())
  const fa = locale === 'fa'
  const started = account.onboardingStatus === 'started' || account.onboardingStatus === 'profile_complete'
  const blocked = account.onboardingStatus === 'automation_blocked' || account.aiPlanAccess.state === 'safety_blocked'
  const entitled = isEntitledForGeneration({
    aiPlanState: account.aiPlanAccess.state,
    automationBlocked: blocked,
    hasSavedPlan: Boolean(account.plan),
    membership: account.entitlementStatus ?? 'none',
    onboardingStatus: account.onboardingStatus,
  })
  const ready = account.onboardingStatus === 'complete' && account.aiPlanAccess.state === 'ready' && entitled

  useEffect(() => {
    if (!generating || timedOut) return
    const timer = window.setTimeout(() => setTimedOut(true), TODAY_GENERATION_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [generating, timedOut])

  async function generate() {
    setGenerating(true)
    setTimedOut(false)
    setError('')
    try {
      await requestPlanGeneration(locale, generationKey.current)
      window.location.reload()
    } catch (caught) {
      const stillProcessing = caught instanceof Error && caught.message === 'plan_generation_still_processing'
      if (stillProcessing) return
      setGenerating(false)
      setError(fa ? 'ساخت برنامه شروع نشد. وضعیت دسترسی یا اتصال را بررسی کن.' : 'Plan generation could not start. Check access and connectivity.')
    }
  }

  if (generating) {
    return (
      <GenerationWait
        error={error}
        locale={locale}
        onRetry={() => void generate()}
        timedOut={timedOut}
      />
    )
  }

  return (
    <main className="pre-plan-state screen-enter">
      <ContentCard>
        <span className="pre-plan-state__icon">{blocked ? <ShieldAlert size={28} /> : started ? <UserRoundCheck size={28} /> : <Sparkles size={28} />}</span>
        <h1>{started ? (fa ? 'اول شناختت را کامل کنیم' : 'Let’s finish your setup') : blocked ? (fa ? 'مسیر امن‌تر برای تو' : 'A safer path for you') : ready ? (fa ? 'آماده ساخت برنامه‌ای' : 'You are ready for a plan') : (fa ? 'حساب آماده است؛ دسترسی در انتظار تأیید' : 'Your account is ready; access is awaiting verification')}</h1>
        <p>{started ? (fa ? 'اطلاعات لازم هنوز کامل نشده است.' : 'Required profile information is not complete yet.') : blocked ? (fa ? 'برنامه‌ریزی خودکار برای شرایط ثبت‌شده مناسب نیست. Momentum می‌تواند فقط اطلاعات عمومی نشان دهد.' : 'Automated planning is not appropriate for the recorded health context. Momentum can only provide general information.') : ready ? (fa ? 'می‌توانی برنامه ماهانه را بسازی.' : 'You can generate your monthly plan.') : account.aiPlanAccess.state === 'disabled' ? (fa ? 'ساخت برنامه در این محیط توسط اپراتور متوقف است.' : 'Plan generation is currently disabled by the operator.') : (fa ? 'ساخت برنامه هنوز آماده نیست؛ کمی بعد دوباره تلاش کن.' : 'Plan generation is not ready yet; try again shortly.')}</p>
        {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
        {started ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/onboarding')}>{fa ? 'ادامه آنبوردینگ' : 'Continue onboarding'}</Link> : null}
        {ready ? <Button loading={generating} onClick={() => void generate()}><Sparkles size={18} />{fa ? 'ساخت برنامه' : 'Generate plan'}</Button> : null}
        {!started && !blocked && !entitled ? <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/me')}>{fa ? 'شروع عضویت' : 'Start membership'}</Link> : null}
        {!ready ? <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>{fa ? 'دیدن Preview' : 'View preview'}</Link> : null}
      </ContentCard>
    </main>
  )
}
