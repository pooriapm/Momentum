import {
  ChefHat,
  Clock3,
  Lightbulb,
  ListChecks,
  X,
} from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
import { Surface } from '../../components/ui/Surface'
import { toPersianDigits } from '../../lib/dates/jalali'
import { UNIT_LABELS } from '../../lib/formatting/nutrition'
import type { MealOption } from '../../types/domain'

const difficultyLabels = {
  easy: 'آسان',
  medium: 'متوسط',
  hard: 'سخت',
} as const

export function RecipeScreen({
  option,
  onClose,
}: {
  option: MealOption
  onClose: () => void
}) {
  if (!option.recipe) return null

  return (
    <Dialog contentClassName="overflow-hidden p-0" size="xl">
        <header className="relative overflow-hidden border-b border-[var(--color-border)] p-5 desktop:p-8">
          <div className="fine-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="relative flex items-start gap-4">
            <IconTile className="size-13 rounded-[18px]">
              <ChefHat aria-hidden="true" size={25} />
            </IconTile>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-accent)]">
                دستور پخت مرحله‌به‌مرحله
              </p>
              <h1 className="mt-2 text-2xl font-black leading-9 text-[var(--color-text)]">
                {option.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--color-text-secondary)]">
                <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5">
                  سختی: {difficultyLabels[option.recipe.difficulty]}
                </span>
                {option.recipe.estimatedCookingTime !== undefined && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5">
                    <Clock3 aria-hidden="true" size={13} />
                    {toPersianDigits(option.recipe.estimatedCookingTime)} دقیقه
                  </span>
                )}
              </div>
            </div>
            <IconButton
              aria-label="بستن دستور پخت"
              onClick={onClose}
            >
              <X aria-hidden="true" size={20} />
            </IconButton>
          </div>
        </header>

        <div className="grid gap-6 p-5 desktop:grid-cols-[0.8fr_1.2fr] desktop:p-8">
          <section>
            <div className="flex items-center gap-2">
              <ListChecks
                aria-hidden="true"
                className="text-[var(--color-accent)]"
                size={18}
              />
              <h2 className="text-base font-black text-[var(--color-text)]">
                مواد لازم
              </h2>
            </div>
            <div className="mt-4 space-y-2">
              {option.ingredients.map((ingredient, index) => (
                <Surface
                  className="flex items-start justify-between gap-3 rounded-2xl p-3"
                  key={`${ingredient.name}-${index}`}
                  variant="muted"
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
                    {toPersianDigits(ingredient.amount)}{' '}
                    {UNIT_LABELS[ingredient.unit] ?? ingredient.unit}
                  </span>
                </Surface>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section>
              <h2 className="text-base font-black text-[var(--color-text)]">
                مراحل پخت
              </h2>
              <ol className="mt-4 space-y-3">
                {option.recipe.steps.map((step, index) => (
                  <li
                    className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm leading-7 text-[var(--color-text-secondary)]"
                    key={`${step}-${index}`}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-xs font-black text-[var(--color-on-accent)]">
                      {toPersianDigits(index + 1)}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {option.recipe.tips && option.recipe.tips.length > 0 && (
              <Surface as="section" className="rounded-[22px] p-4" variant="highlight">
                <div className="flex items-center gap-2 text-[var(--color-highlight)]">
                  <Lightbulb aria-hidden="true" size={18} />
                  <h2 className="text-sm font-black">نکته‌های بهتر شدن نتیجه</h2>
                </div>
                <ul className="mt-3 space-y-2">
                  {option.recipe.tips.map((tip) => (
                    <li
                      className="text-xs leading-6 text-[var(--color-text-secondary)]"
                      key={tip}
                    >
                      • {tip}
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          </div>
        </div>
    </Dialog>
  )
}
