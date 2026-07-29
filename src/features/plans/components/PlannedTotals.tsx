import { ListChecks } from 'lucide-react'
import { useAppState } from '../../../app/useAppState'
import { Badge } from '../../../components/ui/Badge'
import { Surface } from '../../../components/ui/Surface'
import { formatNutritionNumber } from '../../../lib/formatting/nutrition'
import type { Nutrition, PlanDay } from '../../../types/domain'
import { NutritionGrid } from './NutritionGrid'

export function PlannedTotals({ day }: { day: PlanDay }) {
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

  const targetBadges = [
    day.targets.fiber === undefined
      ? undefined
      : `فیبر هدف: ${formatNutritionNumber(day.targets.fiber)} گرم`,
    day.targets.waterMl === undefined
      ? undefined
      : `آب: ${formatNutritionNumber(day.targets.waterMl)} میلی‌لیتر`,
    day.targets.steps === undefined
      ? undefined
      : `قدم: ${formatNutritionNumber(day.targets.steps)}`,
    day.targets.treadmillMinutes === undefined
      ? undefined
      : `تردمیل: ${formatNutritionNumber(day.targets.treadmillMinutes)} دقیقه`,
  ].filter((value): value is string => Boolean(value))

  return (
    <Surface as="section" className="rounded-[24px] p-4 desktop:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[var(--color-accent)]">جمع انتخاب‌های روز</p>
          <p className="mt-1 text-xs font-black text-[var(--color-text)]">
            هدف: {formatNutritionNumber(day.targets.calories)} کالری ·{' '}
            {formatNutritionNumber(day.targets.protein)} گرم پروتئین
          </p>
        </div>
        <ListChecks aria-hidden="true" className="text-[var(--color-accent)]" size={21} />
      </div>
      <div className="mt-4">
        <NutritionGrid nutrition={total} compact />
      </div>
      {targetBadges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {targetBadges.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      )}
    </Surface>
  )
}
