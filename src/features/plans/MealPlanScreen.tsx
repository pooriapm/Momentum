import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Beef,
  Check,
  ChefHat,
  ChevronDown,
  Clock3,
  Dumbbell,
  Flame,
  ListChecks,
  MapPin,
  PackageCheck,
  Salad,
  ShoppingBasket,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import {
  formatJalaliDate,
  getTodayIso,
  toPersianDigits,
} from '../../lib/dates/jalali'
import { MealOptionPicker } from '../../components/meals/MealOptionPicker'
import { RecipeScreen } from '../recipes/RecipeScreen'
import type {
  MealOption,
  Nutrition,
  PlanDay,
  RestaurantChoice,
} from '../../types/domain'
import { getPlanForDate } from './state/plan-state'

const unitLabels: Record<string, string> = {
  g: 'گرم',
  ml: 'میلی‌لیتر',
  piece: 'عدد',
  tbsp: 'قاشق غذاخوری',
  tsp: 'قاشق چای‌خوری',
  cup: 'پیمانه',
  slice: 'برش',
  serving: 'سروینگ',
}

const trainingLabels: Record<string, string> = {
  rest: 'استراحت',
  crossfit: 'کراس‌فیت',
  full_body: 'فول‌بادی',
  cardio: 'هوازی',
  walk: 'پیاده‌روی',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value)
}

function NutritionGrid({
  nutrition,
  compact = false,
}: {
  nutrition: Nutrition
  compact?: boolean
}) {
  const items = [
    { label: 'کالری', value: nutrition.calories, suffix: '', icon: Flame },
    { label: 'پروتئین', value: nutrition.protein, suffix: 'g', icon: Beef },
    { label: 'کربوهیدرات', value: nutrition.carbs, suffix: 'g', icon: Salad },
    { label: 'چربی', value: nutrition.fat, suffix: 'g', icon: ChefHat },
    ...(nutrition.fiber !== undefined
      ? [{ label: 'فیبر', value: nutrition.fiber, suffix: 'g', icon: Salad }]
      : []),
  ]

  return (
    <div
      className={`grid gap-1.5 ${items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} ${compact ? '' : 'desktop:gap-2'}`}
    >
      {items.map(({ label, value, suffix, icon: Icon }) => (
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-2 text-center desktop:p-3"
          key={label}
        >
          {!compact && (
            <Icon
              aria-hidden="true"
              className="mx-auto mb-1 text-[var(--emerald)]"
              size={14}
            />
          )}
          <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-xs font-black text-[var(--text-primary)]">
            {formatNumber(value)}
            {suffix}
          </p>
        </div>
      ))}
    </div>
  )
}

function MealOptionDetails({ option }: { option: MealOption }) {
  return (
    <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <NutritionGrid nutrition={option.nutrition} />

      <div>
        <p className="text-xs font-black text-[var(--text-secondary)]">مواد اولیه</p>
        <div className="mt-2 grid gap-1.5 desktop:grid-cols-2">
          {option.ingredients.map((ingredient, index) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-2"
              key={`${ingredient.name}-${index}`}
            >
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {ingredient.name}
                </p>
                {ingredient.note && (
                  <p className="mt-1 text-[10px] leading-5 text-[var(--text-muted)]">{ingredient.note}</p>
                )}
              </div>
              <span className="shrink-0 text-[11px] font-black text-[var(--emerald)]">
                {formatNumber(ingredient.amount)} {unitLabels[ingredient.unit] ?? ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {option.preparation && option.preparation.length > 0 && (
        <div>
          <p className="text-xs font-black text-[var(--text-secondary)]">آماده‌سازی</p>
          <ol className="mt-2 space-y-1.5">
            {option.preparation.map((step, index) => (
              <li
                className="flex gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-2.5 text-[11px] leading-6 text-[var(--text-secondary)]"
                key={`${step}-${index}`}
              >
                <span className="font-black text-[var(--emerald)]">
                  {toPersianDigits(index + 1)}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(option.tags?.length || option.warnings?.length) && (
        <div className="flex flex-wrap gap-1.5">
          {option.tags?.map((tag) => (
            <span
              className="rounded-full bg-[var(--emerald-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--emerald)]"
              key={tag}
            >
              {tag}
            </span>
          ))}
          {option.warnings?.map((warning) => (
            <span
              className="rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--gold)]"
              key={warning}
            >
              {warning}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

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
          <article
            className="glass-panel meal-card-enter overflow-hidden rounded-[24px]"
            key={meal.id}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="p-4 desktop:p-5">
              <div className="flex items-start gap-3">
                <div className="animated-icon grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <UtensilsCrossed aria-hidden="true" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-base font-black text-[var(--text-primary)]">{meal.title}</h3>
                    {meal.scheduledTime && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)]">
                        <Clock3 aria-hidden="true" size={13} />
                        {toPersianDigits(meal.scheduledTime)}
                      </span>
                    )}
                    {!meal.required && (
                      <span className="rounded-full bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                        اختیاری
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--text-secondary)]">
                    {option.title}
                  </p>
                  {option.subtitle && (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                      {option.subtitle}
                    </p>
                  )}
                </div>
                <button
                  aria-label={`${expanded ? 'بستن' : 'نمایش'} جزئیات ${meal.title}`}
                  aria-expanded={expanded}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                  onClick={() =>
                    setExpandedMeals((current) => ({
                      ...current,
                      [meal.id]: !expanded,
                    }))
                  }
                  type="button"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`transition ${expanded ? 'rotate-180' : ''}`}
                    size={18}
                  />
                </button>
              </div>

              <MealOptionPicker
                disabled={completed}
                meal={meal}
                onSelect={(optionId) =>
                  selectMealOption(day.date, meal.id, optionId)
                }
                selectedOptionId={selectedOptionId}
              />

              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold leading-5 text-[var(--text-muted)]">
                {option.prepTimeMinutes !== undefined && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
                    <Clock3 aria-hidden="true" size={11} />
                    {toPersianDigits(option.prepTimeMinutes)} دقیقه
                  </span>
                )}
                {option.portable && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
                    <PackageCheck aria-hidden="true" size={11} />
                    قابل حمل
                  </span>
                )}
                {option.restaurantFriendly && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
                    <MapPin aria-hidden="true" size={11} />
                    مناسب رستوران
                  </span>
                )}
                {option.satietyScore !== undefined && (
                  <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
                    سیری {toPersianDigits(option.satietyScore)} از ۵
                  </span>
                )}
                <span className="rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-[var(--gold)]">
                  {toPersianDigits(meal.xp)} XP
                </span>
                {option.recipe && (
                  <button
                    className="flex items-center gap-1 rounded-full bg-[var(--emerald-soft)] px-2.5 py-1 text-[var(--emerald)]"
                    onClick={() => setRecipeOption(option)}
                    type="button"
                  >
                    <ChefHat aria-hidden="true" size={12} />
                    دستور پخت کامل
                  </button>
                )}
              </div>

              {expanded && <MealOptionDetails option={option} />}
            </div>
          </article>
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

function PlannedTotals({ day }: { day: PlanDay }) {
  const { appState } = useAppState()

  if (!appState) return null

  const selectedOptions = appState.dailyLogs[day.date]?.selectedMealOptions ?? {}
  const total = day.meals.reduce<Nutrition>(
    (sum, meal) => {
      const optionId = selectedOptions[meal.id] ?? meal.defaultOptionId
      const option =
        meal.options.find((candidate) => candidate.id === optionId) ?? meal.options[0]
      return {
        calories: sum.calories + option.nutrition.calories,
        protein: sum.protein + option.nutrition.protein,
        carbs: sum.carbs + option.nutrition.carbs,
        fat: sum.fat + option.nutrition.fat,
        fiber: (sum.fiber ?? 0) + (option.nutrition.fiber ?? 0),
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  return (
    <section className="glass-panel rounded-[24px] p-4 desktop:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--emerald)]">جمع انتخاب‌های روز</p>
          <p className="mt-1 text-xs font-black text-[var(--text-primary)]">
            هدف: {formatNumber(day.targets.calories)} کالری ·{' '}
            {formatNumber(day.targets.protein)} گرم پروتئین
          </p>
        </div>
        <ListChecks aria-hidden="true" className="text-[var(--emerald)]" size={21} />
      </div>
      <div className="mt-4">
        <NutritionGrid nutrition={total} compact />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold leading-5 text-[var(--text-muted)]">
        {day.targets.fiber !== undefined && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
            فیبر هدف: {formatNumber(day.targets.fiber)} گرم
          </span>
        )}
        {day.targets.waterMl !== undefined && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
            آب: {formatNumber(day.targets.waterMl)} میلی‌لیتر
          </span>
        )}
        {day.targets.steps !== undefined && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
            قدم: {formatNumber(day.targets.steps)}
          </span>
        )}
        {day.targets.treadmillMinutes !== undefined && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1">
            تردمیل: {formatNumber(day.targets.treadmillMinutes)} دقیقه
          </span>
        )}
      </div>
    </section>
  )
}

function RestaurantCard({ choice }: { choice: RestaurantChoice }) {
  const [quantity, setQuantity] = useState(1)
  const scaledNutrition = Object.fromEntries(
    Object.entries(choice.estimatedNutrition).map(([key, value]) => [key, value * quantity]),
  ) as unknown as Nutrition

  return (
    <article className="glass-panel rounded-[24px] p-4 desktop:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-[var(--emerald)]">{choice.category}</span>
          <h3 className="mt-1 text-sm font-black text-[var(--text-primary)]">{choice.title}</h3>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-[11px] font-black text-[var(--gold)]">
          <Star aria-hidden="true" size={11} fill="currentColor" />
          {toPersianDigits(choice.rating)}
        </div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {choice.orderInstructions.map((instruction) => (
          <li
            className="flex gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-2.5 text-[11px] leading-6 text-[var(--text-secondary)]"
            key={instruction}
          >
            <Check aria-hidden="true" className="mt-1 shrink-0 text-[var(--emerald)]" size={12} />
            {instruction}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-[var(--text-muted)]">مقدار سفارش</p>
        <div className="flex gap-1">
          {[0.5, 1, 1.5].map((value) => (
            <button
              className={`min-h-10 min-w-11 rounded-lg text-[11px] font-black ${
                quantity === value
                  ? 'bg-[var(--emerald)] text-[#07110d]'
                  : 'bg-[var(--surface-soft)] text-[var(--text-secondary)]'
              }`}
              key={value}
              onClick={() => setQuantity(value)}
              type="button"
            >
              ×{toPersianDigits(value)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <NutritionGrid nutrition={scaledNutrition} compact />
      </div>
      {choice.notes && choice.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {choice.notes.map((note) => (
            <li className="text-[10px] leading-5 text-[var(--text-muted)]" key={note}>
              • {note}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">
        مقادیر تغذیه‌ای تخمینی هستند.
      </p>
    </article>
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
      <section className="glass-panel relative flex min-h-[520px] overflow-hidden rounded-[28px] p-6">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative m-auto max-w-md text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <UtensilsCrossed aria-hidden="true" size={28} />
          </div>
          <p className="mt-6 text-xs font-bold text-[var(--emerald)]">برنامه غذایی</p>
          <h1 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
            برنامه‌ای وارد نشده است
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            از بخش تنظیمات فایل JSON هفتگی را وارد کن. تمام وعده‌ها و اطلاعات این صفحه از همان
            فایل ساخته می‌شوند.
          </p>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-strong),var(--surface))] p-5 desktop:p-7">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex flex-col gap-4 desktop:flex-row desktop:items-start desktop:justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--emerald)]">برنامه فعال</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)] desktop:text-3xl">
                {plan.planName}
              </h1>
              {plan.description && (
                <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--text-secondary)]">
                  {plan.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--text-muted)]">
                <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
                  {formatJalaliDate(plan.validFrom, 'long')} تا{' '}
                  {formatJalaliDate(plan.validTo, 'long')}
                </span>
                <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
                  نسخه {plan.planVersion}
                </span>
                {plan.author && (
                  <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
                    {plan.author}
                  </span>
                )}
              </div>
            </div>
            {activeKeys.length > 1 && (
              <label className="min-w-56">
                <span className="mb-2 block text-[11px] font-bold text-[var(--text-muted)]">
                  انتخاب برنامه
                </span>
                <select
                  className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-xs font-bold text-[var(--text-primary)] outline-none"
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
                </select>
              </label>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 desktop:grid-cols-[1fr_1.5fr] desktop:p-5">
        <div className="rounded-2xl bg-[var(--emerald-soft)] p-4">
          <p className="text-[11px] font-bold text-[var(--emerald)]">پروفایل این برنامه</p>
          <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
            {plan.profile.name} · {toPersianDigits(plan.profile.age)} سال
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold leading-5 text-[var(--text-secondary)]">
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1">
              {toPersianDigits(plan.profile.currentWeightKg)} کیلو
            </span>
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1">
              هدف {toPersianDigits(plan.profile.targetWeightKg)} کیلو
            </span>
            {plan.profile.bodyComposition?.bodyFatPercent !== undefined && (
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1">
                چربی بدن {toPersianDigits(plan.profile.bodyComposition.bodyFatPercent)}٪
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
          <p className="text-[11px] font-bold text-[var(--gold)]">منطق برنامه منعطف</p>
          <p className="mt-2 text-xs font-black leading-6 text-[var(--text-primary)]">
            {plan.planningContext.requestedMealPattern}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold leading-5 text-[var(--text-muted)]">
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
              {toPersianDigits(plan.planningContext.preferredOptionCount)} انتخاب برای هر وعده
            </span>
            {plan.planningContext.favoriteFoods.slice(0, 3).map((food) => (
              <span
                className="rounded-full border border-[var(--border)] px-2.5 py-1"
                key={food}
              >
                {food}
              </span>
            ))}
            {plan.planningContext.trainingSchedule.length > 0 && (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1">
                {toPersianDigits(plan.planningContext.trainingSchedule.length)} روز فعالیت
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
        {[
          { id: 'meals' as const, label: 'وعده‌ها', icon: UtensilsCrossed },
          { id: 'grocery' as const, label: 'لیست خرید', icon: ShoppingBasket },
          { id: 'restaurant' as const, label: 'رستوران', icon: MapPin },
        ].map(({ id, label, icon: Icon }) => (
          <button
            className={`flex min-h-11 min-w-28 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-black ${
              section === id
                ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                : 'text-[var(--text-muted)]'
            }`}
            key={id}
            onClick={() => setSection(id)}
            type="button"
          >
            <Icon aria-hidden="true" size={16} />
            {label}
          </button>
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
                      ? 'border-[var(--emerald)] bg-[var(--emerald-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  type="button"
                >
                  <p
                    className={`text-[11px] font-bold ${selected ? 'text-[var(--emerald)]' : 'text-[var(--text-muted)]'}`}
                  >
                    {formatJalaliDate(day.date, 'weekday')}
                  </p>
                  <p className="mt-1 text-xs font-black text-[var(--text-primary)]">
                    {formatJalaliDate(day.date, 'long').replace(
                      ` ${toPersianDigits(new Date(day.date).getUTCFullYear())}`,
                      '',
                    )}
                  </p>
                  {day.trainingType && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[var(--gold)]">
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
                  <div className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-xs font-bold text-[var(--text-secondary)]">
                    {selectedDay.label}
                  </div>
                )}
                <DayMeals day={selectedDay} />
              </div>
              <div className="space-y-3 desktop:sticky desktop:top-24 desktop:h-fit">
                <PlannedTotals day={selectedDay} />
                {selectedDay.notes && selectedDay.notes.length > 0 && (
                  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--gold-soft)] p-4">
                    <p className="text-xs font-black text-[var(--gold)]">یادداشت‌های روز</p>
                    <ul className="mt-2 space-y-1.5">
                      {selectedDay.notes.map((note) => (
                        <li
                          className="flex gap-2 text-[11px] leading-6 text-[var(--text-secondary)]"
                          key={note}
                        >
                          <AlertTriangle
                            aria-hidden="true"
                            className="mt-1 shrink-0 text-[var(--gold)]"
                            size={11}
                          />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          )}

          {plan.emergencyOptions.length > 0 && (
            <section className="glass-panel rounded-[26px] p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[var(--gold-soft)] text-[var(--gold)]">
                  <Salad aria-hidden="true" size={19} />
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--text-primary)]">
                    گزینه‌های گرسنگی اضطراری
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {toPersianDigits(plan.emergencyOptions.length)} گزینه از فایل برنامه
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 desktop:grid-cols-2">
                {plan.emergencyOptions.map((option) => (
                  <article
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                    key={option.id}
                  >
                    <p className="text-xs font-black text-[var(--text-primary)]">{option.title}</p>
                    <p className="mt-2 text-[11px] font-bold text-[var(--emerald)]">
                      {formatNumber(option.nutrition.calories)} کالری ·{' '}
                      {formatNumber(option.nutrition.protein)} گرم پروتئین
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {option.suitableForHungerLevels.map((level) => (
                        <span
                          className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[10px] font-bold text-[var(--gold)]"
                          key={level}
                        >
                          گرسنگی {toPersianDigits(level)}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {section === 'grocery' && (
        <section className="grid gap-3 desktop:grid-cols-2">
          {plan.groceryList && plan.groceryList.length > 0 ? (
            plan.groceryList.map((group) => (
              <article className="glass-panel rounded-[24px] p-4 desktop:p-5" key={group.category}>
                <div className="flex items-center gap-2">
                  <ShoppingBasket aria-hidden="true" className="text-[var(--emerald)]" size={18} />
                  <h2 className="text-sm font-black text-[var(--text-primary)]">{group.category}</h2>
                </div>
                <div className="mt-4 space-y-1.5">
                  {group.items.map((item, index) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-2.5"
                      key={`${item.name}-${index}`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {item.name}
                        </p>
                        {item.note && (
                          <p className="mt-1 text-[10px] leading-5 text-[var(--text-muted)]">{item.note}</p>
                        )}
                      </div>
                      {item.amount !== undefined && (
                        <span className="text-[11px] font-black text-[var(--emerald)]">
                          {formatNumber(item.amount)} {item.unit ?? ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="glass-panel col-span-full rounded-[24px] p-8 text-center">
              <ShoppingBasket
                aria-hidden="true"
                className="mx-auto text-[var(--text-muted)]"
                size={27}
              />
              <p className="mt-3 text-sm font-bold text-[var(--text-secondary)]">
                لیست خریدی در فایل وجود ندارد.
              </p>
            </div>
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
            <div className="glass-panel col-span-full rounded-[24px] p-8 text-center">
              <MapPin aria-hidden="true" className="mx-auto text-[var(--text-muted)]" size={27} />
              <p className="mt-3 text-sm font-bold text-[var(--text-secondary)]">
                راهنمای رستورانی در فایل وجود ندارد.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
