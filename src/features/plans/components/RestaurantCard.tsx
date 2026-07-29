import { Check, Star } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Surface } from '../../../components/ui/Surface'
import { toPersianDigits } from '../../../lib/dates/jalali'
import type { Nutrition, RestaurantChoice } from '../../../types/domain'
import { NutritionGrid } from './NutritionGrid'

const ORDER_QUANTITIES = [0.5, 1, 1.5] as const

export function RestaurantCard({ choice }: { choice: RestaurantChoice }) {
  const [quantity, setQuantity] = useState<number>(1)
  const scaledNutrition = Object.fromEntries(
    Object.entries(choice.estimatedNutrition).map(([key, value]) => [
      key,
      value * quantity,
    ]),
  ) as unknown as Nutrition

  return (
    <Surface as="article" className="rounded-[24px] p-4 desktop:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-[var(--color-accent)]">
            {choice.category}
          </span>
          <h3 className="mt-1 text-sm font-black text-[var(--color-text)]">
            {choice.title}
          </h3>
        </div>
        <Badge tone="highlight">
          <Star aria-hidden="true" size={11} fill="currentColor" />
          {toPersianDigits(choice.rating)}
        </Badge>
      </div>
      <ul className="mt-4 space-y-1.5">
        {choice.orderInstructions.map((instruction) => (
          <li
            className="flex gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5 text-[11px] leading-6 text-[var(--color-text-secondary)]"
            key={instruction}
          >
            <Check
              aria-hidden="true"
              className="mt-1 shrink-0 text-[var(--color-accent)]"
              size={12}
            />
            {instruction}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
          مقدار سفارش
        </p>
        <div className="flex gap-1">
          {ORDER_QUANTITIES.map((value) => (
            <Button
              className="min-w-11 rounded-lg px-2"
              key={value}
              onClick={() => setQuantity(value)}
              size="sm"
              variant={quantity === value ? 'primary' : 'secondary'}
            >
              ×{toPersianDigits(value)}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <NutritionGrid nutrition={scaledNutrition} compact />
      </div>
      {choice.notes && choice.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {choice.notes.map((note) => (
            <li className="text-[10px] leading-5 text-[var(--color-text-muted)]" key={note}>
              • {note}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-5 text-[var(--color-text-muted)]">
        مقادیر تغذیه‌ای تخمینی هستند.
      </p>
    </Surface>
  )
}
