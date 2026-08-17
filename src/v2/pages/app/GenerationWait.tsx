import { LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { Button, ContentCard } from '../../ui/primitives'
import { generationWaitLines } from './today-state'
import '../../../styles/today.css'

export function GenerationWait({
  locale,
  timedOut = false,
  error,
  onRetry,
}: {
  locale: AppLocale
  timedOut?: boolean
  error?: string
  onRetry?: () => void
}) {
  const fa = locale === 'fa'
  const lines = generationWaitLines[locale]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (timedOut) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % lines.length), 2800)
    return () => window.clearInterval(timer)
  }, [lines.length, timedOut])

  return (
    <main className="app-page today-page today-wait screen-enter">
      <ContentCard className="today-wait-card">
        <span className="today-wait-card__icon" aria-hidden="true">
          <LoaderCircle className={timedOut ? undefined : 'orbit-spin'} size={28} />
        </span>
        <p className="orbit-eyebrow">{fa ? 'یک برنامه برای یک ماه · در حال ساخت' : 'One plan for one month · creating'}</p>
        <h1>
          {timedOut
            ? (fa ? 'برنامه هنوز آماده نشد' : 'The plan is not ready yet')
            : (fa ? 'لطفاً منتظر بمانید. برنامه شخصی‌سازی‌شده شما در حال تولید است.' : 'Please wait. Your personalized plan is being created.')}
        </h1>
        <p className="today-wait-card__rotating" aria-live="polite">
          {timedOut
            ? (fa ? 'بعد از ۳ دقیقه هنوز آماده نیست. می‌توانی دوباره درخواست بدهی؛ اگر همان کار در صف باشد وضعیت خوانده می‌شود، فراخوانی دوم ساخته نمی‌شود.' : 'It is still not ready after 3 minutes. You can request again; if the same job is still queued, that status is read and a second call is not created.')
            : lines[index]}
        </p>
        {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
        <p>{fa ? 'می‌توانی این صفحه را ببندی و بعداً برگردی.' : 'You can leave this page and come back.'}</p>
        {timedOut && onRetry ? (
          <Button onClick={onRetry}><RefreshCw size={17} />{fa ? 'تلاش دوباره' : 'Try again'}</Button>
        ) : null}
      </ContentCard>
    </main>
  )
}
