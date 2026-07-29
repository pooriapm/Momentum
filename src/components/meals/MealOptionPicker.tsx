import {
  BadgeCheck,
  Check,
  Clock3,
  PackageCheck,
  Star,
} from 'lucide-react'
import { toPersianDigits } from '../../lib/dates/jalali'
import type { MealSlot } from '../../types/domain'

const confidenceLabels = {
  estimated: 'برآوردی',
  verified: 'تأییدشده',
  usda: 'USDA',
  manufacturer: 'سازنده',
} as const

export function MealOptionPicker({
  meal,
  selectedOptionId,
  disabled = false,
  onSelect,
}: {
  meal: MealSlot
  selectedOptionId: string
  disabled?: boolean
  onSelect: (optionId: string) => void
}) {
  return (
    <fieldset className="mt-4" disabled={disabled}>
      <legend className="flex w-full items-center justify-between gap-3">
        <span className="text-xs font-black text-[var(--text-primary)]">
          یکی از {toPersianDigits(meal.options.length)} گزینه را انتخاب کن
        </span>
        {disabled && (
          <span className="text-[10px] font-bold text-[var(--emerald)]">
            در لاگ روزانه ثبت شده
          </span>
        )}
      </legend>
      <div
        className="mt-3 grid gap-2 desktop:grid-cols-2"
        role="radiogroup"
        aria-label={`گزینه‌های ${meal.title}`}
      >
        {meal.options.map((candidate, index) => {
          const selected = candidate.id === selectedOptionId

          return (
            <button
              aria-checked={selected}
              className={`meal-option-card relative min-h-[164px] rounded-2xl border p-4 text-right ${
                selected
                  ? 'border-[var(--emerald)] bg-[var(--emerald-soft)] shadow-[0_8px_24px_rgba(70,205,145,0.08)]'
                  : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
              } disabled:cursor-not-allowed`}
              disabled={disabled}
              key={candidate.id}
              onClick={() => onSelect(candidate.id)}
              role="radio"
              style={{ animationDelay: `${index * 55}ms` }}
              type="button"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`meal-option-check mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border ${
                    selected
                      ? 'border-[var(--emerald)] bg-[var(--emerald)] text-[#07110d]'
                      : 'border-[var(--border-strong)] text-transparent'
                  }`}
                >
                  <Check aria-hidden="true" size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-black leading-6 text-[var(--text-primary)]">
                      {candidate.title}
                    </span>
                    {candidate.id === meal.defaultOptionId && (
                      <span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[10px] font-black text-[var(--gold)]">
                        پیشنهاد برنامه
                      </span>
                    )}
                  </span>
                  {candidate.subtitle && (
                    <span className="mt-1.5 block text-[11px] leading-5 text-[var(--text-muted)]">
                      {candidate.subtitle}
                    </span>
                  )}
                </span>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                {candidate.ingredients.map((ingredient) => ingredient.name).join('، ')}
              </p>

              {candidate.nutritionConfidence && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                  <BadgeCheck
                    aria-hidden="true"
                    className={
                      candidate.nutritionConfidence === 'estimated'
                        ? 'text-[var(--gold)]'
                        : 'text-[var(--emerald)]'
                    }
                    size={12}
                  />
                  تغذیه {confidenceLabels[candidate.nutritionConfidence]}
                  {candidate.nutritionSource
                    ? ` · ${candidate.nutritionSource}`
                    : ''}
                </div>
              )}

              <div className="mt-3 grid grid-cols-4 gap-1">
                {[
                  ['کالری', candidate.nutrition.calories],
                  ['پروتئین', `${candidate.nutrition.protein}g`],
                  ['کربوهیدرات', `${candidate.nutrition.carbs}g`],
                  ['چربی', `${candidate.nutrition.fat}g`],
                ].map(([label, value]) => (
                  <span
                    className="rounded-lg bg-[color-mix(in_srgb,var(--surface-strong)_75%,transparent)] px-1.5 py-2 text-center"
                    key={label}
                  >
                    <span className="block text-[10px] font-bold leading-4 text-[var(--text-muted)]">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-black text-[var(--text-primary)]">
                      {toPersianDigits(value)}
                    </span>
                  </span>
                ))}
              </div>

              {(candidate.prepTimeMinutes !== undefined ||
                candidate.portable ||
                candidate.satietyScore !== undefined) && (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold leading-5 text-[var(--text-muted)]">
                  {candidate.prepTimeMinutes !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock3 aria-hidden="true" size={12} />
                      {toPersianDigits(candidate.prepTimeMinutes)} دقیقه
                    </span>
                  )}
                  {candidate.portable && (
                    <span className="flex items-center gap-1">
                      <PackageCheck aria-hidden="true" size={12} />
                      قابل حمل
                    </span>
                  )}
                  {candidate.satietyScore !== undefined && (
                    <span className="flex items-center gap-1">
                      <Star aria-hidden="true" size={12} />
                      سیری {toPersianDigits(candidate.satietyScore)}/۵
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
