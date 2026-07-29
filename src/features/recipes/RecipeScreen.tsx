import {
  ChefHat,
  Clock3,
  Lightbulb,
  ListChecks,
  X,
} from 'lucide-react'
import { ViewportPortal } from '../../components/overlay/ViewportPortal'
import { toPersianDigits } from '../../lib/dates/jalali'
import type { MealOption } from '../../types/domain'

const difficultyLabels = {
  easy: 'آسان',
  medium: 'متوسط',
  hard: 'سخت',
} as const

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

export function RecipeScreen({
  option,
  onClose,
}: {
  option: MealOption
  onClose: () => void
}) {
  if (!option.recipe) return null

  return (
    <ViewportPortal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[80] h-[100dvh] overflow-y-auto overscroll-contain bg-[rgba(2,8,6,0.82)] p-4 backdrop-blur-md desktop:p-8"
        role="dialog"
      >
        <div className="recipe-screen-enter mx-auto max-w-3xl overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface-strong)] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <header className="relative overflow-hidden border-b border-[var(--border)] p-5 desktop:p-8">
          <div className="fine-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative flex items-start gap-4">
            <div className="animated-icon grid size-13 shrink-0 place-items-center rounded-[18px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
              <ChefHat aria-hidden="true" size={25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--emerald)]">
                دستور پخت مرحله‌به‌مرحله
              </p>
              <h1 className="mt-2 text-2xl font-black leading-9 text-[var(--text-primary)]">
                {option.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--text-secondary)]">
                <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
                  سختی: {difficultyLabels[option.recipe.difficulty]}
                </span>
                {option.recipe.estimatedCookingTime !== undefined && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--surface-soft)] px-3 py-1.5">
                    <Clock3 aria-hidden="true" size={13} />
                    {toPersianDigits(option.recipe.estimatedCookingTime)} دقیقه
                  </span>
                )}
              </div>
            </div>
            <button
              aria-label="بستن دستور پخت"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
        </header>

        <div className="grid gap-6 p-5 desktop:grid-cols-[0.8fr_1.2fr] desktop:p-8">
          <section>
            <div className="flex items-center gap-2">
              <ListChecks
                aria-hidden="true"
                className="text-[var(--emerald)]"
                size={18}
              />
              <h2 className="text-base font-black text-[var(--text-primary)]">
                مواد لازم
              </h2>
            </div>
            <div className="mt-4 space-y-2">
              {option.ingredients.map((ingredient, index) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                  key={`${ingredient.name}-${index}`}
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {ingredient.name}
                    </p>
                    {ingredient.note && (
                      <p className="mt-1 text-[10px] leading-5 text-[var(--text-muted)]">
                        {ingredient.note}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] font-black text-[var(--emerald)]">
                    {toPersianDigits(ingredient.amount)}{' '}
                    {unitLabels[ingredient.unit] ?? ingredient.unit}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section>
              <h2 className="text-base font-black text-[var(--text-primary)]">
                مراحل پخت
              </h2>
              <ol className="mt-4 space-y-3">
                {option.recipe.steps.map((step, index) => (
                  <li
                    className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-[var(--text-secondary)]"
                    key={`${step}-${index}`}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--emerald)] text-xs font-black text-[#07110d]">
                      {toPersianDigits(index + 1)}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {option.recipe.tips && option.recipe.tips.length > 0 && (
              <section className="rounded-[22px] border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[var(--gold-soft)] p-4">
                <div className="flex items-center gap-2 text-[var(--gold)]">
                  <Lightbulb aria-hidden="true" size={18} />
                  <h2 className="text-sm font-black">نکته‌های بهتر شدن نتیجه</h2>
                </div>
                <ul className="mt-3 space-y-2">
                  {option.recipe.tips.map((tip) => (
                    <li
                      className="text-xs leading-6 text-[var(--text-secondary)]"
                      key={tip}
                    >
                      • {tip}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
        </div>
      </div>
    </ViewportPortal>
  )
}
