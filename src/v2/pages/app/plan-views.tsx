import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Dumbbell,
  Eye,
  ListChecks,
  RefreshCw,
  ShoppingBasket,
  Utensils,
  WifiOff,
} from 'lucide-react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localize, type MealChoice, type MealSlot, type MomentumPlanDayView, type MomentumPlanView, type PlanVersionMeta, type WorkoutBlock } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { calendarParts, formatLocalizedDate, GREGORIAN_WEEKDAYS, monthGrid, PERSIAN_WEEKDAYS } from '../../ui/localized-date'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import {
  formatPlanInterval,
  formatReadyAt,
  isWithinInterval,
  planWeeks,
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
      <p className="plan-skeleton-note">{fa ? 'هندسه دقیق نمای هفته حفظ شده است' : 'The final Week-view geometry is preserved'}</p>
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

export function PlanWeekView({
  locale,
  selectedDay,
  days,
  onSelectDate,
  onOpenWorkout,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  onSelectDate: (iso: string) => void
  onOpenWorkout: () => void
}) {
  const fa = locale === 'fa'
  const labels = weekdayLabels(locale)
  const weekDates = weekIsoDates(selectedDay.localDate, locale)
  const byDate = new Map(days.map((day) => [day.localDate, day]))
  const todayWorkout = selectedDay.workout
  return (
    <div className="plan-stack" data-inventory="PLAN-01">
      <div className="plan-week">
        {weekDates.map((iso, index) => {
          const day = byDate.get(iso)
          const active = iso === selectedDay.localDate
          return (
            <button
              aria-current={active ? 'date' : undefined}
              aria-pressed={active}
              className={`plan-week__day${active ? ' is-active' : ''}${day?.workout ? ' is-workout' : ''}`}
              key={iso}
              onClick={() => onSelectDate(iso)}
              type="button"
            >
              <strong>{labels[index]}</strong>
              <small>{day ? (iso === days[0]?.localDate ? (fa ? 'امروز' : 'Today') : day.workout ? (fa ? 'تمرین' : 'Workout') : (fa ? 'بازیابی' : 'Recovery')) : '—'}</small>
            </button>
          )
        })}
      </div>
      <div className="plan-overview-grid">
        <ContentCard className="plan-overview-card">
          <StatusPill tone="brand"><Dumbbell size={14} /> {fa ? 'تمرین امروز' : 'Today’s workout'}</StatusPill>
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
          <h2>{fa ? 'پروتئین و فیبر کافی' : 'Protein & fibre'}</h2>
          <p>{fa ? 'وعده‌ها بر اساس برنامه امروز' : 'Meals for today’s schedule'}</p>
        </ContentCard>
      </div>
    </div>
  )
}

export function PlanNutritionView({
  locale,
  selectedDay,
  days,
  selectedMeals,
  completedSlots,
  savingSlot,
  mutationsLocked,
  isToday,
  onSelectMeal,
  onCompleteMeal,
  onOpenMeal,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  selectedMeals: Record<string, string>
  completedSlots: Record<string, boolean>
  savingSlot: string
  mutationsLocked: boolean
  isToday: boolean
  onSelectMeal: (slotId: string, optionId: string) => void
  onCompleteMeal: (slotId: string, optionId: string) => void
  onOpenMeal: (meal: MealSlot, choice: MealChoice) => void
}) {
  const fa = locale === 'fa'
  const weeks = planWeeks(days)
  return (
    <div className="plan-stack" data-inventory="PLAN-02">
      <ContentCard>
        <StatusPill tone="energy">{fa ? 'برنامه کامل ۳۰روزه' : 'Complete 30-day plan'}</StatusPill>
        <h2>{fa ? 'الگوی ماهانه تغذیه' : 'Monthly nutrition pattern'}</h2>
        <p>{fa ? 'این دوره از لحظه آماده‌شدن، ۳۰ روز کامل را پوشش می‌دهد. هر وعده چند گزینه هم‌ارزش دارد تا برنامه بدون بازتولید قابل اجرا بماند.' : 'This period covers 30 complete days from the moment the plan is ready. Every meal includes equivalent options so the plan remains practical without regeneration.'}</p>
        <ul className="plan-pattern-list">
          {weeks.map((week, index) => (
            <li key={`nutrition-week-${index}`}>
              <Check size={16} />
              <div>
                <strong>{fa ? `هفته ${index + 1}` : `Week ${index + 1}`}</strong>
                <small>{fa ? `${week.length} روز پوشش‌داده‌شده · گزینه اصلی و جایگزین برای هر وعده` : `${week.length} covered days · primary option plus alternatives per meal`}</small>
              </div>
            </li>
          ))}
        </ul>
      </ContentCard>
      {!isToday ? <p className="inline-notice">{fa ? 'این پیش‌نمایش روز آینده است؛ انتخاب و ثبت وعده در همان روز فعال می‌شود.' : 'This is a future-day preview. Selection and completion unlock on that day.'}</p> : null}
      <div className="plan-meal-list">
        {selectedDay.meals.map((meal) => {
          const selectedOptionId = selectedMeals[meal.id] ?? meal.selectedOptionId ?? meal.options[0]?.id
          const selectedOption = meal.options.find((option) => option.id === selectedOptionId) ?? meal.options[0]
          const completed = completedSlots[meal.id] || meal.completionStatus === 'completed'
          return (
            <ContentCard className="plan-meal-row" key={meal.id}>
              <div className="plan-meal-row__time"><strong>{meal.time}</strong><small>{localize(meal.label, locale)}</small></div>
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
                          <span>{isSelected ? <Check size={14} /> : index + 1}</span>
                          <span><strong>{localize(option.name, locale)}</strong><small>{formatNumber(option.nutrition.calories, locale)} kcal · {formatNumber(option.nutrition.protein, locale)}g {fa ? 'پروتئین' : 'protein'}</small></span>
                          <StatusPill tone={option.confidence === 'estimated' ? 'neutral' : 'success'}>{confidenceLabel(option.confidence, locale)}</StatusPill>
                        </button>
                        <button aria-label={fa ? `جزئیات ${localize(option.name, locale)}` : `${localize(option.name, locale)} details`} className="plan-meal-option__details" onClick={() => onOpenMeal(meal, option)} type="button"><Eye size={17} /></button>
                      </div>
                    )
                  })}
                </div>
                {isToday ? (
                  <div className="plan-meal-row__actions">
                    <span>{completed ? (fa ? 'این وعده ثبت شده است.' : 'This meal is completed.') : (fa ? 'غذایی را که آماده کردی انتخاب و ثبت کن.' : 'Choose what you prepared, then complete it.')}</span>
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
  onOpenWorkout,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  onOpenWorkout: (workout: WorkoutBlock) => void
}) {
  const fa = locale === 'fa'
  const weeks = planWeeks(days)
  const workout = selectedDay.workout
  return (
    <div className="plan-stack" data-inventory="PLAN-03">
      <ContentCard>
        <StatusPill tone="brand">{fa ? 'برنامه کامل ۳۰روزه' : 'Complete 30-day plan'}</StatusPill>
        <h2>{fa ? `${days.filter((day) => day.workout).length} روز تمرین در این دوره` : `${days.filter((day) => day.workout).length} workout days this period`}</h2>
        <ul className="plan-pattern-list">
          {weeks.map((week, index) => {
            const workoutDays = week.filter((day) => day.workout)
            return (
              <li key={`training-week-${index}`}>
                <Dumbbell size={16} />
                <div>
                  <strong>{fa ? `هفته ${index + 1}` : `Week ${index + 1}`}</strong>
                  <small>{workoutDays.length ? workoutDays.map((day) => weekdayLabelFor(day.localDate, locale)).join(' · ') : (fa ? 'بدون جلسه تمرینی' : 'No workout sessions')}</small>
                </div>
              </li>
            )
          })}
        </ul>
      </ContentCard>
      {workout ? (
        <ContentCard className="workout-detail-card">
          <span className="workout-detail-card__icon"><Dumbbell size={29} /></span>
          <StatusPill tone="energy">{intensityLabel(workout.intensity, locale)}</StatusPill>
          <h2>{localize(workout.name, locale)}</h2>
          <p>{localize(workout.focus, locale)}</p>
          <div className="workout-detail-card__metrics">
            <span><Clock3 size={18} /><strong>{formatNumber(workout.durationMinutes, locale)} {fa ? 'دقیقه' : 'min'}</strong></span>
            <span><ListChecks size={18} /><strong>{formatNumber(workout.exercises, locale)} {fa ? 'حرکت' : 'exercises'}</strong></span>
          </div>
          {workout.equipment?.length ? <p>{fa ? 'تجهیزات: ' : 'Equipment: '}{workout.equipment.map((item) => localize(item, locale)).join(' · ')}</p> : null}
          <ol>{workout.exerciseDetails.map((item) => (
            <li key={item.key}>
              {localize(item.name, locale)} · {formatNumber(item.sets, locale)} × {item.reps} · {formatNumber(item.restSeconds, locale)}s
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
        <div className="inline-notice" role="note">
          <ShoppingBasket size={16} />
          {fa
            ? 'مقدارها برای یک نفر محاسبه شده‌اند. تیک‌ها در حالت آفلاین روی دستگاه ذخیره و پس از اتصال بدون ایجاد مورد تکراری همگام می‌شوند.'
            : 'Quantities cover one person. Offline checkmarks are stored on this device and sync without duplicates after reconnection.'}
        </div>
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
                        <span>{checked ? <Check size={13} /> : <Circle size={13} />}</span>
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
      <ContentCard>
        <StatusPill tone="neutral"><WifiOff size={14} /> {fa ? 'آماده استفاده آفلاین' : 'Available offline'}</StatusPill>
        <h2>{fa ? 'مرتب‌سازی فروشگاه' : 'Shop order'}</h2>
        <p>{fa ? 'میوه و سبزیجات → پروتئین → لبنیات → خشکبار' : 'Produce → protein → dairy → pantry'}</p>
        <Button onClick={onShare} variant="secondary">{fa ? 'اشتراک فهرست' : 'Share list'}</Button>
      </ContentCard>
    </div>
  )
}

export function PlanCalendarView({
  locale,
  selectedDay,
  days,
  version,
  onSelectDate,
}: {
  locale: AppLocale
  selectedDay: MomentumPlanDayView
  days: MomentumPlanDayView[]
  version: PlanVersionMeta
  onSelectDate: (iso: string) => void
}) {
  const fa = locale === 'fa'
  const parts = calendarParts(selectedDay.localDate, locale)
  const grid = monthGrid(parts.year, parts.month, locale)
  const weekdays = fa ? PERSIAN_WEEKDAYS : GREGORIAN_WEEKDAYS
  const byDate = new Map(days.map((day) => [day.localDate, day]))
  const title = formatLocalizedDate(selectedDay.localDate, locale)
  return (
    <ContentCard className="plan-calendar-card" data-inventory="PLAN-05">
      <div className="plan-calendar-card__heading">
        <div>
          <h2>{title}</h2>
          <p>{fa ? `دوره جاری از ${formatPlanInterval(version.validFrom, version.validTo, locale)}.` : `The current period runs ${formatPlanInterval(version.validFrom, version.validTo, locale)}.`}</p>
        </div>
        <StatusPill tone="brand">{fa ? 'نمای ماه' : 'Month view'}</StatusPill>
      </div>
      <div className="plan-calendar">
        {weekdays.map((day) => <strong key={day}>{day}</strong>)}
        {grid.map((cell) => {
          const scheduled = byDate.get(cell.isoDate)
          const inPeriod = isWithinInterval(cell.isoDate, version.validFrom, version.validTo)
          const selected = cell.isoDate === selectedDay.localDate
          return (
            <button
              aria-current={selected ? 'date' : undefined}
              className={`plan-calendar__cell${cell.isCurrentMonth ? '' : ' is-outside'}${scheduled?.workout ? ' is-workout' : ''}${inPeriod ? ' is-period' : ''}${selected ? ' is-selected' : ''}`}
              disabled={!cell.isCurrentMonth}
              key={cell.isoDate}
              onClick={() => onSelectDate(cell.isoDate)}
              type="button"
            >
              {formatNumber(cell.day, locale, { useGrouping: false })}
            </button>
          )
        })}
      </div>
    </ContentCard>
  )
}

export function PlanVersionView({ locale, version, onOpenHistory }: { locale: AppLocale; version: PlanVersionMeta; onOpenHistory: () => void }) {
  const fa = locale === 'fa'
  return (
    <div className="plan-overview-grid" data-inventory="PLAN-06">
      <ContentCard className="plan-overview-card">
        <div className="inline-notice" role="status">
          <CheckCircle2 size={16} />
          {fa ? 'این نسخه فعال و فقط‌خواندنی است. تغییرهای دوره بعد جداگانه ثبت می‌شوند و این نسخه را بازنویسی نمی‌کنند.' : 'This version is active and read-only. Next-period changes are stored separately and do not overwrite this version.'}
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

function confidenceLabel(value: MealChoice['confidence'], locale: AppLocale) {
  const labels: Record<MealChoice['confidence'], { fa: string; en: string }> = {
    estimated: { fa: 'برآوردی', en: 'Estimated' },
    verified: { fa: 'تأییدشده', en: 'Verified' },
    usda: { fa: 'USDA', en: 'USDA' },
    manufacturer: { fa: 'برچسب محصول', en: 'Manufacturer' },
  }
  return labels[value][locale]
}

function intensityLabel(value: WorkoutBlock['intensity'], locale: AppLocale) {
  const labels = {
    low: { fa: 'سبک', en: 'Low' },
    moderate: { fa: 'متوسط', en: 'Moderate' },
    high: { fa: 'سنگین', en: 'High' },
  }
  return labels[value][locale]
}

function weekdayLabelFor(iso: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { weekday: 'short' }).format(new Date(`${iso}T12:00:00`))
}
