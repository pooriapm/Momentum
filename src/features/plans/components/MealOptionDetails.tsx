import { Badge } from '../../../components/ui/Badge'
import { UNIT_LABELS, formatNutritionNumber } from '../../../lib/formatting/nutrition'
import { toPersianDigits } from '../../../lib/dates/jalali'
import type { MealOption } from '../../../types/domain'
import { NutritionGrid } from './NutritionGrid'

export function MealOptionDetails({ option }: { option: MealOption }) {
  return (
    <div className="mt-4 space-y-4 border-t border-[var(--color-border)] pt-4">
      <NutritionGrid nutrition={option.nutrition} />

      <div>
        <p className="text-xs font-black text-[var(--color-text-secondary)]">مواد اولیه</p>
        <div className="mt-2 grid gap-1.5 desktop:grid-cols-2">
          {option.ingredients.map((ingredient, index) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2"
              key={`${ingredient.name}-${index}`}
            >
              <div>
                <p className="text-xs font-bold text-[var(--color-text)]">
                  {ingredient.name}
                </p>
                {ingredient.note && (
                  <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-muted)]">
                    {ingredient.note}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] font-black text-[var(--color-accent)]">
                {formatNutritionNumber(ingredient.amount)}{' '}
                {UNIT_LABELS[ingredient.unit] ?? ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {option.preparation && option.preparation.length > 0 && (
        <div>
          <p className="text-xs font-black text-[var(--color-text-secondary)]">آماده‌سازی</p>
          <ol className="mt-2 space-y-1.5">
            {option.preparation.map((step, index) => (
              <li
                className="flex gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5 text-[11px] leading-6 text-[var(--color-text-secondary)]"
                key={`${step}-${index}`}
              >
                <span className="font-black text-[var(--color-accent)]">
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
            <Badge key={tag} tone="accent">
              {tag}
            </Badge>
          ))}
          {option.warnings?.map((warning) => (
            <Badge key={warning} tone="highlight">
              {warning}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
