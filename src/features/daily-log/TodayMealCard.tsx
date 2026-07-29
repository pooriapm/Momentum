import { useState } from 'react'
import {
  Check,
  ChefHat,
  ChevronDown,
  Clock3,
  RotateCcw,
  StickyNote,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { MealOptionPicker } from '../../components/meals/MealOptionPicker'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
import { RecipeScreen } from '../recipes/RecipeScreen'
import { toPersianDigits } from '../../lib/dates/jalali'
import { getSelectedMealOption } from '../../lib/calculations/nutrition'
import type { ISODate, MealSlot } from '../../types/domain'

export function TodayMealCard({
  date,
  meal,
  animationIndex = 0,
}: {
  date: ISODate
  meal: MealSlot
  animationIndex?: number
}) {
  const {
    appState,
    selectMealOption,
    toggleMealCompletion,
    saveMealNote,
  } = useAppState()
  const [expanded, setExpanded] = useState(false)
  const [showRecipe, setShowRecipe] = useState(false)
  const [note, setNote] = useState(() => appState?.dailyLogs[date]?.mealNotes?.[meal.id] ?? '')

  if (!appState) return null

  const option = getSelectedMealOption(appState, date, meal)
  const selectedOptionId =
    appState.dailyLogs[date]?.selectedMealOptions[meal.id] ?? meal.defaultOptionId
  const completion = appState.dailyLogs[date]?.consumedMeals[meal.id]
  const completed = completion?.completed === true

  return (
    <article
      className={`meal-card-enter overflow-hidden rounded-[24px] border ${
        completed
          ? 'border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)] bg-[var(--color-accent-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
      id={`meal-${meal.id}`}
      style={{ animationDelay: `${animationIndex * 70}ms` }}
    >
      <div className="p-4 desktop:p-5">
        <div className="flex items-start gap-3">
          <IconTile
            className="size-10 rounded-[14px]"
            tone={completed ? 'accent-solid' : 'accent'}
          >
            {completed ? (
              <Check aria-hidden="true" size={19} />
            ) : (
              <UtensilsCrossed aria-hidden="true" size={18} />
            )}
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-[var(--color-text)]">{meal.title}</h3>
              {meal.scheduledTime && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-text-muted)]">
                  <Clock3 aria-hidden="true" size={13} />
                  {toPersianDigits(meal.scheduledTime)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm font-bold leading-6 text-[var(--color-text-secondary)]">
              انتخاب فعلی: {option.title}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">
              {option.ingredients.map((ingredient) => ingredient.name).join('، ')}
            </p>
          </div>
          <IconButton
            aria-label={`${expanded ? 'بستن' : 'نمایش'} جزئیات ${meal.title}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
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
          onSelect={(optionId) => selectMealOption(date, meal.id, optionId)}
          selectedOptionId={selectedOptionId}
        />

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-[var(--color-border)] pt-4">
            <div>
              <p className="text-xs font-black text-[var(--color-text-secondary)]">
                مواد اولیه «{option.title}»
              </p>
              <div className="mt-2 grid gap-1.5 desktop:grid-cols-2">
                {option.ingredients.map((ingredient, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2"
                    key={`${ingredient.name}-${index}`}
                  >
                    <span className="text-xs font-bold text-[var(--color-text)]">
                      {ingredient.name}
                    </span>
                    <span className="text-[11px] font-black text-[var(--color-accent)]">
                      {toPersianDigits(ingredient.amount)} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {option.preparation && option.preparation.length > 0 && (
              <div>
                <p className="text-xs font-black text-[var(--color-text-secondary)]">آماده‌سازی</p>
                <ol className="mt-2 space-y-1">
                  {option.preparation.map((step, index) => (
                    <li
                      className="flex gap-2 text-[11px] leading-6 text-[var(--color-text-secondary)]"
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

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-text-muted)]">
                <StickyNote aria-hidden="true" size={13} />
                یادداشت این وعده
              </span>
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                onBlur={() => saveMealNote(date, meal.id, note)}
                onChange={(event) => setNote(event.target.value)}
                placeholder="یادداشت اختیاری…"
                value={note}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {option.recipe && (
            <Button
              onClick={() => setShowRecipe(true)}
              variant="outline"
            >
              <ChefHat aria-hidden="true" size={16} />
              دستور پخت
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => toggleMealCompletion(date, meal.id, meal.xp)}
            variant={completed ? 'secondary' : 'primary'}
          >
            {completed ? (
              <>
                <RotateCcw aria-hidden="true" size={16} />
                لغو مصرف
              </>
            ) : (
              <>
                <Check aria-hidden="true" size={16} />
                «{option.title}» مصرف شد · {toPersianDigits(meal.xp)} XP
              </>
            )}
          </Button>
        </div>
      </div>
      {showRecipe && (
        <RecipeScreen option={option} onClose={() => setShowRecipe(false)} />
      )}
    </article>
  )
}
