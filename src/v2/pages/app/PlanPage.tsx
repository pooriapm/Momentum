import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Eye,
  ListChecks,
  Salad,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { completeMeal, currentLocalDate, logMealSelection } from '../../data/repository'
import { localize, type MealChoice, type MomentumPlanDayView, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { MealDetailSheet } from '../../components/MealDetailSheet'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'

type PlanSegment = 'nutrition' | 'workout' | 'shopping'

const segments: Array<{ key: PlanSegment; icon: typeof Salad; translationKey: string }> = [
  { key: 'nutrition', icon: Salad, translationKey: 'app.nutrition' },
  { key: 'workout', icon: Dumbbell, translationKey: 'app.workout' },
  { key: 'shopping', icon: ShoppingBasket, translationKey: 'app.shopping' },
]

function dateButtonLabel(localDate: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${localDate}T12:00:00`))
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

function intensityLabel(value: 'low' | 'moderate' | 'high', locale: AppLocale) {
  const labels = {
    low: { fa: 'سبک', en: 'Low' },
    moderate: { fa: 'متوسط', en: 'Moderate' },
    high: { fa: 'سنگین', en: 'High' },
  }
  return labels[value][locale]
}

function asCurrentDay(plan: MomentumPlanView): MomentumPlanDayView {
  return {
    localDate: plan.localDate ?? currentLocalDate(),
    dateLabel: plan.dateLabel,
    adjustmentReason: plan.adjustmentReason,
    targets: plan.targets,
    targetStrategy: plan.targetStrategy,
    meals: plan.meals,
    workout: plan.workout,
  }
}

export function PlanPage({ locale, plan, preview = false }: { locale: AppLocale; plan: MomentumPlanView | null; preview?: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const [segment, setSegment] = useState<PlanSegment>('nutrition')
  const [selectedDate, setSelectedDate] = useState('')
  const [mealDetail, setMealDetail] = useState<{ choice: MealChoice; label: string } | null>(null)
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Set<string>>(() => new Set())
  const [selectedMeals, setSelectedMeals] = useState<Record<string, string>>({})
  const [completedSlots, setCompletedSlots] = useState<Record<string, boolean>>({})
  const [savingSlot, setSavingSlot] = useState('')
  const [mealError, setMealError] = useState('')

  if (!plan) return <EmptyPlanState locale={locale} />

  const currentDay = asCurrentDay(plan)
  const availableDays = plan.days?.length ? plan.days : [currentDay]
  const selectedDay = availableDays.find((day) => day.localDate === selectedDate)
    ?? availableDays.find((day) => day.localDate === plan.localDate)
    ?? availableDays[0]
  const isToday = selectedDay.localDate === (plan.localDate ?? currentDay.localDate)

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: PlanSegment) {
    const currentIndex = segments.findIndex((item) => item.key === current)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? segments.length - 1
        : event.key === 'ArrowRight' ? (currentIndex + 1) % segments.length
          : event.key === 'ArrowLeft' ? (currentIndex - 1 + segments.length) % segments.length
            : null
    if (nextIndex === null) return
    event.preventDefault()
    const next = segments[nextIndex].key
    setSegment(next)
    window.requestAnimationFrame(() => document.getElementById(`plan-tab-${next}`)?.focus())
  }

  async function selectMeal(slotId: string, optionId: string) {
    if (!isToday || savingSlot) return
    const previous = selectedMeals[slotId]
    setSelectedMeals((current) => ({ ...current, [slotId]: optionId }))
    setMealError('')
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
      setMealError(locale === 'fa' ? 'انتخاب غذا ذخیره نشد؛ دوباره تلاش کن.' : 'The meal choice was not saved. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  async function markMealComplete(slotId: string, optionId: string) {
    if (!isToday || savingSlot) return
    setSavingSlot(slotId)
    setMealError('')
    try {
      if (!preview) await completeMeal(selectedDay.localDate, slotId, optionId)
      setCompletedSlots((current) => ({ ...current, [slotId]: true }))
      if (!preview) await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch {
      setMealError(locale === 'fa' ? 'ثبت وعده انجام نشد؛ دوباره تلاش کن.' : 'The meal could not be completed. Try again.')
    } finally {
      setSavingSlot('')
    }
  }

  return (
    <main className="app-page plan-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><Sparkles size={15} />{locale === 'fa' ? 'برنامه شخصی' : 'Personal plan'} · {localize(selectedDay.dateLabel, locale)}</p>
          <h1>{t('app.planTitle')}</h1>
          <p>{localize(selectedDay.adjustmentReason, locale)}</p>
        </div>
        <StatusPill tone="success"><Check size={13} />{locale === 'fa' ? 'برنامه فعال' : 'Active plan'}</StatusPill>
      </section>

      <div aria-label={locale === 'fa' ? 'روزهای برنامه' : 'Plan days'} className="plan-day-strip">
        {availableDays.map((day) => (
          <button
            aria-current={day.localDate === (plan.localDate ?? currentDay.localDate) ? 'date' : undefined}
            aria-pressed={day.localDate === selectedDay.localDate}
            className={day.localDate === selectedDay.localDate ? 'is-active' : ''}
            key={day.localDate}
            onClick={() => setSelectedDate(day.localDate)}
            type="button"
          >
            <CalendarDays size={16} />
            <span>{dateButtonLabel(day.localDate, locale)}</span>
            <small>{localize(day.targetStrategy, locale)}</small>
          </button>
        ))}
      </div>

      <div aria-label={locale === 'fa' ? 'بخش برنامه' : 'Plan section'} className="segmented-control glass-chrome" role="tablist">
        {segments.map(({ key, icon: Icon, translationKey }) => (
          <button
            aria-controls={`plan-panel-${key}`}
            aria-selected={segment === key}
            className={segment === key ? 'is-active' : ''}
            id={`plan-tab-${key}`}
            key={key}
            onClick={() => setSegment(key)}
            onKeyDown={(event) => handleTabKeyDown(event, key)}
            role="tab"
            tabIndex={segment === key ? 0 : -1}
            type="button"
          >
            <Icon size={18} />{t(translationKey)}
          </button>
        ))}
      </div>

      {segment === 'nutrition' ? (
        <div aria-labelledby="plan-tab-nutrition" className="plan-meal-list" id="plan-panel-nutrition" role="tabpanel">
          {!isToday ? <p className="inline-notice">{locale === 'fa' ? 'این پیش‌نمایش روز آینده است؛ انتخاب و ثبت وعده در همان روز فعال می‌شود.' : 'This is a future-day preview. Selection and completion unlock on that day.'}</p> : null}
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
                            disabled={!isToday || completed || (!preview && !online) || Boolean(savingSlot)}
                            onClick={() => void selectMeal(meal.id, option.id)}
                            type="button"
                          >
                            <span>{isSelected ? <Check size={14} /> : index + 1}</span>
                            <span><strong>{localize(option.name, locale)}</strong><small>{formatNumber(option.nutrition.calories, locale)} kcal · {formatNumber(option.nutrition.protein, locale)}g {locale === 'fa' ? 'پروتئین' : 'protein'}</small></span>
                            <StatusPill tone={option.confidence === 'estimated' ? 'neutral' : 'success'}>{confidenceLabel(option.confidence, locale)}</StatusPill>
                          </button>
                          <button aria-label={locale === 'fa' ? `جزئیات ${localize(option.name, locale)}` : `${localize(option.name, locale)} details`} className="plan-meal-option__details" onClick={() => setMealDetail({ choice: option, label: localize(meal.label, locale) })} type="button"><Eye size={17} /><ChevronRight className="directional-icon" size={15} /></button>
                        </div>
                      )
                    })}
                  </div>
                  {isToday ? (
                    <div className="plan-meal-row__actions">
                      <span>{completed ? (locale === 'fa' ? 'این وعده ثبت شده است.' : 'This meal is completed.') : (locale === 'fa' ? 'غذایی را که آماده کردی انتخاب و ثبت کن.' : 'Choose what you prepared, then complete it.')}</span>
                      <Button disabled={completed || (!preview && !online)} loading={savingSlot === meal.id} onClick={() => void markMealComplete(meal.id, selectedOption.id)}><Check size={16} />{completed ? (locale === 'fa' ? 'ثبت شد' : 'Completed') : t('app.complete')}</Button>
                    </div>
                  ) : null}
                </div>
              </ContentCard>
            )
          })}
          {mealError ? <div className="inline-notice inline-notice--error" role="alert">{mealError}</div> : null}
        </div>
      ) : null}

      {segment === 'workout' ? (
        <div aria-labelledby="plan-tab-workout" id="plan-panel-workout" role="tabpanel">
          {selectedDay.workout ? (
            <ContentCard className="workout-detail-card">
              <span className="workout-detail-card__icon"><Dumbbell size={29} /></span><StatusPill tone="energy">{intensityLabel(selectedDay.workout.intensity, locale)}</StatusPill>
              <h2>{localize(selectedDay.workout.name, locale)}</h2><p>{localize(selectedDay.workout.focus, locale)}</p>
              <div className="workout-detail-card__metrics"><span><Clock3 size={18} /><strong>{formatNumber(selectedDay.workout.durationMinutes, locale)} {locale === 'fa' ? 'دقیقه' : 'min'}</strong></span><span><ListChecks size={18} /><strong>{formatNumber(selectedDay.workout.exercises, locale)} {locale === 'fa' ? 'حرکت' : 'exercises'}</strong></span></div>
              <ol>{selectedDay.workout.exerciseItems.map((item, index) => <li key={`${selectedDay.localDate}-${index}`}>{localize(item, locale)}</li>)}</ol>
            </ContentCard>
          ) : <ContentCard><h2>{locale === 'fa' ? 'روز استراحت و ریکاوری' : 'Rest and recovery day'}</h2><p>{locale === 'fa' ? 'برای این روز تمرین برنامه‌ریزی نشده است.' : 'No workout is scheduled for this day.'}</p></ContentCard>}
        </div>
      ) : null}

      {segment === 'shopping' ? (
        <div aria-labelledby="plan-tab-shopping" className="shopping-grid" id="plan-panel-shopping" role="tabpanel">
          {plan.shoppingGroups.map((group) => (
            <ContentCard key={group.id}><h3>{localize(group.name, locale)}</h3><ul>{group.items.map((item, index) => {
              const itemKey = `${group.id}-${index}`
              const checked = checkedShoppingItems.has(itemKey)
              return <li className={checked ? 'is-checked' : ''} key={itemKey}><button aria-pressed={checked} onClick={() => setCheckedShoppingItems((current) => { const next = new Set(current); if (next.has(itemKey)) next.delete(itemKey); else next.add(itemKey); return next })} type="button"><span>{checked ? <Check size={13} /> : null}</span><strong>{localize(item, locale)}</strong></button></li>
            })}</ul></ContentCard>
          ))}
        </div>
      ) : null}
      {mealDetail ? <MealDetailSheet choice={mealDetail.choice} locale={locale} mealLabel={mealDetail.label} onClose={() => setMealDetail(null)} /> : null}
    </main>
  )
}
