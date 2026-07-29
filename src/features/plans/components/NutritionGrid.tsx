import {
  Beef,
  ChefHat,
  Flame,
  Salad,
  type LucideIcon,
} from 'lucide-react'
import { Surface } from '../../../components/ui/Surface'
import { formatNutritionNumber } from '../../../lib/formatting/nutrition'
import type { Nutrition } from '../../../types/domain'

interface NutritionMetric {
  key: keyof Pick<Nutrition, 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>
  label: string
  suffix: string
  icon: LucideIcon
  optional?: boolean
}

const NUTRITION_METRICS: readonly NutritionMetric[] = [
  { key: 'calories', label: 'کالری', suffix: '', icon: Flame },
  { key: 'protein', label: 'پروتئین', suffix: 'g', icon: Beef },
  { key: 'carbs', label: 'کربوهیدرات', suffix: 'g', icon: Salad },
  { key: 'fat', label: 'چربی', suffix: 'g', icon: ChefHat },
  { key: 'fiber', label: 'فیبر', suffix: 'g', icon: Salad, optional: true },
]

export function NutritionGrid({
  nutrition,
  compact = false,
}: {
  nutrition: Nutrition
  compact?: boolean
}) {
  const items = NUTRITION_METRICS.flatMap((metric) => {
    const value = nutrition[metric.key]
    return metric.optional && value === undefined
      ? []
      : [{ ...metric, value: value ?? 0 }]
  })

  return (
    <div
      className={`grid gap-1.5 ${compact ? '' : 'desktop:gap-2'}`}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {items.map(({ key, label, value, suffix, icon: Icon }) => (
        <Surface
          className="rounded-xl p-2 text-center desktop:p-3"
          key={key}
          variant="muted"
        >
          {!compact && (
            <Icon
              aria-hidden="true"
              className="mx-auto mb-1 text-[var(--color-accent)]"
              size={14}
            />
          )}
          <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1 text-xs font-black text-[var(--color-text)]">
            {formatNutritionNumber(value)}
            {suffix}
          </p>
        </Surface>
      ))}
    </div>
  )
}
