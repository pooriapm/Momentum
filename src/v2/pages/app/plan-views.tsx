import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Eye,
  ListChecks,
  RefreshCw,
  Utensils,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localize, type MealChoice, type MealSlot, type MomentumPlanDayView, type MomentumPlanView, type PlanVersionMeta, type WorkoutBlock } from '../../data/types'
import { formatClock, formatNumber, formatReps } from '../../lib/format'
import { calendarMonthTitle, calendarParts, formatLocalizedDate } from '../../ui/localized-date'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import {
  adjacentVisibleDate,
  applyExerciseSubstitutes,
  formatPlanInterval,
  formatReadyAt,
  nextUnplannedDate,
  visibleDatesInWeek,
  weekdayLabels,
  weekIsoDates,
} from './plan-state'

export function PlanLoadingSkeleton({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  return (
    <main aria-busy="true" aria-label={fa ? 'در حال بارگذاری برنامه' : 'Loading plan'} className="app-page plan-page plan-page--loading screen-enter" data-inventory="PLAN-08">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow">{fa ? 'در حال بارگذاری' : 'Loading'}</p>
          <h1>{fa ? 'برنامه در حال آماده‌شدن برای نمایش است' : 'Loading your plan'}</h1>
        </div>
      </section>
      <div className="plan-skeleton-tabs" />
      <div className="plan-week">{Array.from({ length: 7 }, (_, index) => <span className="plan-week__day plan-skeleton-day" key={index} />)}</div>
      <div className="plan-skeleton-grid">
        <div className="plan-skeleton-card plan-skeleton-card--wide" />
        <div className="plan-skeleton-card" />
      </div>
      <p className="plan-skeleton-note">{fa ? 'در حال بارگذاری برنامه هفته…' : 'Loading your week…'}</p>
    </main>
  )
}

export function PlanErrorState({
  locale,
  lastSyncedAt,
  onRetry,
  onViewCached,
}: {
  locale: AppLocale
  lastSyncedAt?: string
  onRetry?: () => void
  onViewCached?: () => void
}) {
  const fa = locale === 'fa'
  return (
    <main className="app-page plan-page screen-enter" data-inventory="PLAN-10">
      <ContentCard className="plan-status-card">
        <span className="plan-status-card__icon is-warning"><AlertTriangle size={28} /></span>
        <p className="orbit-eyebrow">{fa ? 'وضعیت برنامه' : 'Plan status'}</p>
        <h1>{fa ? 'نسخه تازه دریافت نشد' : 'The latest plan could not be loaded'}</h1>
        <p>{fa ? 'آخرین نسخه ذخیره‌شده سالم است. می‌توانی آن را ببینی یا دوباره برای به‌روزرسانی تلاش کنی.' : 'Your last saved version is safe. View it or retry the update.'}</p>
        {lastSyncedAt ? (
          <div className="inline-notice" role="status">
            <CheckCircle2 size={16} />
            {fa ? `نسخه ذخیره‌شده همچنان در دسترس است · آخرین همگام‌سازی ${lastSyncedAt}` : `Your cached version remains available · last synced ${lastSyncedAt}`}
          </div>
        ) : null}
        <div className="plan-status-actions">
          <Button onClick={() => (onRetry ? onRetry() : window.location.reload())}><RefreshCw size={16} />{fa ? 'تلاش دوباره' : 'Try again'}</Button>
          {onViewCached ? <Button onClick={onViewCached} variant="secondary">{fa ? 'بازکردن نسخه ذخیره‌شده' : 'Open cached plan'}</Button> : null}
        </div>
      </ContentCard>
    </main>
  )
}

export function NextCycleNote({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  return (
    <ContentCard className="plan-overview-card">
      <StatusPill tone="brand">{fa ? 'دوره بعد' : 'Next period'}</StatusPill>
      <h2>{fa ? 'در دوره جدید، با توجه به بازخوردت از برنامه ماه گذشته ایجاد می‌شود.' : 'In the next period, this day is created from your feedback on last month’s plan.'}</h2>
    </ContentCard>
  )
}

function PlanDayStrip({
  locale,
  selectedDay,
  days,
  today,
  onSelectDate,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  today: string
  onSelectDate: (iso: string) => void
}) {
  const fa = locale === 'fa'
  const labels = weekdayLabels(locale)
  const weekDates = weekIsoDates(selectedDay.localDate, locale)
  const visibleDates = visibleDatesInWeek(days, selectedDay.localDate, today, locale)
  const byDate = new Map(days.map((day) => [day.localDate, day]))
  const cycleDate = nextUnplannedDate(days)
  const previousDate = adjacentVisibleDate(days, selectedDay.localDate, today, -1, locale)
  const nextDate = adjacentVisibleDate(days, selectedDay.localDate, today, 1, locale)
  const [weekSlide, setWeekSlide] = useState<'next' | 'previous' | null>(null)
  const parts = calendarParts(selectedDay.localDate, locale)
  const nextCycle = selectedDay.localDate === cycleDate

  function openWeek(date: string | null, direction: 'next' | 'previous') {
    if (!date) return
    setWeekSlide(direction)
    onSelectDate(date)
  }

  return (
    <div className="plan-day-picker">
      <p className="plan-day-picker__hint" id="plan-day-hint">{fa ? 'یک روز را انتخاب کن' : 'Choose a day'}</p>
      <div className="plan-week-toolbar">
        <Button aria-label={fa ? 'هفته قبل' : 'Previous week'} disabled={!previousDate} onClick={() => openWeek(previousDate, 'previous')} type="button" variant="ghost">{fa ? 'قبل' : 'Prev'}</Button>
        <p className="plan-day-picker__month">{calendarMonthTitle(parts.year, parts.month, locale)}</p>
        <Button aria-label={fa ? 'هفته بعد' : 'Next week'} disabled={!nextDate} onClick={() => openWeek(nextDate, 'next')} type="button" variant="ghost">{fa ? 'بعد' : 'Next'}</Button>
      </div>
      <div className="plan-week-viewport">
        <div className={`plan-week-stage${weekSlide ? ` is-${weekSlide}` : ''}`} key={weekDates[0]}>
          <div
            aria-labelledby="plan-day-hint"
            className="plan-week"
            role="group"
            style={{ gridTemplateColumns: `repeat(${Math.max(visibleDates.length, 1)}, minmax(0, 1fr))` }}
          >
            {visibleDates.map((iso) => {
              const day = byDate.get(iso)
              const active = iso === selectedDay.localDate
              const isCycle = iso === cycleDate
              const labelIndex = Math.max(0, weekDates.indexOf(iso))
              const dayNumber = formatNumber(calendarParts(iso, locale).day, locale, { useGrouping: false })
              return (
                <button
                  aria-current={active ? 'date' : undefined}
                  aria-pressed={active}
                  className={`plan-week__day${active ? ' is-active' : ''}${day?.workout ? ' is-workout' : ''}${isCycle ? ' is-next-cycle' : ''}`}
                  key={iso}
                  onClick={() => onSelectDate(iso)}
                  type="button"
                >
                  <strong>{labels[labelIndex]}</strong>
                  <em className="plan-week__date">{dayNumber}</em>
                  <small>{isCycle ? (fa ? 'دوره بعد' : 'Next period') : iso === today ? (fa ? 'امروز' : 'Today') : day?.workout ? (fa ? 'تمرین' : 'Workout') : (fa ? 'بازیابی' : 'Recovery')}</small>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <p className="plan-day-picker__chosen">
        <span>{fa ? 'روز انتخاب‌شده' : 'Selected day'}</span>
        <strong>{nextCycle ? (fa ? 'دوره بعد' : 'Next period') : formatLocalizedDate(selectedDay.localDate, locale)}</strong>
      </p>
    </div>
  )
}

export function PlanWeekView({
  locale,
  selectedDay,
  days,
  today,
  nextCycle = false,
  onSelectDate,
  onOpenWorkout,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  today: string
  nextCycle?: boolean
  onSelectDate: (iso: string) => void
  onOpenWorkout: () => void
}) {
  const fa = locale === 'fa'
  const todayWorkout = nextCycle ? null : selectedDay.workout
  const viewingToday = !nextCycle && selectedDay.localDate === today
  const weekDetail: ReactNode = nextCycle ? <NextCycleNote locale={locale} /> : (
    <div className="plan-overview-grid">
      <ContentCard className="plan-overview-card">
        <StatusPill tone="brand"><Dumbbell size={14} /> {viewingToday ? (fa ? 'تمرین امروز' : 'Today’s workout') : (fa ? 'تمرین این روز' : 'Workout for this day')}</StatusPill>
        {todayWorkout ? (
          <>
            <h2>{localize(todayWorkout.name, locale)}</h2>
            <p>{formatNumber(todayWorkout.exercises, locale)} {fa ? 'حرکت' : 'exercises'} · {formatNumber(todayWorkout.durationMinutes, locale)} {fa ? 'دقیقه' : 'min'}</p>
            <Button onClick={onOpenWorkout}>{fa ? 'دیدن تمرین' : 'View workout'}</Button>
          </>
        ) : (
          <>
            <h2>{fa ? 'روز بازیابی' : 'Recovery day'}</h2>
            <p>{fa ? 'برای این روز تمرین برنامه‌ریزی نشده است.' : 'No workout is scheduled for this day.'}</p>
          </>
        )}
      </ContentCard>
      <ContentCard>
        <StatusPill tone="energy"><Utensils size={14} /> {formatNumber(selectedDay.meals.length, locale)} {fa ? 'وعده' : 'meals'}</StatusPill>
        <h2>{localize(selectedDay.dateLabel, locale)}</h2>
        <p>{fa ? 'وعده‌های همین روز' : 'Meals on this day'}</p>
      </ContentCard>
    </div>
  )

  return (
    <div className="plan-stack" data-inventory="PLAN-01">
      <PlanDayStrip days={days} locale={locale} onSelectDate={onSelectDate} selectedDay={selectedDay} today={today} />
      {weekDetail}
    </div>
  )
}

export function PlanNutritionView({
  locale,
  selectedDay,
  days,
  today,
  selectedMeals,
  completedSlots,
  savingSlot,
  mutationsLocked,
  isToday,
  onSelectDate,
  onSelectMeal,
  onCompleteMeal,
  onOpenMeal,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  today: string
  selectedMeals: Record<string, string>
  completedSlots: Record<string, boolean>
  savingSlot: string
  mutationsLocked: boolean
  isToday: boolean
  onSelectDate: (iso: string) => void
  onSelectMeal: (slotId: string, optionId: string) => void
  onCompleteMeal: (slotId: string, optionId: string) => void
  onOpenMeal: (meal: MealSlot, choice: MealChoice) => void
}) {
  const fa = locale === 'fa'
  return (
    <div className="plan-stack" data-inventory="PLAN-02">
      <PlanDayStrip days={days} locale={locale} onSelectDate={onSelectDate} selectedDay={selectedDay} today={today} />
      {!isToday ? <p className="inline-notice">{fa ? 'این پیش‌نمایش روز آینده است؛ انتخاب و ثبت وعده در همان روز فعال می‌شود.' : 'This is a future-day preview. Selection and completion unlock on that day.'}</p> : null}
      <div className="plan-meal-list">
        {selectedDay.meals.map((meal) => {
          const selectedOptionId = selectedMeals[meal.id] ?? meal.selectedOptionId ?? meal.options[0]?.id
          const selectedOption = meal.options.find((option) => option.id === selectedOptionId) ?? meal.options[0]
          const completed = completedSlots[meal.id] || meal.completionStatus === 'completed'
          return (
            <ContentCard className="plan-meal-row" key={meal.id}>
              <div className="plan-meal-row__time"><strong><bdi dir="ltr">{formatClock(meal.time, locale)}</bdi></strong><small>{localize(meal.label, locale)}</small></div>
              <div className="plan-meal-row__body">
                <div className="plan-meal-row__options">
                  {meal.options.map((option, index) => {
                    const isSelected = option.id === selectedOption.id
                    return (
                      <div className={isSelected ? 'plan-meal-option is-selected' : 'plan-meal-option'} key={option.id}>
                        <button
                          aria-pressed={isSelected}
                          className="plan-meal-option__select"
                          disabled={!isToday || completed || mutationsLocked || Boolean(savingSlot)}
                          onClick={() => onSelectMeal(meal.id, option.id)}
                          type="button"
                        >
                          <span>{isSelected ? <Check size={14} /> : formatNumber(index + 1, locale)}</span>
                          <span><strong>{localize(option.name, locale)}</strong><small className="metric-run"><bdi dir={fa ? 'rtl' : 'ltr'}>{formatNumber(option.nutrition.calories, locale)} kcal</bdi></small></span>
                        </button>
                        {isSelected ? <button aria-label={fa ? `جزئیات ${localize(option.name, locale)}` : `${localize(option.name, locale)} details`} className="plan-meal-option__details" onClick={() => onOpenMeal(meal, option)} type="button"><Eye size={17} /></button> : null}
                      </div>
                    )
                  })}
                </div>
                {isToday ? (
                  <div className="plan-meal-row__actions">
                    <span>{completed ? (fa ? 'ثبت شد' : 'Completed') : (fa ? 'یکی را انتخاب کن' : 'Pick one')}</span>
                    <Button disabled={completed || mutationsLocked} loading={savingSlot === meal.id} onClick={() => onCompleteMeal(meal.id, selectedOption.id)}><Check size={16} />{completed ? (fa ? 'ثبت شد' : 'Completed') : (fa ? 'ثبت' : 'Complete')}</Button>
                  </div>
                ) : null}
              </div>
            </ContentCard>
          )
        })}
      </div>
    </div>
  )
}

export function PlanTrainingView({
  locale,
  selectedDay,
  days,
  today,
  substitutes = {},
  onSelectDate,
  onOpenWorkout,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  today: string
  substitutes?: Record<string, string>
  onSelectDate: (iso: string) => void
  onOpenWorkout: (workout: WorkoutBlock) => void
}) {
  const fa = locale === 'fa'
  const workout = selectedDay.workout ? applyExerciseSubstitutes(selectedDay.workout, substitutes) : null
  const workoutDays = days.filter((day) => day.workout).length
  return (
    <div className="plan-stack" data-inventory="PLAN-03">
      <PlanDayStrip days={days} locale={locale} onSelectDate={onSelectDate} selectedDay={selectedDay} today={today} />
      <p className="plan-training-count">{fa ? `${formatNumber(workoutDays, locale)} روز تمرین در این دوره` : `${workoutDays} workout days this period`}</p>
      {workout ? (
        <ContentCard className="workout-detail-card">
          <div className="plan-training-title">
            <StatusPill tone="energy">{intensityLabel(workout.intensity, locale)}</StatusPill>
            <h2>{localize(workout.name, locale)}</h2>
            <p>{localize(workout.focus, locale)}</p>
          </div>
          <div className="workout-detail-card__metrics">
            <span><Clock3 size={18} /><strong>{formatNumber(workout.durationMinutes, locale)} {fa ? 'دقیقه' : 'min'}</strong></span>
            <span><ListChecks size={18} /><strong>{formatNumber(workout.exercises, locale)} {fa ? 'حرکت' : 'exercises'}</strong></span>
          </div>
          {workout.equipment?.length ? <p>{fa ? 'تجهیزات: ' : 'Equipment: '}{workout.equipment.map((item) => localize(item, locale)).join(' · ')}</p> : null}
          <ol>{workout.exerciseDetails.map((item) => (
            <li key={item.key}>
              <div className="plan-exercise">
                <strong>{localize(item.name, locale)}</strong>
                <ExerciseDose locale={locale} reps={item.reps} restSeconds={item.restSeconds} sets={item.sets} />
              </div>
            </li>
          ))}</ol>
          <Button onClick={() => onOpenWorkout(workout)}>{fa ? 'جزئیات حرکت‌ها' : 'Exercise details'}</Button>
        </ContentCard>
      ) : (
        <ContentCard>
          <h2>{fa ? 'روز استراحت و ریکاوری' : 'Rest and recovery day'}</h2>
          <p>{fa ? 'برای این روز تمرین برنامه‌ریزی نشده است.' : 'No workout is scheduled for this day.'}</p>
        </ContentCard>
      )}
    </div>
  )
}

export function PlanGroceryView({
  locale,
  plan,
  checkedItems,
  onToggle,
  onShare,
}: {
  locale: AppLocale
  plan: MomentumPlanView
  checkedItems: Set<string>
  onToggle: (key: string) => void
  onShare: () => void
}) {
  const fa = locale === 'fa'
  return (
    <div className="plan-grocery" data-inventory="PLAN-04">
      <ContentCard className="plan-grocery__list">
        <div className="shopping-grid">
          {plan.shoppingGroups.map((group) => (
            <section key={group.id}>
              <h3>{localize(group.name, locale)}</h3>
              <ul>
                {group.items.map((item, index) => {
                  const itemKey = `${group.id}-${index}`
                  const checked = checkedItems.has(itemKey)
                  return (
                    <li className={checked ? 'is-checked' : ''} key={itemKey}>
                      <button aria-pressed={checked} onClick={() => onToggle(itemKey)} type="button">
                        <span aria-hidden="true" className="plan-check">{checked ? <Check size={13} strokeWidth={3} /> : null}</span>
                        <strong>{localize(item, locale)}</strong>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </ContentCard>
      <ContentCard className="plan-grocery-share">
        <div>
          <h2>{fa ? 'اشتراک‌گذاری فهرست خرید' : 'Share the shopping list'}</h2>
          <p>{fa
            ? 'فهرست را برای کسی بفرست. مقدارها برای یک نفر است. تیک‌ها فقط روی همین دستگاه می‌مانند و به سرور فرستاده نمی‌شوند.'
            : 'Send this list to someone. Quantities cover one person. Checkmarks stay on this device and are not sent to the server.'}</p>
        </div>
        <Button onClick={onShare}>{fa ? 'اشتراک‌گذاری فهرست' : 'Share list'}</Button>
      </ContentCard>
    </div>
  )
}

export function PlanVersionView({ locale, version, onOpenHistory }: { locale: AppLocale; version: PlanVersionMeta; onOpenHistory: () => void }) {
  const fa = locale === 'fa'
  return (
    <div className="plan-overview-grid" data-inventory="PLAN-06">
      <ContentCard className="plan-overview-card">
        <div className="inline-notice" role="status">
          <CheckCircle2 size={16} />
          {fa ? 'این برنامه فعلی توست. ترجیحات جدید برای دوره بعد ذخیره می‌شوند.' : 'This is your current plan. New preferences are saved for your next cycle.'}
        </div>
        <ul className="plan-pattern-list">
          {version.changes.map((change) => (
            <li key={change.label.en}><Check size={16} /><div><strong>{localize(change.label, locale)}</strong><small>{localize(change.detail, locale)}</small></div></li>
          ))}
        </ul>
      </ContentCard>
      <ContentCard>
        <StatusPill tone="brand">{version.label} · {fa ? 'فعال' : 'Active'}</StatusPill>
        <h2>{fa ? 'ردیابی نسخه' : 'Version trace'}</h2>
        <p>{fa
          ? `${version.label} · چرخه ${formatNumber(version.cycle, locale)} · ${formatPlanInterval(version.validFrom, version.validTo, locale)} · آماده ${formatReadyAt(version.readyAt, locale)}`
          : `${version.label} · cycle ${version.cycle} · ${formatPlanInterval(version.validFrom, version.validTo, locale)} · ready ${formatReadyAt(version.readyAt, locale)}`}</p>
        <p>{localize(version.source, locale)}</p>
        <Button onClick={onOpenHistory} variant="secondary">{fa ? 'مقایسه با نسخه قبلی' : 'Compare with previous version'}</Button>
      </ContentCard>
    </div>
  )
}

export function PlanHistoryView({ locale, history }: { locale: AppLocale; history: PlanVersionMeta[] }) {
  const fa = locale === 'fa'
  const active = history.find((item) => item.active) ?? history[0]
  const prior = history.find((item) => !item.active)
  return (
    <div className="plan-overview-grid" data-inventory="PLAN-14">
      <ContentCard className="plan-overview-card">
        <p className="orbit-eyebrow">{fa ? 'نسخه‌های تغییرناپذیر' : 'Immutable versions'}</p>
        <h2>{fa ? 'تفاوت دوره جاری با قبلی' : 'What changed from the prior period'}</h2>
        <p>{fa ? 'هر نسخه به چرخه و بازه اثر خودش متصل است و پس از فعال‌شدن ویرایش نمی‌شود.' : 'Every version is tied to its source cycle and effective interval and is not edited after activation.'}</p>
        {active?.changes.length ? (
          <ul className="plan-pattern-list">
            {active.changes.map((change) => (
              <li key={change.label.en}><Check size={16} /><div><strong>{localize(change.label, locale)}</strong><small>{localize(change.detail, locale)}</small></div></li>
            ))}
          </ul>
        ) : (
          <p>{fa ? 'این اولین نسخه فعال است؛ تفاوت دوره‌ای برای نمایش نیست.' : 'This is the first active version; there is no prior cycle diff yet.'}</p>
        )}
      </ContentCard>
      <ContentCard>
        <StatusPill tone="brand">{active?.label} · {fa ? 'فعال' : 'Active'}</StatusPill>
        <h2>{active ? formatPlanInterval(active.validFrom, active.validTo, locale) : '—'}</h2>
        <p>{active ? localize(active.source, locale) : ''}</p>
        {prior ? <p>{fa ? `نسخه قبلی ${prior.label} · چرخه ${formatNumber(prior.cycle, locale)}` : `Prior ${prior.label} · cycle ${prior.cycle}`}</p> : null}
      </ContentCard>
    </div>
  )
}

function intensityLabel(value: WorkoutBlock['intensity'], locale: AppLocale) {
  const labels = {
    low: { fa: 'سبک', en: 'Low' },
    moderate: { fa: 'متوسط', en: 'Moderate' },
    high: { fa: 'سنگین', en: 'High' },
  }
  return labels[value][locale]
}

function ExerciseDose({
  sets,
  reps,
  restSeconds,
  locale,
}: {
  sets: number
  reps: string
  restSeconds: number
  locale: AppLocale
}) {
  const fa = locale === 'fa'
  return (
    <span className="metric-run">
      <bdi dir={fa ? 'rtl' : 'ltr'}>{formatNumber(sets, locale)} × {formatReps(reps, locale)}</bdi>
      {' · '}
      {fa
        ? <bdi>{formatNumber(restSeconds, locale)} ثانیه</bdi>
        : <bdi dir="ltr">{formatNumber(restSeconds, locale)}s</bdi>}
    </span>
  )
}

