import { Droplet, GlassWater, Minus, Plus, Utensils } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { saveWater } from '../../checkins/repository'
import { localize, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { Button, ContentCard } from '../../ui/primitives'

const GLASS_ML = 250
const MAX_WATER_ML = 6000
const SYNC_DELAY_MS = 1500

/**
 * Today's water in glasses of 250 ml. Taps update at once and sync after a short pause.
 * Unlike the Android app, the website keeps no health data on the device: if a save fails,
 * the count returns to the last saved value and the member is told.
 */
export function WaterCard({
  locale,
  plan,
  preview,
  locked,
  onLoggedChange,
}: {
  locale: AppLocale
  plan: MomentumPlanView
  preview: boolean
  locked: boolean
  onLoggedChange?: (ml: number) => void
}) {
  const fa = locale === 'fa'
  const goalMl = plan.water?.goalMl ?? 2500
  const [ml, setMl] = useState(plan.water?.loggedMl ?? 0)
  const [failed, setFailed] = useState(false)
  const savedMl = useRef(plan.water?.loggedMl ?? 0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => { onLoggedChange?.(ml) }, [ml, onLoggedChange])

  function change(glasses: number) {
    const next = Math.min(MAX_WATER_ML, Math.max(0, ml + glasses * GLASS_ML))
    if (next === ml) return
    setMl(next)
    setFailed(false)
    if (preview || !plan.localDate || !plan.timezone) return
    const localDate = plan.localDate
    const timezone = plan.timezone
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      saveWater(next, localDate, timezone)
        .then(() => { savedMl.current = next })
        .catch(() => {
          setMl(savedMl.current)
          setFailed(true)
        })
    }, SYNC_DELAY_MS)
  }

  const goalGlasses = Math.max(1, Math.round(goalMl / GLASS_ML))
  const glasses = Math.round(ml / GLASS_ML)
  const reached = ml >= goalMl
  const percent = Math.min(100, Math.round((ml / goalMl) * 100))
  return (
    <ContentCard className={`water-card${reached ? ' is-reached' : ''}`}>
      <div className="section-title-row">
        <span className="water-card__icon"><Droplet aria-hidden="true" size={20} /></span>
        <small>{fa ? 'آب امروز' : 'Water today'}</small>
      </div>
      <h3>
        <bdi dir={fa ? 'rtl' : 'ltr'}>{formatNumber(glasses, locale)} / {formatNumber(goalGlasses, locale)}</bdi>{' '}
        <span>{fa ? 'لیوان' : 'glasses'}</span>
      </h3>
      <p className="water-card__ml"><bdi dir="ltr">{formatNumber(ml, locale)} / {formatNumber(goalMl, locale)} ml</bdi></p>
      <div aria-label={fa ? `${formatNumber(percent, locale)}٪ از هدف آب` : `${percent}% of the water goal`} className="water-card__track" role="img">
        <i style={{ width: `${percent}%` }} />
      </div>
      <div aria-hidden="true" className="water-card__glasses">
        {Array.from({ length: Math.min(goalGlasses, 12) }, (_, index) => (
          <GlassWater className={index < glasses ? 'is-full' : ''} key={index} size={18} />
        ))}
      </div>
      {reached ? <p className="water-card__done" role="status">{fa ? 'هدف آب امروز کامل شد. آفرین!' : 'Today’s water goal is done. Nice work!'}</p> : null}
      {failed ? <div className="inline-notice inline-notice--error" role="alert">{fa ? 'آب ذخیره نشد؛ دوباره امتحان کن.' : 'Water was not saved. Try again.'}</div> : null}
      <div className="water-card__actions">
        <Button aria-label={fa ? 'یک لیوان کمتر' : 'One glass less'} disabled={locked || ml === 0} onClick={() => change(-1)} variant="secondary"><Minus size={16} /></Button>
        <Button disabled={locked || ml >= MAX_WATER_ML} onClick={() => change(1)}><Plus size={16} />{fa ? 'یک لیوان' : 'One glass'}</Button>
      </div>
    </ContentCard>
  )
}

/** The plan's guide for eating out: what to order and roughly what it adds up to. */
export function EatingOutCard({ locale, plan }: { locale: AppLocale; plan: MomentumPlanView }) {
  const fa = locale === 'fa'
  const tips = plan.restaurantGuide ?? []
  if (tips.length === 0) return null
  return (
    <ContentCard className="eating-out-card">
      <div className="section-title-row">
        <span className="eating-out-card__icon"><Utensils aria-hidden="true" size={20} /></span>
        <small>{fa ? 'غذای بیرون' : 'Eating out'}</small>
      </div>
      <h3>{fa ? 'بیرون غذا می‌خوری؟' : 'Eating out today?'}</h3>
      <p>{fa ? 'این گزینه‌ها با برنامه‌ات جور است.' : 'These choices fit your plan.'}</p>
      <div className="eating-out-card__list">
        {tips.map((tip, index) => (
          <details key={`${tip.title.en}-${index}`}>
            <summary>
              <span>{localize(tip.title, locale)}</span>
              <small><bdi dir="ltr">{formatNumber(Math.round(tip.calories), locale)} kcal · {formatNumber(Math.round(tip.protein), locale)} g</bdi></small>
            </summary>
            <ul>{tip.orderInstructions.map((line, lineIndex) => <li key={lineIndex}>{localize(line, locale)}</li>)}</ul>
          </details>
        ))}
      </div>
    </ContentCard>
  )
}
