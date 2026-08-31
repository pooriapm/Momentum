import { LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import { resources, type AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard } from '../../ui/primitives'
import {
  type GenerationWaitFailure,
  type GenerationWaitPhase,
  waitHasTimedOut,
  waitInventoryId,
} from './generation-wait'
import { TODAY_GENERATION_WAIT_MS, generationWaitLines } from './today-state'
import '../../../styles/today.css'

const phaseEyebrow = {
  queued: { fa: 'یک برنامه برای یک ماه · در صف', en: 'One plan for one month · queued' },
  generating: { fa: 'یک برنامه برای یک ماه · در حال ساخت', en: 'One plan for one month · creating' },
  validating: { fa: 'یک برنامه برای یک ماه · بررسی ایمنی', en: 'One plan for one month · safety check' },
  importing: { fa: 'یک برنامه برای یک ماه · ورود به حساب', en: 'One plan for one month · importing' },
  ready: { fa: 'یک برنامه برای یک ماه · آماده', en: 'One plan for one month · ready' },
} as const

function failureCopy(locale: AppLocale, failure: GenerationWaitFailure, hasPriorPlan: boolean) {
  const fa = locale === 'fa'
  const prior = hasPriorPlan
    ? (fa ? 'اگر برنامه قبلی داری، همان نسخه فعال و خواندنی می‌ماند.' : 'If you already have a plan, that version stays active and readable.')
    : ''
  if (failure === 'timeout') {
    return {
      title: fa ? 'برنامه هنوز آماده نشد' : 'The plan is not ready yet',
      body: fa
        ? `بعد از ۳ دقیقه هنوز آماده نیست. گیر نکرده‌ای. می‌توانی دوباره درخواست بدهی؛ اگر همان کار در صف باشد وضعیت خوانده می‌شود، فراخوانی دوم ساخته نمی‌شود. ${prior}`
        : `It is still not ready after 3 minutes. You are not stuck. You can request again; if the same job is still queued, that status is read and a second call is not created. ${prior}`,
    }
  }
  if (failure === 'validation') {
    return {
      title: fa ? 'نتیجه برای ورود ایمن نبود' : 'The result was not safe to import',
      body: fa
        ? `خروجی وارد نشد. صف بعد از تأخیر دوباره تلاش می‌کند. می‌توانی درخواست را تکرار کنی. ${prior}`
        : `Nothing was imported. The queue retries after a delay. You can request again. ${prior}`,
    }
  }
  if (failure === 'import') {
    return {
      title: fa ? 'برنامه معتبر است اما وارد حساب نشد' : 'The valid plan was not imported',
      body: fa
        ? `نتیجه معتبر محفوظ است. تلاش دوباره فقط ورود را تکرار می‌کند و درخواست جدیدی از سرویس تولید نمی‌فرستد. ${prior}`
        : `The validated result is preserved. Retrying repeats only the import and does not call the generation provider again. ${prior}`,
    }
  }
  if (failure === 'offline') {
    return {
      title: fa ? 'الان آفلاین هستی' : 'You are offline right now',
      body: fa
        ? `کار در صف اگر شروع شده باشد همان می‌ماند. وقتی وصل شدی می‌توانی وضعیت را بخوانی؛ کار دوم ساخته نمی‌شود. ${prior}`
        : `If a job already started, it stays queued. When you are back online you can read that status; a second job is not created. ${prior}`,
    }
  }
  if (failure === 'payment') {
    const copy = resources[locale].translation.app
    return {
      title: copy.paymentRequiredTitle,
      body: `${copy.paymentRequiredBody} ${copy.paymentRequiredNote} ${prior}`.trim(),
    }
  }
  return {
    title: fa ? 'برنامه هنوز آماده نشد' : 'The plan is not ready yet',
    body: fa
      ? `این بار ساخت تمام نشد. صف دوباره تلاش می‌کند. می‌توانی همین حالا وضعیت همان کار را بخوانی. ${prior}`
      : `Creating the plan did not finish this time. The queue will retry. You can read the same job’s status now. ${prior}`,
  }
}

export function GenerationWait({
  locale,
  timedOut = false,
  error,
  onRetry,
  onTimeout,
  phase = 'generating',
  failure,
  startedAt,
  hasPriorPlan = false,
  readyAt,
  versionLabel,
  online = true,
}: {
  locale: AppLocale
  timedOut?: boolean
  error?: string
  onRetry?: () => void
  onTimeout?: () => void
  phase?: GenerationWaitPhase
  failure?: GenerationWaitFailure | null
  startedAt?: number
  hasPriorPlan?: boolean
  readyAt?: string
  versionLabel?: string
  online?: boolean
}) {
  const fa = locale === 'fa'
  const lines = generationWaitLines[locale]
  const [index, setIndex] = useState(0)
  const [clockStart] = useState(() => startedAt ?? Date.now())
  const [localTimeout, setLocalTimeout] = useState(false)
  const origin = startedAt ?? clockStart
  const onTimeoutRef = useRef(onTimeout)
  const timedOutNow = timedOut || localTimeout || failure === 'timeout' || waitHasTimedOut(origin)
  const activeFailure = failure ?? (timedOutNow && phase !== 'ready' ? 'timeout' : null)
  const waiting = phase !== 'ready' && !activeFailure
  const inventory = waitInventoryId({ phase, failure: activeFailure })

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % lines.length), 2800)
    return () => window.clearInterval(timer)
  }, [lines.length, waiting])

  useEffect(() => {
    if (phase === 'ready' || failure || localTimeout) return
    const remaining = Math.max(0, TODAY_GENERATION_WAIT_MS - (Date.now() - origin))
    const timer = window.setTimeout(() => {
      setLocalTimeout(true)
      onTimeoutRef.current?.()
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [phase, failure, localTimeout, origin])

  const copy = activeFailure ? failureCopy(locale, activeFailure, hasPriorPlan) : null
  const retryLabel = activeFailure === 'import'
    ? (fa ? 'تلاش دوباره برای ورود' : 'Retry import')
    : (fa ? 'تلاش دوباره' : 'Try again')

  return (
    <main className="app-page today-page today-wait screen-enter" data-inventory={inventory} data-today="TODAY-04">
      <ContentCard className="today-wait-card">
        <span className={`today-wait-card__icon${activeFailure ? ' is-warning' : phase === 'ready' ? ' is-success' : ''}`} aria-hidden="true">
          <LoaderCircle className={waiting ? 'orbit-spin' : undefined} size={28} />
        </span>
        <p className="orbit-eyebrow">{fa ? phaseEyebrow[phase].fa : phaseEyebrow[phase].en}</p>
        <h1>
          {phase === 'ready'
            ? (fa ? 'برنامه ۳۰روزه آماده است' : 'Your 30-day plan is ready')
            : copy?.title ?? (fa ? 'لطفاً منتظر بمانید. برنامه شخصی‌سازی‌شده شما در حال تولید است.' : 'Please wait. Your personalized plan is being created.')}
        </h1>
        <p className="today-wait-card__rotating" aria-live="polite">
          {phase === 'ready'
            ? (fa
              ? `نسخه فعال از ${readyAt ?? 'همین حالا'} شروع شد${versionLabel ? ` · ${versionLabel}` : ''}. این نسخه تغییرناپذیر است.`
              : `The active version started ${readyAt ?? 'just now'}${versionLabel ? ` · ${versionLabel}` : ''}. This version is immutable.`)
            : copy?.body ?? lines[index]}
        </p>
        {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
        {waiting ? <p>{fa ? 'می‌توانی این صفحه را ببندی و بعداً برگردی. کار دوم ساخته نمی‌شود.' : 'You can leave this page and come back. A second job is not created.'}</p> : null}
        {hasPriorPlan && phase !== 'ready' ? (
          <div className="inline-notice" role="status">
            {fa ? 'برنامه قبلی تا ورود موفق فعال می‌ماند. فشار برای حفظ زنجیره وجود ندارد.' : 'The previous plan stays active until import succeeds. There is no pressure to keep a streak.'}
          </div>
        ) : null}
        {!online && waiting ? (
          <div className="inline-notice" role="status">
            {fa ? 'آفلاین هستی؛ وقتی برگشتی همان کار خوانده می‌شود.' : 'You are offline; the same job will be read when you return.'}
          </div>
        ) : null}
        {phase === 'ready' ? (
          <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/today')}>
            {fa ? 'بازکردن برنامه امروز' : 'Open Today'}
          </Link>
        ) : null}
        {activeFailure && activeFailure !== 'payment' && onRetry ? (
          <div className="today-wait-card__actions">
            <Button disabled={!online && activeFailure === 'offline'} onClick={onRetry}>
              <RefreshCw size={17} />{retryLabel}
            </Button>
            {hasPriorPlan ? (
              <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/plan')}>
                {fa ? 'دیدن برنامه قبلی' : 'View previous plan'}
              </Link>
            ) : null}
          </div>
        ) : null}
        {activeFailure === 'payment' ? (
          <div className="today-wait-card__actions">
            <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/app/me')}>
              {resources[locale].translation.app.openMembership}
            </Link>
            {hasPriorPlan ? (
              <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/plan')}>
                {fa ? 'دیدن برنامه قبلی' : 'View previous plan'}
              </Link>
            ) : null}
          </div>
        ) : null}
      </ContentCard>
    </main>
  )
}
