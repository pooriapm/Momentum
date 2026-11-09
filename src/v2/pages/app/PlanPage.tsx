import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  Dumbbell,
  Salad,
  ShoppingBasket,
  WifiOff,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { eventContext, trackProductEvent } from '../../analytics/events'
import { MealDetailSheet, PlanSubstitutionSheet, WorkoutDetailSheet, LazyOverlay } from '../../components/LazyOverlay'
import { WorkoutLogger } from '../../components/WorkoutLogger'
import { completeMeal, currentLocalDate, logMealSelection } from '../../data/repository'
import { localize, type MealChoice, type MealSlot, type MomentumPlanView, type WorkoutBlock } from '../../data/types'
import { Button, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'
import { MemberFeatureLock } from './MemberFeatureLock'
import { ShoppingLedger } from './ShoppingLedger'
import { deriveMembershipStatus } from './me-state'
import { hasMemberFeatures } from '../../entitlement'
import {
  applyExerciseSubstitutes,
  derivePlanSurface,
  formatLastSync,
  groceryShareText,
  planDays,
  readShoppingChecks,
  readStoredLastSync,
  nextUnplannedDate,
  shoppingPlanKey,
  type PlanSegment,
  type PlanSurface,
  writeShoppingChecks,
  writeStoredLastSync,
} from './plan-state'
import {
  NextCycleNote,
  PlanErrorState,
  PlanGroceryView,
  PlanLoadingSkeleton,
  PlanNutritionView,
  PlanTrainingView,
  PlanWeekView,
} from './plan-views'
import { Page, PageHeader } from '../../ui/layout'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Notice } from '../../ui/feedback'
import '../../../styles/plan.css'

const segmentMeta: Array<{ key: PlanSegment; icon: typeof Salad; fa: string; en: string }> = [
  { key: 'week', icon: CalendarDays, fa: 'هفته', en: 'Week' },
  { key: 'nutrition', icon: Salad, fa: 'تغذیه', en: 'Nutrition' },
  { key: 'training', icon: Dumbbell, fa: 'تمرین', en: 'Training' },
  { key: 'grocery', icon: ShoppingBasket, fa: 'خرید', en: 'Grocery' },
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
  const [mealDetail, setMealDetail] = useState<{ choice: MealChoice; meal: MealSlot } | null>(null)
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutBlock | null>(null)
  const [substitution, setSubstitution] = useState<{ title: string; options: string[]; onConfirm: (name: string) => void } | null>(null)
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Record<string, Set<string>>>({})
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({})
  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>({})
  const [savingSlot, setSavingSlot] = useState('')
  const [mealError, setMealError] = useState('')
  const [substituteNotice, setSubstituteNotice] = useState('')
  const [exerciseSubstitutes, setExerciseSubstitutes] = useState<Record<string, Record<string, string>>>({})
  const [swapLocked, setSwapLocked] = useState(false)
  const memberFeatures = hasMemberFeatures(deriveMembershipStatus(plan), preview)
  const planViewTracked = useRef(false)
  const today = currentLocalDate(plan?.timezone)

  useEffect(() => {
    if (online && plan) writeStoredLastSync()
  }, [online, plan])

  useEffect(() => {
    if (preview || !online || !plan || planViewTracked.current) return
    planViewTracked.current = true
    trackProductEvent({ ...eventContext(locale, plan.progress.productRegion), event_name: 'plan_viewed', surface: 'plan', action_kind: 'plan', outcome: 'viewed' })
  }, [locale, online, plan, preview])

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
  const cycleDate = nextUnplannedDate(availableDays)
  const showingNextCycle = Boolean(cycleDate && selectedDate === cycleDate)
  const upcomingDays = availableDays.filter((day) => day.localDate >= today)
  const selectedPlanDay = availableDays.find((day) => day.localDate === selectedDate && day.localDate >= today)
    ?? upcomingDays.find((day) => day.localDate === (activePlan.localDate && activePlan.localDate >= today ? activePlan.localDate : ''))
    ?? upcomingDays[0]
    ?? availableDays[availableDays.length - 1]!
  const selectedDay = showingNextCycle && cycleDate
    ? { ...selectedPlanDay, localDate: cycleDate, meals: [], workout: null, dateLabel: { fa: 'دوره بعد', en: 'Next period' } }
    : selectedPlanDay
  const isToday = !showingNextCycle && selectedDay.localDate === (activePlan.localDate ?? today)
  const inventoryId = view === 'error' ? 'PLAN-10' : view === 'offline' ? 'PLAN-09' : view === 'stale' ? 'PLAN-09' : segment === 'week' ? 'PLAN-01' : segment === 'nutrition' ? 'PLAN-02' : segment === 'training' ? 'PLAN-03' : 'PLAN-04'

  async function selectMeal(slotId: string, optionId: string) {
    if (!isToday || mutationsLocked || savingSlot) return
    const meal = selectedDay.meals.find((item) => item.id === slotId)
    if (!meal) return
    const previous = selectedMeals[slotId] ?? meal.selectedOptionId ?? meal.options[0]?.id
    if (!memberFeatures) {
      setSwapLocked(optionId !== previous)
      return
    }
    setSelectedMeals((current) => ({ ...current, [slotId]: optionId }))
    setMealError('')
    setSubstituteNotice('')
    const successNotice = optionId === previous ? '' : (fa ? 'جایگزینی ذخیره شد. فقط همین وعده تغییر کرد؛ برنامه ماه جاری عوض نمی‌شود.' : 'Substitution saved. Only this meal changed; this month’s plan is unchanged.')
    if (preview) { setSubstituteNotice(successNotice); return }
    setSavingSlot(slotId)
    try {
      await logMealSelection(selectedDay.localDate, slotId, optionId)
      setSubstituteNotice(successNotice)
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
  const hasShoppingLedger = Boolean(activePlan.days?.some((day) => day.meals.some((meal) => meal.options.some((option) => option.ingredients?.length))))
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
    <Page name="plan" data-inventory={inventoryId}>
      <PageHeader
        eyebrow={<>{fa ? 'برنامه شخصی' : 'Personal plan'} · {showingNextCycle ? (fa ? 'دوره بعد' : 'Next period') : localize(selectedDay.dateLabel, locale)}</>}
        title={t('app.planTitle')}
        description={localize(activePlan.monthlyPlanBrief, locale)}
        actions={<><StatusPill tone="success"><Check size={13} />{fa ? 'برنامه فعال' : 'Active plan'}</StatusPill></>}
      />

      {view === 'offline' ? (
        <Notice>
          <WifiOff size={16} />
          {fa
            ? `نسخه ذخیره‌شده برنامه · آخرین همگام‌سازی ${formatLastSync(syncedAt, locale)} · تا برگشت اتصال فقط‌خواندنی می‌ماند.`
            : `Saved plan copy · last synced ${formatLastSync(syncedAt, locale)} · read-only until connection returns.`}
        </Notice>
      ) : null}
      {view === 'stale' ? (
        <Notice tone="warning">
          {fa ? 'این نسخه ممکن است تازه نباشد. ثبت تا همگام‌سازی بعدی غیرفعال است.' : 'This copy may be out of date. Logging stays disabled until the plan refreshes.'}
        </Notice>
      ) : null}
      {view === 'error' ? (
        <Notice tone="warning">
          {fa ? `نسخه تازه دریافت نشد؛ نسخه ذخیره‌شده نمایش داده می‌شود · ${formatLastSync(syncedAt, locale)}` : `The latest plan could not be loaded; showing the cached copy · ${formatLastSync(syncedAt, locale)}`}
          {onRetry ? <Button onClick={onRetry} variant="ghost">{fa ? 'تلاش دوباره' : 'Try again'}</Button> : null}
        </Notice>
      ) : null}

      <SegmentedControl
        className="plan-view-switch"
        idPrefix="plan"
        items={segmentMeta.map(({ key, icon: Icon, fa: faLabel, en }) => ({ value: key, label: fa ? faLabel : en, icon: <Icon size={18} /> }))}
        label={fa ? 'بخش برنامه' : 'Plan section'}
        onChange={setSegment}
        value={segment}
      />

      {segment === 'week' ? (
        <div aria-labelledby="plan-tab-week" className="motion-panel" id="plan-panel-week" role="tabpanel">
          <PlanWeekView
            days={availableDays}
            locale={locale}
            onOpenWorkout={() => {
              const workout = selectedDay.workout
                ? applyExerciseSubstitutes(selectedDay.workout, exerciseSubstitutes[selectedDay.localDate] ?? {})
                : null
              if (workout) setWorkoutDetail(workout)
            }}
            onSelectDate={setSelectedDate}
            nextCycle={showingNextCycle}
            selectedDay={selectedDay}
            today={today}
          />
        </div>
      ) : null}
      {segment === 'nutrition' ? (
        <div aria-labelledby="plan-tab-nutrition" className="motion-panel" id="plan-panel-nutrition" role="tabpanel">
          {showingNextCycle ? <NextCycleNote locale={locale} /> : <PlanNutritionView
            completedSlots={completedSlots}
            days={availableDays}
            isToday={isToday}
            locale={locale}
            mutationsLocked={mutationsLocked}
            onCompleteMeal={(slotId, optionId) => void markMealComplete(slotId, optionId)}
            onOpenMeal={(meal, choice) => setMealDetail({ meal, choice })}
            onSelectDate={setSelectedDate}
            onSelectMeal={(slotId, optionId) => void selectMeal(slotId, optionId)}
            savingSlot={savingSlot}
            selectedDay={selectedDay}
            selectedMeals={selectedMeals}
            today={today}
          />}
          {mealError ? <Notice tone="error">{mealError}</Notice> : null}
        </div>
      ) : null}
      {segment === 'training' ? (
        <div aria-labelledby="plan-tab-training" className="motion-panel" id="plan-panel-training" role="tabpanel">
          {showingNextCycle ? <NextCycleNote locale={locale} /> : <PlanTrainingView
            days={availableDays}
            locale={locale}
            onOpenWorkout={setWorkoutDetail}
            onSelectDate={setSelectedDate}
            selectedDay={selectedDay}
            substitutes={exerciseSubstitutes[selectedDay.localDate]}
            today={today}
          />}
          {!showingNextCycle && selectedDay.workout ? (
            <WorkoutLogger
              enabled={isToday && !mutationsLocked && (preview || online)}
              key={`${selectedDay.localDate}-${selectedDay.workout.id}`}
              locale={locale}
              localDate={selectedDay.localDate}
              preview={preview}
              workout={applyExerciseSubstitutes(selectedDay.workout, exerciseSubstitutes[selectedDay.localDate] ?? {})}
            />
          ) : null}
        </div>
      ) : null}
      {segment === 'grocery' ? (
        <div aria-labelledby="plan-tab-grocery" className="motion-panel" id="plan-panel-grocery" role="tabpanel">
          {memberFeatures && hasShoppingLedger ? (
            <ShoppingLedger locale={locale} plan={activePlan} preview={preview} today={activePlan.localDate ?? today} />
          ) : memberFeatures ? (
            <PlanGroceryView
              checkedItems={groceryChecks}
              locale={locale}
              onShare={() => void shareGrocery()}
              onToggle={toggleShopping}
              plan={activePlan}
            />
          ) : <MemberFeatureLock feature="shopping-list" locale={locale} />}
        </div>
      ) : null}

      {swapLocked ? <MemberFeatureLock compact feature="meal-swaps" locale={locale} /> : null}
      {substituteNotice ? <Notice>{substituteNotice}</Notice> : null}

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
            // Free members see why the swap didn't happen instead of a choice that wasn't saved.
            setMealDetail(memberFeatures ? { meal: mealDetail.meal, choice } : null)
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
          onSubstitute={(exerciseKey, name) => {
            const localDate = selectedDay.localDate
            setWorkoutDetail(null)
            setSubstitution({
              title: name,
              options: [name],
              onConfirm: () => {
                setExerciseSubstitutes((current) => ({
                  ...current,
                  [localDate]: { ...current[localDate], [exerciseKey]: name },
                }))
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
    </Page>
  )
}
