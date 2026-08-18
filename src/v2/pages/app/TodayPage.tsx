import {
  AlertOctagon,
  AlertTriangle,
  CalendarRange,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Eye,
  Flame,
  MoonStar,
  Salad,
  Sparkles,
  Target,
  WifiOff,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { type CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { saveDailyCheckIn } from '../../checkins/repository'
import type { CheckInSafety } from '../../checkins/contracts'
import { CheckInSheet } from '../../components/CheckInSheet'
import { MealDetailSheet } from '../../components/MealDetailSheet'
import { WorkoutLogger } from '../../components/WorkoutLogger'
import { completeMeal, currentLocalDate, logMealSelection, undoMeal } from '../../data/repository'
import { localize, type MealChoice, type MealSlot, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard, GlassChrome, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'
import { GenerationWait } from './GenerationWait'
import { useGenerationWait } from './use-generation-wait'
import {
  deriveTodaySurface,
  formatLastSync,
  mealIsCompleted,
  readStoredLastSync,
  writeStoredLastSync,
  type TodaySurface,
  type WorkoutRunStatus,
} from './today-state'
import '../../../styles/today.css'

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

function selectedOption(meal: MealSlot, selectedMeals: Record<string, string>) {
  return meal.options.find((option) => option.id === (selectedMeals[meal.id] ?? meal.selectedOptionId)) ?? meal.options[0]
}

export function TodayPage({
  locale,
  plan,
  preview,
  surface,
  lastSyncedAt,
  loadError = false,
  preparing = false,
  onRetry,
}: {
  locale: AppLocale
  plan: MomentumPlanView | null
  preview: boolean
  surface?: TodaySurface
  lastSyncedAt?: string
  loadError?: boolean
  preparing?: boolean
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const wait = useGenerationWait(locale, Boolean(plan), !preview)
  const fa = locale === 'fa'
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({})
  const [mealOverrides, setMealOverrides] = useState<Record<string, boolean>>({})
  const [savingSlot, setSavingSlot] = useState('')
  const [mealError, setMealError] = useState('')
  const [substituteNotice, setSubstituteNotice] = useState('')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [safety, setSafety] = useState<CheckInSafety | null>(null)
  const [workoutStatus, setWorkoutStatus] = useState<WorkoutRunStatus>('idle')
  const [mealDetail, setMealDetail] = useState<{ choice: MealChoice; label: string } | null>(null)
  const today = currentLocalDate()

  useEffect(() => {
    if (online && plan) writeStoredLastSync()
  }, [online, plan])

  const derived = deriveTodaySurface({
    plan,
    online: preview ? (surface === 'offline' ? false : online) : online,
    today,
    safetyLevel: safety?.level ?? (surface === 'safety' ? 'urgent' : null),
    mealOverrides,
    workoutStatus,
    loadError: loadError || surface === 'load-error',
    preparing: preparing || surface === 'preparing',
  })
  const view = surface ?? derived
  const syncedAt = lastSyncedAt ?? readStoredLastSync()
  const mutationsLocked = view === 'offline' || view === 'stale' || view === 'safety' || view === 'load-error' || (!preview && !online)

  if (!preview && wait.session) {
    return (
      <GenerationWait
        failure={wait.session.failure}
        hasPriorPlan={Boolean(plan) || wait.session.hasPriorPlan}
        locale={locale}
        onRetry={() => wait.retry()}
        onTimeout={() => wait.markTimeout()}
        online={online}
        phase={wait.session.phase}
        startedAt={wait.session.startedAt}
      />
    )
  }
  if (view === 'preparing') return <GenerationWait locale={locale} onRetry={onRetry} online={online} />
  if (view === 'load-error') {
    return (
      <main className="app-page today-page screen-enter">
        <ContentCard className="today-status-card">
          <span className="today-status-card__icon is-warning"><AlertTriangle size={28} /></span>
          <p className="orbit-eyebrow">{fa ? 'خطای قابل بازیابی' : 'Recoverable error'}</p>
          <h1>{fa ? 'برنامه امروز دریافت نشد' : 'Today’s plan could not be loaded'}</h1>
          <p>{plan
            ? (fa ? 'نسخه فعال روی دستگاه حذف یا جایگزین نشده است. می‌توانی برنامه ذخیره‌شده را بخوانی و بعداً برای تازه‌سازی دوباره تلاش کنی.' : 'The active on-device plan was not deleted or replaced. You can read the saved plan and retry the refresh later.')
            : (fa ? 'حسابت حذف نشده است. اتصال را بررسی کن و دوباره تلاش کن.' : 'Your account is safe. Check the connection and try again.')}</p>
          <div className="inline-notice" role="status">{plan
            ? (fa ? `نسخه ذخیره‌شده امن است · همگام‌سازی ${formatLastSync(syncedAt, locale)}` : `Saved plan is safe · synced ${formatLastSync(syncedAt, locale)}`)
            : (fa ? 'اطلاعات حساب محفوظ است' : 'Account data was not replaced')}</div>
          <div className="today-status-actions">
            <Button onClick={() => (onRetry ? onRetry() : window.location.reload())}>{fa ? 'تلاش دوباره' : 'Try again'}</Button>
          </div>
        </ContentCard>
      </main>
    )
  }
  if (view === 'no-plan' || !plan) return <EmptyPlanState locale={locale} />

  const currentTime = currentTimeInZone(plan.timezone)
  const orderedMeals = [...plan.meals].sort((left, right) => left.time.localeCompare(right.time))
  const incompleteMeals = orderedMeals.filter((meal) => !mealIsCompleted(meal, mealOverrides))
  const allMealsCompleted = orderedMeals.length > 0 && incompleteMeals.length === 0
  const nextMeal = incompleteMeals.find((meal) => meal.time !== '—' && meal.time >= currentTime)
    ?? incompleteMeals[0]
    ?? null
  const nextChoice = nextMeal ? selectedOption(nextMeal, selectedMeals) : null
  const restDay = !plan.workout

  async function selectMeal(slotId: string, optionId: string) {
    if (mutationsLocked || savingSlot) return
    const meal = plan!.meals.find((item) => item.id === slotId)
    if (!meal || mealIsCompleted(meal, mealOverrides)) return
    const previous = selectedMeals[slotId]
    setSelectedMeals((current) => ({ ...current, [slotId]: optionId }))
    setMealError('')
    setSubstituteNotice(optionId === (meal.selectedOptionId ?? meal.options[0]?.id)
      ? ''
      : (fa ? 'جایگزینی ذخیره شد. برنامه ماه جاری عوض نمی‌شود.' : 'Substitution saved. This month’s plan is unchanged.'))
    if (preview) return
    setSavingSlot(slotId)
    try {
      await logMealSelection(plan!.localDate ?? today, slotId, optionId)
      await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setSelectedMeals((current) => {
        const next = { ...current }
        if (previous) next[slotId] = previous
        else delete next[slotId]
        return next
      })
      setSubstituteNotice('')
      setMealError(fa ? 'انتخاب غذا ذخیره نشد؛ دوباره تلاش کن.' : 'The meal choice was not saved. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  async function markComplete(slotId: string, optionId: string) {
    if (mutationsLocked) return
    setSavingSlot(slotId)
    setMealError('')
    try {
      if (!preview) await completeMeal(plan!.localDate ?? today, slotId, optionId)
      setMealOverrides((current) => ({ ...current, [slotId]: true }))
      if (!preview) await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setMealError(fa ? 'ثبت وعده انجام نشد؛ دوباره تلاش کن.' : 'The meal could not be completed. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  async function revertMeal(slotId: string) {
    if (mutationsLocked) return
    const meal = plan!.meals.find((item) => item.id === slotId)
    const optionId = meal ? selectedOption(meal, selectedMeals)?.id : undefined
    const previous = mealOverrides[slotId]
    setMealOverrides((current) => ({ ...current, [slotId]: false }))
    setMealError('')
    if (preview || !optionId) return
    setSavingSlot(slotId)
    try {
      await undoMeal(plan!.localDate ?? today, slotId, optionId)
      await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setMealOverrides((current) => ({ ...current, [slotId]: previous ?? true }))
      setMealError(fa ? 'برگرداندن ثبت انجام نشد؛ دوباره تلاش کن.' : 'The meal could not be undone. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  const nextAction = nextActionCopy({
    view,
    locale,
    restDay,
    nextMeal,
    nextChoice,
    workoutName: plan.workout ? localize(plan.workout.name, locale) : '',
    allMealsCompleted,
  })

  return (
    <main className="app-page today-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><Sparkles size={15} />{localize(plan.dateLabel, locale)}</p>
          <h1>{t('app.greeting', { name: localize(plan.userName, locale) })}</h1>
          <p>{localize(plan.adjustmentReason, locale)}</p>
        </div>
        <Button className="today-checkin-quiet" disabled={mutationsLocked && !preview} onClick={() => setCheckInOpen(true)} variant="ghost">
          {checkInSaved ? (fa ? 'چک‌این ثبت شد' : 'Check-in saved') : (fa ? 'چک‌این روزانه · اختیاری' : 'Daily check-in · optional')}
        </Button>
      </section>

      {view === 'offline' ? (
        <div className="today-banner inline-notice" role="status">
          <WifiOff size={16} />
          <span>{fa ? `آفلاین هستی. آخرین همگام‌سازی: ${formatLastSync(syncedAt, locale)}. ثبت جدید تا برگشت اتصال روی همین دستگاه می‌ماند.` : `You’re offline. Last synced ${formatLastSync(syncedAt, locale)}. New logs stay on this device until you reconnect.`}</span>
        </div>
      ) : null}
      {view === 'stale' ? (
        <div className="today-banner inline-notice inline-notice--warning" role="status">
          <AlertTriangle size={16} />
          <span>{fa ? 'این نسخه ممکن است تازه نباشد. ثبت تمرین و وعده تا همگام‌سازی دوباره غیرفعال است. برنامه ذخیره‌شده حذف نشده است.' : 'This copy may be out of date. Logging is disabled until the plan refreshes. The stored plan was not deleted.'}</span>
        </div>
      ) : null}
      {view === 'safety' ? (
        <div className="today-banner inline-notice inline-notice--error" role="alert">
          <AlertOctagon size={16} />
          <span>{fa ? 'تمرین امروز متوقف شده است. هیچ فشاری برای حفظ تداوم نیست. اگر علامت شدید یا ناگهانی است کمک فوری بگیر.' : 'Today’s workout is paused. There is no pressure to keep a streak. Seek urgent help if symptoms are severe or sudden.'}</span>
        </div>
      ) : null}
      {checkInSaved ? (
        <div className="today-banner inline-notice inline-notice--success" role="status">
          {fa ? 'چک‌این ذخیره شد. هوش مصنوعی صدا زده نشد و برنامه ماه جاری عوض نشد.' : 'Check-in saved. No AI was called, and this month’s plan is unchanged.'}
        </div>
      ) : null}

      {view === 'safety' ? (
        <ContentCard className="today-status-card today-banner">
          <span className="today-status-card__icon is-danger"><AlertOctagon size={28} /></span>
          <p className="orbit-eyebrow">{fa ? 'ایمنی اولویت دارد' : 'Safety first'}</p>
          <h2>{fa ? 'تمرین امروز متوقف شده' : 'Today’s workout is paused'}</h2>
          <p>{fa ? 'Momentum جایگزین مراقبت پزشکی نیست. اگر در خطر فوری هستی با خدمات اضطراری محل زندگی تماس بگیر.' : 'Momentum does not replace medical care. If you may be in immediate danger, contact local emergency services.'}</p>
          <div className="today-status-actions">
            <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/safety')}>{fa ? 'دیدن راهنمای ایمنی' : 'View safety guidance'}</Link>
          </div>
        </ContentCard>
      ) : null}

      <section className="today-next-action">
        <ContentCard className="today-next-action-card">
          <StatusPill tone={view === 'completed' ? 'success' : view === 'rest' ? 'energy' : 'brand'}>
            {view === 'completed' ? (fa ? 'روز کامل' : 'Day complete') : view === 'rest' ? (fa ? 'بدون فشار' : 'No pressure') : fa ? 'قدم بعدی' : 'Next action'}
          </StatusPill>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.body}</p>
          <div className="today-next-action-card__actions">
            <Button disabled={view === 'safety' || view === 'stale'} onClick={() => document.getElementById(nextAction.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {nextAction.action}
            </Button>
            <Button className="today-checkin-quiet" disabled={mutationsLocked && !preview} onClick={() => setCheckInOpen(true)} variant="ghost">
              {fa ? 'بررسی روزانه · اختیاری' : 'Daily check-in · optional'}
            </Button>
          </div>
        </ContentCard>
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
          <div className="target-track-labels"><span>{fa ? 'ثبت‌شده تا حالا' : 'Logged so far'} · {formatNumber(plan.progress.loggedCalories, locale)} kcal</span><strong>{formatNumber(Math.round((plan.progress.loggedCalories / Math.max(plan.targets.calories, 1)) * 100), locale)}%</strong></div>
        </ContentCard>
        <GlassChrome className="monthly-plan-brief-card">
          <span className="monthly-plan-brief-card__icon"><CalendarRange size={24} /></span>
          <div><p className="orbit-eyebrow">{fa ? 'برنامه ماه جاری' : 'Current monthly plan'}</p><h2>{localize(plan.monthlyPlanBrief, locale)}</h2></div>
          <StatusPill tone="success">{fa ? 'وارد شده' : 'Imported'}</StatusPill>
        </GlassChrome>
      </section>

      <section className="today-main-grid">
        <div className="today-timeline" id="today-meal">
          <div className="section-title-row">
            <div>
              <p className="orbit-eyebrow">{fa ? 'خط زمانی' : 'Timeline'}</p>
              <h2>{allMealsCompleted ? (fa ? 'همه وعده‌ها ثبت شدند' : 'All meals completed') : t('app.nextMeal')}</h2>
            </div>
            <span><Clock3 size={16} />{nextMeal?.time ?? (allMealsCompleted ? (fa ? 'کامل' : 'Done') : '—')}</span>
          </div>

          <div className="today-timeline-list">
            {orderedMeals.map((meal) => {
              const completed = mealIsCompleted(meal, mealOverrides)
              const choice = selectedOption(meal, selectedMeals)
              const isNext = nextMeal?.id === meal.id
              return (
                <ContentCard className={`today-meal-row${completed ? ' is-complete' : ''}${isNext ? ' is-next' : ''}`} key={meal.id}>
                  <strong className="today-meal-row__time">{meal.time}</strong>
                  <div>
                    <p>{localize(meal.label, locale)}</p>
                    <h3>{choice ? localize(choice.name, locale) : localize(meal.label, locale)}</h3>
                  </div>
                  <StatusPill tone={completed ? 'success' : isNext ? 'brand' : 'neutral'}>
                    {completed ? (fa ? 'ثبت شد' : 'Logged') : isNext ? (fa ? 'بعدی' : 'Next') : (fa ? 'برنامه' : 'Planned')}
                  </StatusPill>
                  {completed ? (
                    <Button disabled={mutationsLocked || savingSlot === meal.id} onClick={() => void revertMeal(meal.id)} variant="secondary">{fa ? 'برگرداندن ثبت' : 'Undo log'}</Button>
                  ) : null}
                </ContentCard>
              )
            })}
          </div>

          {nextMeal && nextChoice ? (
            <ContentCard className="next-meal-card">
              <div className="next-meal-card__top">
                <span className="meal-visual"><Salad size={30} /></span>
                <div>
                  <small>{localize(nextMeal.label, locale)}</small>
                  <h3>{localize(nextChoice.name, locale)}</h3>
                  <p>{localize(nextChoice.description, locale)}</p>
                </div>
                <StatusPill tone={nextChoice.confidence === 'estimated' ? 'neutral' : 'success'}>{confidenceLabel(nextChoice.confidence, locale)}</StatusPill>
              </div>
              <div className="meal-option-strip">
                {nextMeal.options.map((option, index) => (
                  <button
                    aria-pressed={option.id === nextChoice.id}
                    className={option.id === nextChoice.id ? 'is-selected' : ''}
                    disabled={mutationsLocked || Boolean(savingSlot)}
                    key={option.id}
                    onClick={() => void selectMeal(nextMeal.id, option.id)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{localize(option.name, locale)}</strong>
                    <small>{formatNumber(option.nutrition.calories, locale)} kcal</small>
                  </button>
                ))}
              </div>
              {substituteNotice ? <div className="inline-notice inline-notice--success" role="status">{substituteNotice}</div> : null}
              {mealError ? <div className="inline-notice inline-notice--error" role="alert">{mealError}</div> : null}
              <div className="next-meal-card__footer">
                <span><Flame size={16} />{formatNumber(nextChoice.nutrition.calories, locale)} kcal</span>
                <span>{formatNumber(nextChoice.nutrition.protein, locale)}g {t('app.protein')}</span>
                <span><Clock3 size={16} />{formatNumber(nextChoice.cookingMinutes, locale)} {fa ? 'دقیقه' : 'min'}</span>
                <Button onClick={() => setMealDetail({ choice: nextChoice, label: localize(nextMeal.label, locale) })} variant="secondary"><Eye size={16} />{fa ? 'جزئیات' : 'Details'}</Button>
                <Button disabled={mutationsLocked} loading={savingSlot === nextMeal.id} onClick={() => void markComplete(nextMeal.id, nextChoice.id)}>
                  <Check size={17} />{t('app.complete')}
                </Button>
              </div>
            </ContentCard>
          ) : null}
        </div>

        <aside className="today-side-stack">
          {plan.workout ? (
            <ContentCard className="workout-card" id="today-workout">
              <div className="section-title-row"><span className="workout-card__icon"><Dumbbell size={22} /></span><StatusPill tone="energy">{intensityLabel(plan.workout.intensity, locale)}</StatusPill></div>
              <small>{t('app.training')}</small>
              <h3>{localize(plan.workout.name, locale)}</h3>
              <p>{localize(plan.workout.focus, locale)}</p>
              <div>
                <span><Clock3 size={16} />{formatNumber(plan.workout.durationMinutes, locale)} {fa ? 'دقیقه' : 'min'}</span>
                <span>{formatNumber(plan.workout.exercises, locale)} {fa ? 'حرکت' : 'exercises'}</span>
              </div>
              <Link className="orbit-button orbit-button--secondary orbit-button--block" href={`${localizedPath(locale, '/app/plan')}${preview ? '?preview=1' : ''}`}>
                {fa ? 'مشاهده در برنامه' : 'View in Plan'}<ChevronRight className="directional-icon" size={17} />
              </Link>
              <WorkoutLogger
                enabled={!mutationsLocked}
                locale={locale}
                localDate={plan.localDate ?? today}
                onStatusChange={setWorkoutStatus}
                preview={preview}
                workout={plan.workout}
              />
            </ContentCard>
          ) : (
            <ContentCard className="today-rest-card" id="today-recovery">
              <StatusPill tone="energy">{fa ? 'بدون فشار' : 'No pressure'}</StatusPill>
              <h3>{fa ? 'امروز برای سازگاری و استراحت است' : 'Today is for recovery and adaptation'}</h3>
              <p>{fa ? 'یک پیاده‌روی آرام و ۸ دقیقه حرکت نرم پیشنهاد شده؛ انجام‌ندادن آن شکست محسوب نمی‌شود.' : 'A gentle walk and 8 minutes of mobility are suggested; skipping them is not treated as failure.'}</p>
            </ContentCard>
          )}
          <ContentCard className="recovery-card">
            <div><span><MoonStar size={20} /></span><strong>{formatNumber(plan.progress.recovery, locale)}%</strong></div>
            <h3>{t('app.recovery')}</h3>
            <p>{fa ? `خواب ${Math.floor(plan.progress.sleepMinutes / 60)}:${String(plan.progress.sleepMinutes % 60).padStart(2, '0')} · انرژی ${formatNumber(plan.progress.energyScore, locale)} از ۵` : `Sleep ${Math.floor(plan.progress.sleepMinutes / 60)}:${String(plan.progress.sleepMinutes % 60).padStart(2, '0')} · Energy ${plan.progress.energyScore} of 5`}</p>
          </ContentCard>
        </aside>
      </section>

      {mealDetail ? <MealDetailSheet choice={mealDetail.choice} locale={locale} mealLabel={mealDetail.label} onClose={() => setMealDetail(null)} /> : null}
      {checkInOpen ? (
        <CheckInSheet
          locale={locale}
          onClose={() => setCheckInOpen(false)}
          onSave={async (input) => {
            if (!preview) {
              const result = await saveDailyCheckIn(input, plan.localDate ?? today, plan.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'))
              await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
              setCheckInSaved(true)
              if (result.safety.level !== 'normal') setSafety(result.safety)
              return result
            }
            const nextSafety: CheckInSafety = {
              level: input.redFlags?.length ? 'urgent' : input.painScore >= 4 || input.recoveryScore <= 2 ? 'caution' : 'normal',
              reasons: [],
            }
            setCheckInSaved(true)
            if (nextSafety.level !== 'normal') setSafety(nextSafety)
            return { safety: nextSafety }
          }}
        />
      ) : null}
    </main>
  )
}

function nextActionCopy({
  view,
  locale,
  restDay,
  nextMeal,
  nextChoice,
  workoutName,
  allMealsCompleted,
}: {
  view: TodaySurface
  locale: AppLocale
  restDay: boolean
  nextMeal: MealSlot | null
  nextChoice: MealChoice | null
  workoutName: string
  allMealsCompleted: boolean
}) {
  const fa = locale === 'fa'
  if (view === 'safety') {
    return {
      title: fa ? 'تمرین امروز متوقف شده' : 'Today’s workout is paused',
      body: fa ? 'اول ایمنی. هیچ فشاری برای حفظ تداوم نیست.' : 'Safety comes first. There is no pressure to keep a streak.',
      action: fa ? 'دیدن راهنمای ایمنی' : 'View safety guidance',
      targetId: 'today-recovery',
    }
  }
  if (view === 'completed') {
    return {
      title: fa ? 'آفرین، برنامه امروز کامل شد' : 'You completed today’s plan',
      body: fa ? 'تمرین و وعده‌های برنامه‌ریزی‌شده ثبت شدند. می‌توانی آخرین ثبت را برگردانی.' : 'Your workout and planned meals are logged. You can undo the latest log.',
      action: fa ? 'بازکردن ثبت‌های امروز' : 'Open today’s logs',
      targetId: 'today-meal',
    }
  }
  if (view === 'rest' || restDay) {
    return {
      title: fa ? 'امروز برای سازگاری و استراحت است' : 'Today is for recovery and adaptation',
      body: fa ? 'یک پیاده‌روی آرام و ۸ دقیقه حرکت نرم پیشنهاد شده؛ انجام‌ندادن آن شکست محسوب نمی‌شود.' : 'A gentle walk and 8 minutes of mobility are suggested; skipping them is not treated as failure.',
      action: fa ? 'دیدن بازیابی پیشنهادی' : 'View recovery suggestion',
      targetId: 'today-recovery',
    }
  }
  if (view === 'partial' && nextMeal && nextChoice) {
    return {
      title: fa ? `قدم بعدی ${localize(nextMeal.label, locale)} است` : `${localize(nextMeal.label, locale)} is next`,
      body: localize(nextChoice.name, locale),
      action: fa ? 'دیدن وعده بعدی' : 'View next meal',
      targetId: 'today-meal',
    }
  }
  if (!allMealsCompleted && nextMeal && nextChoice && view !== 'active') {
    return {
      title: localize(nextChoice.name, locale),
      body: localize(nextMeal.label, locale),
      action: fa ? 'دیدن وعده بعدی' : 'View next meal',
      targetId: 'today-meal',
    }
  }
  return {
    title: workoutName || (fa ? 'امروز یک تمرین داری' : 'A session is next'),
    body: fa ? 'یک اقدام بالای صفحه؛ چک‌این روزانه اختیاری و کم‌رنگ است.' : 'One next action above the fold. Daily check-in stays optional and quiet.',
    action: fa ? 'شروع تمرین' : 'Start workout',
    targetId: 'today-workout',
  }
}
