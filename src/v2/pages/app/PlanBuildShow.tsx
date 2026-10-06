import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { formatNumber } from '../../lib/format'
import type { GenerationWaitPhase } from './generation-wait'
import { PLAN_BUILD_STAGES, planBuildPace, readPlanBuildEstimate, resolvePlanBuildShow } from './plan-build-show'

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R

export function PlanBuildShow({
  locale,
  phase,
  startedAt,
  statusLabel,
}: {
  locale: AppLocale
  phase: GenerationWaitPhase
  startedAt: number
  statusLabel: string
}) {
  const [estimateMs] = useState(() => readPlanBuildEstimate())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const frame = resolvePlanBuildShow({
    elapsedMs: Math.max(0, now - startedAt),
    estimateMs,
    phase,
  })
  const stage = PLAN_BUILD_STAGES[frame.stageIndex] ?? PLAN_BUILD_STAGES[0]
  const detail = stage.details[locale][frame.detailIndex] ?? stage.details[locale][0]
  const stepLabel = locale === 'fa' ? 'مرحله' : 'Step'
  const offset = RING_C * (1 - frame.bar)

  return (
    <div className="plan-build__show">
      <div className="plan-build__orbit" aria-hidden="true">
        <span className="plan-build__glow" />
        <span className="plan-build__spin" />
        <svg viewBox="0 0 120 120">
          <circle className="plan-build__ring-track" cx="60" cy="60" r={RING_R} />
          <circle
            className="plan-build__ring-value"
            cx="60"
            cy="60"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
          />
        </svg>
        <strong>
          {formatNumber(frame.stageIndex + 1, locale)}
          <small>{locale === 'fa' ? 'از' : 'of'} {formatNumber(PLAN_BUILD_STAGES.length, locale)}</small>
        </strong>
      </div>
      <p className="orbit-eyebrow">{statusLabel}</p>
      <h1 key={stage.id}>{stage.title[locale]}</h1>
      <p className="plan-build__detail" key={`${stage.id}-${frame.detailIndex}`}>{detail}</p>
      <ol className="plan-build__steps" aria-label={locale === 'fa' ? 'مراحل ساخت برنامه' : 'Plan building steps'}>
        {PLAN_BUILD_STAGES.map((item, index) => {
          const state = index < frame.stageIndex ? 'is-done' : index === frame.stageIndex ? 'is-current' : 'is-upcoming'
          return (
            <li aria-current={index === frame.stageIndex ? 'step' : undefined} className={`plan-build__step ${state}`} key={item.id}>
              <span className="plan-build__mark">{index < frame.stageIndex ? <Check size={12} strokeWidth={3} /> : null}</span>
              <span>{item.label[locale]}</span>
            </li>
          )
        })}
      </ol>
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(frame.bar * 100)}
        aria-valuetext={`${stepLabel} ${frame.stageIndex + 1}. ${stage.title[locale]}`}
        className="plan-build__track"
        role="progressbar"
      >
        <span style={{ width: `${Math.round(frame.bar * 100)}%` }} />
      </div>
      <p className="plan-build__pace">{planBuildPace(locale, frame)}</p>
    </div>
  )
}
