import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  Dumbbell,
  Salad,
  ShoppingBasket,
  Sparkles,
  WifiOff,
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { MealDetailSheet, PlanSubstitutionSheet, WorkoutDetailSheet, LazyOverlay } from '../../components/LazyOverlay'
import { WorkoutLogger } from '../../components/WorkoutLogger'
import { completeMeal, currentLocalDate, logMealSelection } from '../../data/repository'
import { localize, type MealChoice, type MealSlot, type MomentumPlanView, type WorkoutBlock } from '../../data/types'
import { Button, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'
import {
  derivePlanSurface,
  formatLastSync,
  groceryShareText,
  PLAN_SEGMENTS,
  planDays,
  readShoppingChecks,
  readStoredLastSync,
  resolvePlanHistory,
  resolvePlanVersion,
  shoppingPlanKey,
  type PlanSegment,
  type PlanSurface,
  writeShoppingChecks,
  writeStoredLastSync,
} from './plan-state'
import {
  PlanCalendarView,
  PlanErrorState,
  PlanGroceryView,
  PlanHistoryView,
  PlanLoadingSkeleton,
  PlanNutritionView,
  PlanTrainingView,
  PlanVersionView,
  PlanWeekView,
} from './plan-views'
import '../../../styles/plan.css'

const segmentMeta: Array<{ key: PlanSegment; icon: typeof Salad; fa: string; en: string }> = [
  { key: 'week', icon: CalendarDays, fa: 'هفته', en: 'Week' },
  { key: 'nutrition', icon: Salad, fa: 'تغذیه', en: 'Nutrition' },
  { key: 'training', icon: Dumbbell, fa: 'تمرین', en: 'Training' },
  { key: 'grocery', icon: ShoppingBasket, fa: 'خرید', en: 'Grocery' },
  { key: 'calendar', icon: CalendarDays, fa: 'تقویم', en: 'Calendar' },
]

export function PlanPage({
  locale,
  plan,
  preview = false,
  surface,
  lastSyncedAt,
  loadError = false,
  loading = false,
  initialSegment = 'week',
  onRetry,
}: {
  locale: AppLocale
  plan: MomentumPlanView | null
  preview?: boolean
  surface?: PlanSurface
  lastSyncedAt?: string
  loadError?: boolean
  loading?: boolean
  initialSegment?: PlanSegment
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const fa = locale === 'fa'
  const [segment, setSegment] = useState<PlanSegment>(initialSegment)
  const [selectedDate, setSelectedDate] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [mealDetail, setMealDetail] = useState<{ choice: MealChoice; meal: MealSlot } | null>(null)
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutBlock | null>(null)
  const [substitution, setSubstitution] = useState<{ title: string; options: string[]; onConfirm: (name: string) => void } | null>(null)
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Record<string, Set<string>>>({})
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({})
  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>({})
  const [savingSlot, setSavingSlot] = useState('')
  const [mealError, setMealError] = useState('')
  const [substituteNotice, setSubstituteNotice] = useState('')
  const today = currentLocalDate()

  useEffect(() => {
    if (online && plan) writeStoredLastSync()
  }, [online, plan])

  const derived = derivePlanSurface({
    plan,
    online: preview ? (surface === 'offline' ? false : online) : online,
    today,
    loading: loading || surface === 'loading',
    loadError: loadError || surface === 'error',
  })
  const view = surface ?? derived
  const syncedAt = lastSyncedAt ?? readStoredLastSync()
  const mutationsLocked = view === 'offline' || view === 'stale' || view === 'error' || (!preview && !online)

  if (view === 'loading') return <PlanLoadingSkeleton locale={locale} />
  if (view === 'empty' || (!plan && view !== 'error')) return <EmptyPlanState locale={locale} />
  if (view === 'error' && !plan) {
    return <PlanErrorState lastSyncedAt={formatLastSync(syncedAt, locale)} locale={locale} onRetry={onRetry} />
  }
  if (!plan) return <EmptyPlanState locale={locale} />

  const activePlan = plan
  const availableDays = planDays(activePlan)
  const selectedDay = availableDays.find((day) => day.localDate === selectedDate)
    ?? availableDays.find((day) => day.localDate === activePlan.localDate)
    ?? availableDays[0]
  const isToday = selectedDay.localDate === (activePlan.localDate ?? today)
  const version = resolvePlanVersion(activePlan)
  const history = resolvePlanHistory(activePlan)
  const inventoryId = view === 'error' ? 'PLAN-10' : view === 'offline' ? 'PLAN-09' : view === 'stale' ? 'PLAN-09' : showHistory ? 'PLAN-14' : segment === 'week' ? 'PLAN-01' : segment === 'nutrition' ? 'PLAN-02' : segment === 'training' ? 'PLAN-03' : segment === 'grocery' ? 'PLAN-04' : 'PLAN-05'

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: PlanSegment) {
    const currentIndex = PLAN_SEGMENTS.indexOf(current)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? PLAN_SEGMENTS.length - 1
        : event.key === 'ArrowRight' ? (currentIndex + 1) % PLAN_SEGMENTS.length
          : event.key === 'ArrowLeft' ? (currentIndex - 1 + PLAN_SEGMENTS.length) % PLAN_SEGMENTS.length
            : null
    if (nextIndex === null) return
    event.preventDefault()
    const next = PLAN_SEGMENTS[nextIndex]
    setSegment(next)
    setShowHistory(false)
    window.requestAnimationFrame(() => document.getElementById(`plan-tab-${next}`)?.focus())
  }

  async function selectMeal(slotId: string, optionId: string) {
    if (!isToday || mutationsLocked || savingSlot) return
    const meal = selectedDay.meals.find((item) => item.id === slotId)
    if (!meal) return
    const previous = selectedMeals[slotId] ?? meal.selectedOptionId ?? meal.options[0]?.id
    setSelectedMeals((current) => ({ ...current, [slotId]: optionId }))
    setMealError('')
    setSubstituteNotice(optionId === previous
      ? ''
      : (fa ? 'جایگزینی ذخیره شد. فقط همین وعده تغییر کرد؛ برنامه ماه جاری عوض نمی‌شود.' : 'Substitution saved. Only this meal changed; this month’s plan is unchanged.'))
    if (preview) return
    setSavingSlot(slotId)
    try {
      await logMealSelection(selectedDay.localDate, slotId, optionId)
      await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setSelectedMeals((current) => {
        const next = { ...current }
        if (previous) next[slotId] = previous
        else delete next[slotId]
        return next
      })
      setMealError(fa ? 'انتخاب غذا ذخیره نشد؛ دوباره تلاش کن.' : 'The meal choice was not saved. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  async function markMealComplete(slotId: string, optionId: string) {
    if (!isToday || mutationsLocked || savingSlot) return
    setSavingSlot(slotId)
    setMealError('')
    try {
      if (!preview) await completeMeal(selectedDay.localDate, slotId, optionId)
      setCompletedSlots((current) => ({ ...current, [slotId]: true }))
      if (!preview) await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setMealError(fa ? 'ثبت وعده انجام نشد؛ دوباره تلاش کن.' : 'The meal could not be completed. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  const shoppingKey = shoppingPlanKey(activePlan)
  const groceryChecks = checkedShoppingItems[shoppingKey] ?? readShoppingChecks(shoppingKey)

  function toggleShopping(itemKey: string) {
    setCheckedShoppingItems((current) => {
      const next = new Set(current[shoppingKey] ?? readShoppingChecks(shoppingKey))
      if (next.has(itemKey)) next.delete(itemKey)
      else next.add(itemKey)
      writeShoppingChecks(shoppingKey, next)
      return { ...current, [shoppingKey]: next }
    })
  }

  async function shareGrocery() {
    const text = groceryShareText(activePlan.shoppingGroups, (value) => localize(value, locale))
    try {
      if (navigator.share) await navigator.share({ text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <main className="app-page plan-page screen-enter" data-inventory={inventoryId}>
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'برنامه شخصی' : 'Personal plan'} · {localize(selectedDay.dateLabel, locale)}</p>
          <h1>{t('app.planTitle')}</h1>
          <p>{localize(activePlan.monthlyPlanBrief, locale)}</p>
        </div>
        <div className="plan-heading-aside">
          <StatusPill tone="success"><Check size={13} />{fa ? 'برنامه فعال' : 'Active plan'}</StatusPill>
          <Button onClick={() => setShowHistory((current) => !current)} variant="ghost">{version.label} · {fa ? `چرخه ${version.cycle}` : `cycle ${version.cycle}`}</Button>
        </div>
      </section>

      {view === 'offline' ? (
        <div className="inline-notice" role="status">
          <WifiOff size={16} />
          {fa
            ? `نسخه ذخیره‌شده برنامه · آخرین همگام‌سازی ${formatLastSync(syncedAt, locale)} · تا برگشت اتصال فقط‌خواندنی می‌ماند.`
            : `Saved plan copy · last synced ${formatLastSync(syncedAt, locale)} · read-only until connection returns.`}
        </div>
      ) : null}
      {view === 'stale' ? (
        <div className="inline-notice inline-notice--warning" role="status">
          {fa ? 'این نسخه ممکن است تازه نباشد. ثبت تا همگام‌سازی بعدی غیرفعال است.' : 'This copy may be out of date. Logging stays disabled until the plan refreshes.'}
        </div>
      ) : null}
      {view === 'error' ? (
        <div className="inline-notice inline-notice--warning" role="status">
          {fa ? `نسخه تازه دریافت نشد؛ نسخه ذخیره‌شده نمایش داده می‌شود · ${formatLastSync(syncedAt, locale)}` : `The latest plan could not be loaded; showing the cached copy · ${formatLastSync(syncedAt, locale)}`}
          {onRetry ? <Button onClick={onRetry} variant="ghost">{fa ? 'تلاش دوباره' : 'Try again'}</Button> : null}
        </div>
      ) : null}

      <div aria-label={fa ? 'بخش برنامه' : 'Plan section'} className="segmented-control glass-chrome" role="tablist">
        {segmentMeta.map(({ key, icon: Icon, fa: faLabel, en }) => (
          <button
            aria-controls={`plan-panel-${key}`}
            aria-selected={segment === key && !showHistory}
            className={segment === key && !showHistory ? 'is-active' : ''}
            id={`plan-tab-${key}`}
            key={key}
            onClick={() => { setSegment(key); setShowHistory(false) }}
            onKeyDown={(event) => handleTabKeyDown(event, key)}
            role="tab"
            tabIndex={segment === key ? 0 : -1}
            type="button"
          >
            <Icon size={18} />{locale === 'fa' ? faLabel : en}
          </button>
        ))}
      </div>

      {showHistory ? <PlanHistoryView history={history} locale={locale} /> : null}
      {!showHistory && segment === 'week' ? (
        <div aria-labelledby="plan-tab-week" id="plan-panel-week" role="tabpanel">
          <PlanWeekView
            days={availableDays}
            locale={locale}
            onOpenWorkout={() => selectedDay.workout && setWorkoutDetail(selectedDay.workout)}
            onSelectDate={setSelectedDate}
            selectedDay={selectedDay}
          />
        </div>
      ) : null}
      {!showHistory && segment === 'nutrition' ? (
        <div aria-labelledby="plan-tab-nutrition" id="plan-panel-nutrition" role="tabpanel">
          <PlanNutritionView
            completedSlots={completedSlots}
            days={availableDays}
            isToday={isToday}
            locale={locale}
            mutationsLocked={mutationsLocked}
            onCompleteMeal={(slotId, optionId) => void markMealComplete(slotId, optionId)}
            onOpenMeal={(meal, choice) => setMealDetail({ meal, choice })}
            onSelectMeal={(slotId, optionId) => void selectMeal(slotId, optionId)}
            savingSlot={savingSlot}
            selectedDay={selectedDay}
            selectedMeals={selectedMeals}
          />
          {mealError ? <div className="inline-notice inline-notice--error" role="alert">{mealError}</div> : null}
        </div>
      ) : null}
      {!showHistory && segment === 'training' ? (
        <div aria-labelledby="plan-tab-training" id="plan-panel-training" role="tabpanel">
          <PlanTrainingView
            days={availableDays}
            locale={locale}
            onOpenWorkout={setWorkoutDetail}
            selectedDay={selectedDay}
          />
          {selectedDay.workout ? (
            <WorkoutLogger
              enabled={isToday && !mutationsLocked && (preview || online)}
              key={`${selectedDay.localDate}-${selectedDay.workout.id}`}
              locale={locale}
              localDate={selectedDay.localDate}
              preview={preview}
              workout={selectedDay.workout}
            />
          ) : null}
        </div>
      ) : null}
      {!showHistory && segment === 'grocery' ? (
        <div aria-labelledby="plan-tab-grocery" id="plan-panel-grocery" role="tabpanel">
          <PlanGroceryView
            checkedItems={groceryChecks}
            locale={locale}
            onShare={() => void shareGrocery()}
            onToggle={toggleShopping}
            plan={activePlan}
          />
        </div>
      ) : null}
      {!showHistory && segment === 'calendar' ? (
        <div aria-labelledby="plan-tab-calendar" id="plan-panel-calendar" role="tabpanel">
          <PlanCalendarView
            days={availableDays}
            locale={locale}
            onSelectDate={setSelectedDate}
            selectedDay={selectedDay}
            version={version}
          />
        </div>
      ) : null}

      {substituteNotice ? <div className="inline-notice" role="status">{substituteNotice}</div> : null}
      {!showHistory ? <PlanVersionView locale={locale} onOpenHistory={() => setShowHistory(true)} version={version} /> : null}

      {mealDetail ? (
        <LazyOverlay>
        <MealDetailSheet
          alternatives={mealDetail.meal.options}
          choice={mealDetail.choice}
          locale={locale}
          mealLabel={localize(mealDetail.meal.label, locale)}
          onClose={() => setMealDetail(null)}
          onSelectAlternative={(choice) => {
            void selectMeal(mealDetail.meal.id, choice.id)
            setMealDetail({ meal: mealDetail.meal, choice })
          }}
          readOnly={!isToday || mutationsLocked}
        />
        </LazyOverlay>
      ) : null}
      {workoutDetail ? (
        <LazyOverlay>
        <WorkoutDetailSheet
          locale={locale}
          onClose={() => setWorkoutDetail(null)}
          onSubstitute={(_exerciseKey, name) => {
            setWorkoutDetail(null)
            setSubstitution({
              title: name,
              options: [name],
              onConfirm: () => {
                setSubstituteNotice(fa ? 'جایگزین همان الگوی حرکتی ذخیره شد. برنامه ماهانه بازتولید نمی‌شود.' : 'Same movement-pattern substitute saved. The monthly plan is not regenerated.')
                setSubstitution(null)
              },
            })
          }}
          readOnly={mutationsLocked}
          workout={workoutDetail}
        />
        </LazyOverlay>
      ) : null}
      {substitution ? (
        <LazyOverlay>
        <PlanSubstitutionSheet
          consequence={fa ? 'این تغییر فقط همین جلسه را عوض می‌کند و برنامه ماهانه بازتولید نمی‌شود.' : 'This changes only this session and does not regenerate the monthly plan.'}
          locale={locale}
          onClose={() => setSubstitution(null)}
          onConfirm={(name) => substitution.onConfirm(name)}
          options={substitution.options}
          title={substitution.title}
        />
        </LazyOverlay>
      ) : null}
    </main>
  )
}
