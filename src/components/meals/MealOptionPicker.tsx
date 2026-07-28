import {
  Check,
  Clock3,
  PackageCheck,
  Star,
} from 'lucide-react'
import { toPersianDigits } from '../../lib/dates/jalali'
import type { MealSlot } from '../../types/domain'

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
        <span className="text-[10px] font-black text-[var(--text-primary)]">
          یکی از {toPersianDigits(meal.options.length)} گزینه را انتخاب کن
        </span>
        {disabled && (
          <span className="text-[8px] font-bold text-[var(--emerald)]">
            در لاگ روزانه ثبت شده
          </span>
        )}
      </legend>
      <div
        className="mt-3 grid gap-2 desktop:grid-cols-2"
        role="radiogroup"
        aria-label={`گزینه‌های ${meal.title}`}
      >
        {meal.options.map((candidate) => {
          const selected = candidate.id === selectedOptionId

          return (
            <button
              aria-checked={selected}
              className={`relative min-h-[132px] rounded-2xl border p-3.5 text-right transition ${
                selected
                  ? 'border-[var(--emerald)] bg-[var(--emerald-soft)] shadow-[0_8px_24px_rgba(70,205,145,0.08)]'
                  : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
              } disabled:cursor-not-allowed`}
              disabled={disabled}
              key={candidate.id}
              onClick={() => onSelect(candidate.id)}
              role="radio"
              type="button"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                    selected
                      ? 'border-[var(--emerald)] bg-[var(--emerald)] text-[#07110d]'
                      : 'border-[var(--border-strong)] text-transparent'
                  }`}
                >
                  <Check aria-hidden="true" size={13} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-black text-[var(--text-primary)]">
                      {candidate.title}
                    </span>
                    {candidate.id === meal.defaultOptionId && (
                      <span className="rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[7px] font-black text-[var(--gold)]">
                        پیشنهاد برنامه
                      </span>
                    )}
                  </span>
                  {candidate.subtitle && (
                    <span className="mt-1 block text-[8px] leading-4 text-[var(--text-muted)]">
                      {candidate.subtitle}
                    </span>
                  )}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-[8px] leading-4 text-[var(--text-muted)]">
                {candidate.ingredients.map((ingredient) => ingredient.name).join('، ')}
              </p>

              <div className="mt-3 grid grid-cols-4 gap-1">
                {[
                  ['کالری', candidate.nutrition.calories],
                  ['پروتئین', `${candidate.nutrition.protein}g`],
                  ['کربوهیدرات', `${candidate.nutrition.carbs}g`],
                  ['چربی', `${candidate.nutrition.fat}g`],
                ].map(([label, value]) => (
                  <span
                    className="rounded-lg bg-[color-mix(in_srgb,var(--surface-strong)_75%,transparent)] px-1.5 py-1.5 text-center"
                    key={label}
                  >
                    <span className="block text-[7px] font-bold text-[var(--text-muted)]">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[8px] font-black text-[var(--text-primary)]">
                      {toPersianDigits(value)}
                    </span>
                  </span>
                ))}
              </div>

              {(candidate.prepTimeMinutes !== undefined ||
                candidate.portable ||
                candidate.satietyScore !== undefined) && (
                <div className="mt-3 flex flex-wrap gap-1.5 text-[7px] font-bold text-[var(--text-muted)]">
                  {candidate.prepTimeMinutes !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock3 aria-hidden="true" size={10} />
                      {toPersianDigits(candidate.prepTimeMinutes)} دقیقه
                    </span>
                  )}
                  {candidate.portable && (
                    <span className="flex items-center gap-1">
                      <PackageCheck aria-hidden="true" size={10} />
                      قابل حمل
                    </span>
                  )}
                  {candidate.satietyScore !== undefined && (
                    <span className="flex items-center gap-1">
                      <Star aria-hidden="true" size={10} />
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
