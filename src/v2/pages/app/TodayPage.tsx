import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  MoonStar,
  Salad,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type CSSProperties, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { saveDailyCheckIn } from '../../checkins/repository'
import { completeMeal, currentLocalDate, logMealSelection } from '../../data/repository'
import { localize, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { Button, ContentCard, GlassChrome, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'
import { localizedPath } from '../../router/route-utils'
import { CheckInSheet } from '../../components/CheckInSheet'
import { useOnlineStatus } from '../../../platform/pwa/network'

function currentTimeInZone(timezone?: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  }
}

function confidenceLabel(value: string, locale: AppLocale) {
  const labels: Record<string, { fa: string; en: string }> = {
    estimated: { fa: 'برآوردی', en: 'Estimated' },
    verified: { fa: 'تأییدشده', en: 'Verified' },
    usda: { fa: 'USDA', en: 'USDA' },
    manufacturer: { fa: 'برچسب محصول', en: 'Manufacturer' },
  }
  return labels[value]?.[locale] ?? value
}

function intensityLabel(value: string, locale: AppLocale) {
  const labels: Record<string, { fa: string; en: string }> = {
    low: { fa: 'سبک', en: 'Low' },
    moderate: { fa: 'متوسط', en: 'Moderate' },
    high: { fa: 'سنگین', en: 'High' },
  }
  return labels[value]?.[locale] ?? value
}

export function TodayPage({ locale, plan, preview }: { locale: AppLocale; plan: MomentumPlanView | null; preview: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({})
  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>({})
  const [savingSlot, setSavingSlot] = useState('')
  const [mealError, setMealError] = useState('')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInSaved, setCheckInSaved] = useState(false)
  if (!plan) return <EmptyPlanState locale={locale} />
  const currentTime = currentTimeInZone(plan.timezone)
  const orderedMeals = [...plan.meals].sort((left, right) => left.time.localeCompare(right.time))
  const incompleteMeals = orderedMeals.filter((meal) => !completedSlots[meal.id] && meal.completionStatus !== 'completed')
  const allMealsCompleted = incompleteMeals.length === 0
  const lunch = incompleteMeals.find((meal) => meal.time !== '—' && meal.time >= currentTime)
    ?? incompleteMeals[0]
    ?? orderedMeals[orderedMeals.length - 1]
  const selectedLunch = lunch.options.find((option) => option.id === (selectedMeals[lunch.id] ?? lunch.selectedOptionId)) ?? lunch.options[0]

  async function selectMeal(slotId: string, optionId: string) {
    if (savingSlot) return
    const previous = selectedMeals[slotId]
    setSelectedMeals((current) => ({ ...current, [slotId]: optionId }))
    setMealError('')
    if (preview) return
    setSavingSlot(slotId)
    try {
      await logMealSelection(plan!.localDate ?? currentLocalDate(), slotId, optionId)
      await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setSelectedMeals((current) => {
        const next = { ...current }
        if (previous) next[slotId] = previous
        else delete next[slotId]
        return next
      })
      setMealError(locale === 'fa' ? 'انتخاب غذا ذخیره نشد؛ دوباره تلاش کن.' : 'The meal choice was not saved. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  async function markComplete() {
    setSavingSlot(lunch.id)
    setMealError('')
    try {
      if (!preview) await completeMeal(plan!.localDate ?? currentLocalDate(), lunch.id, selectedLunch.id)
      setCompletedSlots((current) => ({ ...current, [lunch.id]: true }))
      if (!preview) await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setMealError(locale === 'fa' ? 'ثبت وعده انجام نشد؛ دوباره تلاش کن.' : 'The meal could not be completed. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  return (
    <main className="app-page today-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><Sparkles size={15} />{localize(plan.dateLabel, locale)}</p>
          <h1>{t('app.greeting', { name: localize(plan.userName, locale) })}</h1>
          <p>{localize(plan.adjustmentReason, locale)}</p>
        </div>
        <Button disabled={!preview && !online} onClick={() => setCheckInOpen(true)} variant="secondary"><Zap size={17} />{checkInSaved ? (locale === 'fa' ? 'چک‌این ثبت شد' : 'Check-in saved') : (locale === 'fa' ? 'چک‌این ۳۰ ثانیه‌ای' : '30-second check-in')}</Button>
      </section>

      <section className="today-hero-grid">
        <ContentCard className="daily-brief-card">
          <div className="card-heading-row">
            <div><StatusPill tone="brand"><Target size={13} />{localize(plan.targetStrategy, locale)}</StatusPill><h2>{t('app.dailyBrief')}</h2></div>
            <span className="readiness-orb" style={{ '--readiness-progress': `${Math.max(0, Math.min(100, plan.progress.readiness))}%` } as CSSProperties}><strong>{formatNumber(plan.progress.readiness, locale)}%</strong><small>{t('app.readiness')}</small></span>
          </div>
          <div className="macro-row">
            <span><strong>{formatNumber(plan.targets.calories, locale)}</strong><small>{t('app.calories')}</small></span>
            <span><strong>{formatNumber(plan.targets.protein, locale)}g</strong><small>{t('app.protein')}</small></span>
            <span><strong>{formatNumber(plan.targets.carbs, locale)}g</strong><small>{t('app.carbs')}</small></span>
            <span><strong>{formatNumber(plan.targets.fat, locale)}g</strong><small>{t('app.fat')}</small></span>
          </div>
          <div className="target-track"><i style={{ width: `${Math.min(100, (plan.progress.loggedCalories / plan.targets.calories) * 100)}%` }} /></div>
          <div className="target-track-labels"><span>{locale === 'fa' ? 'ثبت‌شده تا حالا' : 'Logged so far'} · {formatNumber(plan.progress.loggedCalories, locale)} kcal</span><strong>{formatNumber(Math.round((plan.progress.loggedCalories / plan.targets.calories) * 100), locale)}%</strong></div>
        </ContentCard>
        <GlassChrome className="coach-brief-card">
          <span className="coach-brief-card__icon"><BrainCircuit size={24} /></span>
          <div><p className="orbit-eyebrow">{t('landing.coachInsight')}</p><h2>{localize(plan.coachBrief, locale)}</h2></div>
          <Link aria-label={locale === 'fa' ? 'بازکردن مربی' : 'Open coach'} href={`${localizedPath(locale, '/app/coach')}${preview ? '?preview=1' : ''}`}><ArrowRight className="directional-icon" size={18} /></Link>
        </GlassChrome>
      </section>

      <section className="today-main-grid">
        <div className="today-timeline">
          <div className="section-title-row"><div><p className="orbit-eyebrow">{locale === 'fa' ? 'خط زمانی' : 'Timeline'}</p><h2>{allMealsCompleted ? (locale === 'fa' ? 'همه وعده‌ها ثبت شدند' : 'All meals completed') : t('app.nextMeal')}</h2></div><span><Clock3 size={16} />{lunch.time}</span></div>
          <ContentCard className="next-meal-card">
            <div className="next-meal-card__top">
              <span className="meal-visual"><Salad size={30} /></span>
              <div><small>{localize(lunch.label, locale)}</small><h3>{localize(selectedLunch.name, locale)}</h3><p>{localize(selectedLunch.description, locale)}</p></div>
              <StatusPill tone={selectedLunch.confidence === 'estimated' ? 'neutral' : 'success'}>{confidenceLabel(selectedLunch.confidence, locale)}</StatusPill>
            </div>
            <div className="meal-option-strip">
              {lunch.options.map((option, index) => (
                <button aria-pressed={option.id === selectedLunch.id} className={option.id === selectedLunch.id ? 'is-selected' : ''} disabled={allMealsCompleted || (!preview && !online) || Boolean(savingSlot) || completedSlots[lunch.id] || lunch.completionStatus === 'completed'} key={option.id} onClick={() => void selectMeal(lunch.id, option.id)} type="button">
                  <span>{index + 1}</span><strong>{localize(option.name, locale)}</strong><small>{formatNumber(option.nutrition.calories, locale)} kcal</small>
                </button>
              ))}
            </div>
            {mealError ? <div className="inline-notice inline-notice--error" role="alert">{mealError}</div> : null}
            <div className="next-meal-card__footer">
              <span><Flame size={16} />{formatNumber(selectedLunch.nutrition.calories, locale)} kcal</span>
              <span>{formatNumber(selectedLunch.nutrition.protein, locale)}g {t('app.protein')}</span>
              <span><Clock3 size={16} />{formatNumber(selectedLunch.cookingMinutes, locale)} {locale === 'fa' ? 'دقیقه' : 'min'}</span>
              <Button disabled={allMealsCompleted || (!preview && !online) || completedSlots[lunch.id] || lunch.completionStatus === 'completed'} loading={savingSlot === lunch.id} onClick={() => void markComplete()}><Check size={17} />{completedSlots[lunch.id] || lunch.completionStatus === 'completed' ? (locale === 'fa' ? 'ثبت شد' : 'Completed') : t('app.complete')}</Button>
            </div>
          </ContentCard>
        </div>
        <aside className="today-side-stack">
          {plan.workout ? (
            <ContentCard className="workout-card">
              <div className="section-title-row"><span className="workout-card__icon"><Dumbbell size={22} /></span><StatusPill tone="energy">{intensityLabel(plan.workout.intensity, locale)}</StatusPill></div>
              <small>{t('app.training')}</small>
              <h3>{localize(plan.workout.name, locale)}</h3>
              <p>{localize(plan.workout.focus, locale)}</p>
              <div><span><Clock3 size={16} />{formatNumber(plan.workout.durationMinutes, locale)} {locale === 'fa' ? 'دقیقه' : 'min'}</span><span>{formatNumber(plan.workout.exercises, locale)} {locale === 'fa' ? 'حرکت' : 'exercises'}</span></div>
              <Link className="orbit-button orbit-button--secondary orbit-button--block" href={`${localizedPath(locale, '/app/plan')}${preview ? '?preview=1' : ''}`}>{locale === 'fa' ? 'مشاهده تمرین' : 'View workout'}<ChevronRight className="directional-icon" size={17} /></Link>
            </ContentCard>
          ) : null}
          <ContentCard className="recovery-card">
            <div><span><MoonStar size={20} /></span><strong>{formatNumber(plan.progress.recovery, locale)}%</strong></div>
            <h3>{t('app.recovery')}</h3>
            <p>{locale === 'fa' ? `خواب ${Math.floor(plan.progress.sleepMinutes / 60)}:${String(plan.progress.sleepMinutes % 60).padStart(2, '0')} · انرژی ${formatNumber(plan.progress.energyScore, locale)} از ۵` : `Sleep ${Math.floor(plan.progress.sleepMinutes / 60)}:${String(plan.progress.sleepMinutes % 60).padStart(2, '0')} · Energy ${plan.progress.energyScore} of 5`}</p>
          </ContentCard>
        </aside>
      </section>
      {checkInOpen ? <CheckInSheet locale={locale} onClose={() => setCheckInOpen(false)} onSave={async (input) => {
        if (!preview) {
          const result = await saveDailyCheckIn(input, plan.localDate ?? currentLocalDate(), plan.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'))
          await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
          setCheckInSaved(true)
          return result
        }
        setCheckInSaved(true)
        return { safety: { level: input.redFlags?.length ? 'urgent' as const : input.painScore >= 4 || input.recoveryScore <= 2 ? 'caution' as const : 'normal' as const, reasons: [] } }
      }} /> : null}
    </main>
  )
}
