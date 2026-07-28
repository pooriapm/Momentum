import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Clock3,
  RotateCcw,
  StickyNote,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { MealOptionPicker } from '../../components/meals/MealOptionPicker'
import { toPersianDigits } from '../../lib/dates/jalali'
import { getSelectedMealOption } from '../../lib/calculations/nutrition'
import type { ISODate, MealSlot } from '../../types/domain'

export function TodayMealCard({ date, meal }: { date: ISODate; meal: MealSlot }) {
  const {
    appState,
    selectMealOption,
    toggleMealCompletion,
    saveMealNote,
  } = useAppState()
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(() => appState?.dailyLogs[date]?.mealNotes?.[meal.id] ?? '')

  if (!appState) return null

  const option = getSelectedMealOption(appState, date, meal)
  const selectedOptionId =
    appState.dailyLogs[date]?.selectedMealOptions[meal.id] ?? meal.defaultOptionId
  const completion = appState.dailyLogs[date]?.consumedMeals[meal.id]
  const completed = completion?.completed === true

  return (
    <article
      className={`overflow-hidden rounded-[24px] border transition ${
        completed
          ? 'border-[color-mix(in_srgb,var(--emerald)_45%,transparent)] bg-[var(--emerald-soft)]'
          : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
      id={`meal-${meal.id}`}
    >
      <div className="p-4 desktop:p-5">
        <div className="flex items-start gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${
              completed
                ? 'bg-[var(--emerald)] text-[#07110d]'
                : 'bg-[var(--surface-soft)] text-[var(--emerald)]'
            }`}
          >
            {completed ? (
              <Check aria-hidden="true" size={19} />
            ) : (
              <UtensilsCrossed aria-hidden="true" size={18} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-[var(--text-primary)]">{meal.title}</h3>
              {meal.scheduledTime && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-muted)]">
                  <Clock3 aria-hidden="true" size={12} />
                  {toPersianDigits(meal.scheduledTime)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs font-bold text-[var(--text-secondary)]">
              انتخاب فعلی: {option.title}
            </p>
            <p className="mt-1 line-clamp-1 text-[9px] leading-5 text-[var(--text-muted)]">
              {option.ingredients.map((ingredient) => ingredient.name).join('، ')}
            </p>
          </div>
          <button
            aria-label={`${expanded ? 'بستن' : 'نمایش'} جزئیات ${meal.title}`}
            aria-expanded={expanded}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={() => setExpanded((current) => !current)}
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
          onSelect={(optionId) => selectMealOption(date, meal.id, optionId)}
          selectedOptionId={selectedOptionId}
        />

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
            <div>
              <p className="text-[9px] font-black text-[var(--text-secondary)]">
                مواد اولیه «{option.title}»
              </p>
              <div className="mt-2 grid gap-1.5 desktop:grid-cols-2">
                {option.ingredients.map((ingredient, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-2"
                    key={`${ingredient.name}-${index}`}
                  >
                    <span className="text-[9px] font-bold text-[var(--text-primary)]">
                      {ingredient.name}
                    </span>
                    <span className="text-[8px] font-black text-[var(--emerald)]">
                      {toPersianDigits(ingredient.amount)} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {option.preparation && option.preparation.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-[var(--text-secondary)]">آماده‌سازی</p>
                <ol className="mt-2 space-y-1">
                  {option.preparation.map((step, index) => (
                    <li
                      className="flex gap-2 text-[9px] leading-5 text-[var(--text-secondary)]"
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

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)]">
                <StickyNote aria-hidden="true" size={13} />
                یادداشت این وعده
              </span>
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
                onBlur={() => saveMealNote(date, meal.id, note)}
                onChange={(event) => setNote(event.target.value)}
                placeholder="یادداشت اختیاری…"
                value={note}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black ${
              completed
                ? 'border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]'
                : 'bg-[var(--emerald)] text-[#07110d] shadow-[0_8px_22px_rgba(70,205,145,0.18)]'
            }`}
            onClick={() => toggleMealCompletion(date, meal.id, meal.xp)}
            type="button"
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
          </button>
        </div>
      </div>
    </article>
  )
}
