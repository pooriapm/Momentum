import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChefHat,
  ChevronDown,
  Clock3,
  Dumbbell,
  MapPin,
  PackageCheck,
  Salad,
  ShoppingBasket,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { SelectInput } from '../../components/ui/FormField'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
import { Surface } from '../../components/ui/Surface'
import {
  formatJalaliDate,
  getTodayIso,
  toPersianDigits,
} from '../../lib/dates/jalali'
import { MealOptionPicker } from '../../components/meals/MealOptionPicker'
import {
  TRAINING_LABELS as trainingLabels,
  formatNutritionNumber as formatNumber,
} from '../../lib/formatting/nutrition'
import { RecipeScreen } from '../recipes/RecipeScreen'
import type { MealOption, PlanDay } from '../../types/domain'
import { MealOptionDetails } from './components/MealOptionDetails'
import { PlannedTotals } from './components/PlannedTotals'
import { RestaurantCard } from './components/RestaurantCard'
import { getPlanForDate } from './state/plan-state'

function DayMeals({ day }: { day: PlanDay }) {
  const { appState, selectMealOption } = useAppState()
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({})
  const [recipeOption, setRecipeOption] = useState<MealOption>()

  if (!appState) {
    return null
  }

  const selectedOptions = appState.dailyLogs[day.date]?.selectedMealOptions ?? {}

  return (
    <div className="space-y-3">
      {day.meals.map((meal, index) => {
        const selectedOptionId = selectedOptions[meal.id] ?? meal.defaultOptionId
        const completed =
          appState.dailyLogs[day.date]?.consumedMeals[meal.id]?.completed === true
        const option =
          meal.options.find((candidate) => candidate.id === selectedOptionId) ??
          meal.options[0]
        const expanded = expandedMeals[meal.id] ?? index === 0

        return (
          <Surface
            as="article"
            className="meal-card-enter overflow-hidden rounded-[24px]"
            key={meal.id}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="p-4 desktop:p-5">
              <div className="flex items-start gap-3">
                <IconTile className="size-10 rounded-[14px]">
                  <UtensilsCrossed aria-hidden="true" size={18} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-base font-black text-[var(--color-text)]">{meal.title}</h3>
                    {meal.scheduledTime && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-text-muted)]">
                        <Clock3 aria-hidden="true" size={13} />
                        {toPersianDigits(meal.scheduledTime)}
                      </span>
                    )}
                    {!meal.required && (
                      <Badge className="px-2 py-1">
                        اختیاری
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--color-text-secondary)]">
                    {option.title}
                  </p>
                  {option.subtitle && (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">
                      {option.subtitle}
                    </p>
                  )}
                </div>
                <IconButton
                  aria-label={`${expanded ? 'بستن' : 'نمایش'} جزئیات ${meal.title}`}
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedMeals((current) => ({
                      ...current,
                      [meal.id]: !expanded,
                    }))
                  }
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`transition ${expanded ? 'rotate-180' : ''}`}
                    size={18}
                  />
                </IconButton>
              </div>

              <MealOptionPicker
                disabled={completed}
                meal={meal}
                onSelect={(optionId) =>
                  selectMealOption(day.date, meal.id, optionId)
                }
                selectedOptionId={selectedOptionId}
              />

              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold leading-5 text-[var(--color-text-muted)]">
                {option.prepTimeMinutes !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1">
                    <Clock3 aria-hidden="true" size={11} />
                    {toPersianDigits(option.prepTimeMinutes)} دقیقه
                  </span>
                )}
                {option.portable && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1">
                    <PackageCheck aria-hidden="true" size={11} />
                    قابل حمل
                  </span>
                )}
                {option.restaurantFriendly && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1">
                    <MapPin aria-hidden="true" size={11} />
                    مناسب رستوران
                  </span>
                )}
                {option.satietyScore !== undefined && (
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1">
                    سیری {toPersianDigits(option.satietyScore)} از ۵
                  </span>
                )}
                <span className="rounded-full bg-[var(--color-highlight-soft)] px-2.5 py-1 text-[var(--color-highlight)]">
                  {toPersianDigits(meal.xp)} XP
                </span>
                {option.recipe && (
                  <Button
                    className="min-h-0 rounded-full px-2.5 py-1"
                    onClick={() => setRecipeOption(option)}
                    size="sm"
                    variant="accent"
                  >
                    <ChefHat aria-hidden="true" size={12} />
                    دستور پخت کامل
                  </Button>
                )}
              </div>

              {expanded && <MealOptionDetails option={option} />}
            </div>
          </Surface>
        )
      })}
      {recipeOption && (
        <RecipeScreen
          onClose={() => setRecipeOption(undefined)}
          option={recipeOption}
        />
      )}
    </div>
  )
}

export function MealPlanScreen() {
  const { appState } = useAppState()
  const today = getTodayIso()
  const activeToday = appState ? getPlanForDate(appState, today) : undefined
  const [selectedPlanKey, setSelectedPlanKey] = useState(
    activeToday?.storageKey ?? appState?.planPriority[0] ?? '',
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [section, setSection] = useState<'meals' | 'grocery' | 'restaurant'>('meals')

  const activeKeys = appState?.planPriority ?? []
  const effectivePlanKey =
    appState?.plans[selectedPlanKey] !== undefined
      ? selectedPlanKey
      : activeToday?.storageKey ?? appState?.planPriority[0] ?? ''
  const plan = appState?.plans[effectivePlanKey]
  const effectiveSelectedDate =
    plan?.days.some((day) => day.date === selectedDate)
      ? selectedDate
      : plan?.days.find((day) => day.date === today)?.date ?? plan?.days[0]?.date
  const selectedDay = plan?.days.find((day) => day.date === effectiveSelectedDate)
  const sortedDays = useMemo(
    () => (plan ? [...plan.days].sort((a, b) => a.date.localeCompare(b.date)) : []),
    [plan],
  )

  if (!appState || !plan) {
    return (
      <Surface as="section" className="relative flex min-h-[520px] overflow-hidden rounded-[28px] p-6">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative m-auto max-w-md text-center">
          <IconTile className="mx-auto size-16 rounded-[22px]">
            <UtensilsCrossed aria-hidden="true" size={28} />
          </IconTile>
          <p className="mt-6 text-xs font-bold text-[var(--color-accent)]">برنامه غذایی</p>
          <h1 className="mt-3 text-2xl font-black text-[var(--color-text)]">
            برنامه‌ای وارد نشده است
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">
            از بخش تنظیمات فایل JSON هفتگی را وارد کن. تمام وعده‌ها و اطلاعات این صفحه از همان
            فایل ساخته می‌شوند.
          </p>
        </div>
      </Surface>
    )
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-surface-raised),var(--color-surface))] p-5 desktop:p-7">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-col gap-4 desktop:flex-row desktop:items-start desktop:justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--color-accent)]">برنامه فعال</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--color-text)] desktop:text-3xl">
                {plan.planName}
              </h1>
              {plan.description && (
                <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--color-text-secondary)]">
                  {plan.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--color-text-muted)]">
                <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5">
                  {formatJalaliDate(plan.validFrom, 'long')} تا{' '}
                  {formatJalaliDate(plan.validTo, 'long')}
                </span>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5">
                  نسخه {plan.planVersion}
                </span>
                {plan.author && (
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5">
                    {plan.author}
                  </span>
                )}
              </div>
            </div>
            {activeKeys.length > 1 && (
              <label className="min-w-56">
                <span className="mb-2 block text-[11px] font-bold text-[var(--color-text-muted)]">
                  انتخاب برنامه
                </span>
                <SelectInput
                  className="min-h-11 rounded-xl px-3 text-xs font-bold"
                  onChange={(event) => {
                    const nextKey = event.target.value
                    const nextPlan = appState.plans[nextKey]
                    setSelectedPlanKey(nextKey)
                    setSelectedDate(
                      nextPlan.days.find((day) => day.date === today)?.date ??
                        nextPlan.days[0].date,
                    )
                  }}
                  value={effectivePlanKey}
                >
                  {activeKeys.map((key) => (
                    <option key={key} value={key}>
                      {appState.plans[key].planName}
                    </option>
                  ))}
                </SelectInput>
              </label>
            )}
          </div>
        </div>
      </section>

      <Surface as="section" className="grid gap-3 rounded-[24px] p-4 desktop:grid-cols-[1fr_1.5fr] desktop:p-5">
        <div className="rounded-2xl bg-[var(--color-accent-soft)] p-4">
          <p className="text-[11px] font-bold text-[var(--color-accent)]">پروفایل این برنامه</p>
          <p className="mt-2 text-sm font-black text-[var(--color-text)]">
            {plan.profile.name} · {toPersianDigits(plan.profile.age)} سال
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold leading-5 text-[var(--color-text-secondary)]">
            <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1">
              {toPersianDigits(plan.profile.currentWeightKg)} کیلو
            </span>
            <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1">
              هدف {toPersianDigits(plan.profile.targetWeightKg)} کیلو
            </span>
            {plan.profile.bodyComposition?.bodyFatPercent !== undefined && (
              <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1">
                چربی بدن {toPersianDigits(plan.profile.bodyComposition.bodyFatPercent)}٪
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
          <p className="text-[11px] font-bold text-[var(--color-highlight)]">منطق برنامه منعطف</p>
          <p className="mt-2 text-xs font-black leading-6 text-[var(--color-text)]">
            {plan.planningContext.requestedMealPattern}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold leading-5 text-[var(--color-text-muted)]">
            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
              {toPersianDigits(plan.planningContext.preferredOptionCount)} انتخاب برای هر وعده
            </span>
            {plan.planningContext.favoriteFoods.slice(0, 3).map((food) => (
              <span
                className="rounded-full border border-[var(--color-border)] px-2.5 py-1"
                key={food}
              >
                {food}
              </span>
            ))}
            {plan.planningContext.trainingSchedule.length > 0 && (
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
                {toPersianDigits(plan.planningContext.trainingSchedule.length)} روز فعالیت
              </span>
            )}
          </div>
        </div>
      </Surface>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
        {[
          { id: 'meals' as const, label: 'وعده‌ها', icon: UtensilsCrossed },
          { id: 'grocery' as const, label: 'لیست خرید', icon: ShoppingBasket },
          { id: 'restaurant' as const, label: 'رستوران', icon: MapPin },
        ].map(({ id, label, icon: Icon }) => (
          <Button
            className="min-w-28 flex-1"
            key={id}
            onClick={() => setSection(id)}
            variant={section === id ? 'accent' : 'ghost'}
          >
            <Icon aria-hidden="true" size={16} />
            {label}
          </Button>
        ))}
      </div>

      {section === 'meals' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedDays.map((day) => {
              const selected = day.date === effectiveSelectedDate
              return (
                <button
                  className={`min-w-[112px] rounded-2xl border p-3 text-right transition ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  type="button"
                >
                  <p
                    className={`text-[11px] font-bold ${selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}
                  >
                    {formatJalaliDate(day.date, 'weekday')}
                  </p>
                  <p className="mt-1 text-xs font-black text-[var(--color-text)]">
                    {formatJalaliDate(day.date, 'long').replace(
                      ` ${toPersianDigits(new Date(day.date).getUTCFullYear())}`,
                      '',
                    )}
                  </p>
                  {day.trainingType && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[var(--color-highlight)]">
                      <Dumbbell aria-hidden="true" size={11} />
                      {trainingLabels[day.trainingType] ?? day.trainingType}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDay && (
            <div className="grid gap-4 desktop:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                {selectedDay.label && (
                  <div className="mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs font-bold text-[var(--color-text-secondary)]">
                    {selectedDay.label}
                  </div>
                )}
                <DayMeals day={selectedDay} />
              </div>
              <div className="space-y-3 desktop:sticky desktop:top-24 desktop:h-fit">
                <PlannedTotals day={selectedDay} />
                {selectedDay.notes && selectedDay.notes.length > 0 && (
                  <Surface as="section" className="rounded-[24px] p-4" variant="highlight">
                    <p className="text-xs font-black text-[var(--color-highlight)]">یادداشت‌های روز</p>
                    <ul className="mt-2 space-y-1.5">
                      {selectedDay.notes.map((note) => (
                        <li
                          className="flex gap-2 text-[11px] leading-6 text-[var(--color-text-secondary)]"
                          key={note}
                        >
                          <AlertTriangle
                            aria-hidden="true"
                            className="mt-1 shrink-0 text-[var(--color-highlight)]"
                            size={11}
                          />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </Surface>
                )}
              </div>
            </div>
          )}

          {plan.emergencyOptions.length > 0 && (
            <Surface as="section" className="p-5">
              <div className="flex items-center gap-3">
                <IconTile className="size-10 rounded-xl" tone="highlight">
                  <Salad aria-hidden="true" size={19} />
                </IconTile>
                <div>
                  <p className="text-xs font-black text-[var(--color-text)]">
                    گزینه‌های گرسنگی اضطراری
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    {toPersianDigits(plan.emergencyOptions.length)} گزینه از فایل برنامه
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 desktop:grid-cols-2">
                {plan.emergencyOptions.map((option) => (
                  <article
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                    key={option.id}
                  >
                    <p className="text-xs font-black text-[var(--color-text)]">{option.title}</p>
                    <p className="mt-2 text-[11px] font-bold text-[var(--color-accent)]">
                      {formatNumber(option.nutrition.calories)} کالری ·{' '}
                      {formatNumber(option.nutrition.protein)} گرم پروتئین
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {option.suitableForHungerLevels.map((level) => (
                        <span
                          className="rounded-full bg-[var(--color-highlight-soft)] px-2 py-1 text-[10px] font-bold text-[var(--color-highlight)]"
                          key={level}
                        >
                          گرسنگی {toPersianDigits(level)}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </Surface>
          )}
        </>
      )}

      {section === 'grocery' && (
        <section className="grid gap-3 desktop:grid-cols-2">
          {plan.groceryList && plan.groceryList.length > 0 ? (
            plan.groceryList.map((group) => (
              <Surface as="article" className="rounded-[24px] p-4 desktop:p-5" key={group.category}>
                <div className="flex items-center gap-2">
                  <ShoppingBasket aria-hidden="true" className="text-[var(--color-accent)]" size={18} />
                  <h2 className="text-sm font-black text-[var(--color-text)]">{group.category}</h2>
                </div>
                <div className="mt-4 space-y-1.5">
                  {group.items.map((item, index) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5"
                      key={`${item.name}-${index}`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text)]">
                          {item.name}
                        </p>
                        {item.note && (
                          <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-muted)]">{item.note}</p>
                        )}
                      </div>
                      {item.amount !== undefined && (
                        <span className="text-[11px] font-black text-[var(--color-accent)]">
                          {formatNumber(item.amount)} {item.unit ?? ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Surface>
            ))
          ) : (
            <Surface className="col-span-full rounded-[24px] p-8 text-center">
              <ShoppingBasket
                aria-hidden="true"
                className="mx-auto text-[var(--color-text-muted)]"
                size={27}
              />
              <p className="mt-3 text-sm font-bold text-[var(--color-text-secondary)]">
                لیست خریدی در فایل وجود ندارد.
              </p>
            </Surface>
          )}
        </section>
      )}

      {section === 'restaurant' && (
        <section className="grid gap-3 desktop:grid-cols-2">
          {plan.restaurantGuide && plan.restaurantGuide.length > 0 ? (
            plan.restaurantGuide.map((choice) => (
              <RestaurantCard choice={choice} key={choice.id} />
            ))
          ) : (
            <Surface className="col-span-full rounded-[24px] p-8 text-center">
              <MapPin aria-hidden="true" className="mx-auto text-[var(--color-text-muted)]" size={27} />
              <p className="mt-3 text-sm font-bold text-[var(--color-text-secondary)]">
                راهنمای رستورانی در فایل وجود ندارد.
              </p>
            </Surface>
          )}
        </section>
      )}
    </div>
  )
}
