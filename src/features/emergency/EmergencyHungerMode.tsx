import { useMemo, useState } from 'react'
import { Check, Clock3, Flame, ShieldCheck, Star, X } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { toPersianDigits } from '../../lib/dates/jalali'
import type { EmergencyOption, ISODate } from '../../types/domain'

type DinnerWindow = 'under60' | 'oneToTwo' | 'overTwo'

const dinnerWindows: Array<{
  id: DinnerWindow
  label: string
  minutes: number
}> = [
  { id: 'under60', label: 'کمتر از ۶۰ دقیقه', minutes: 45 },
  { id: 'oneToTwo', label: '۱ تا ۲ ساعت', minutes: 90 },
  { id: 'overTwo', label: 'بیشتر از ۲ ساعت', minutes: 150 },
]

export function EmergencyHungerMode({
  date,
  options,
  onClose,
}: {
  date: ISODate
  options: EmergencyOption[]
  onClose: () => void
}) {
  const { logEmergencyFood } = useAppState()
  const [hunger, setHunger] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [dinnerWindow, setDinnerWindow] = useState<DinnerWindow>('oneToTwo')
  const [loggedOptionId, setLoggedOptionId] = useState<string>()
  const minutes = dinnerWindows.find((window) => window.id === dinnerWindow)?.minutes ?? 90

  const matches = useMemo(() => {
    const exact = options.filter(
      (option) =>
        option.suitableForHungerLevels.includes(hunger) &&
        (option.minimumMinutesBeforeDinner === undefined ||
          minutes >= option.minimumMinutesBeforeDinner) &&
        (option.maximumMinutesBeforeDinner === undefined ||
          minutes <= option.maximumMinutesBeforeDinner),
    )

    if (exact.length > 0) return exact
    return options.filter((option) => option.suitableForHungerLevels.includes(hunger))
  }, [hunger, minutes, options])

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm desktop:items-center desktop:p-5"
      role="dialog"
    >
      <div className="safe-bottom max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-2xl desktop:rounded-[30px] desktop:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--gold)]">حالت کنترل گرسنگی</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
              گرسنگی اضطراری
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              پیشنهادها فقط از برنامه غذایی واردشده انتخاب می‌شوند.
            </p>
          </div>
          <button
            aria-label="بستن حالت گرسنگی اضطراری"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <fieldset className="mt-6">
          <legend className="text-xs font-black text-[var(--text-primary)]">
            شدت گرسنگی چقدر است؟
          </legend>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <button
                aria-pressed={hunger === level}
                className={`min-h-12 rounded-xl text-sm font-black ${
                  hunger === level
                    ? 'bg-[var(--gold)] text-[#171006]'
                    : 'border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]'
                }`}
                key={level}
                onClick={() => setHunger(level)}
                type="button"
              >
                {toPersianDigits(level)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs font-black text-[var(--text-primary)]">
            شام چقدر فاصله دارد؟
          </legend>
          <div className="mt-3 grid gap-2 desktop:grid-cols-3">
            {dinnerWindows.map((window) => (
              <button
                aria-pressed={dinnerWindow === window.id}
                className={`min-h-12 rounded-xl px-3 text-xs font-bold ${
                  dinnerWindow === window.id
                    ? 'border border-[var(--emerald)] bg-[var(--emerald-soft)] text-[var(--emerald)]'
                    : 'border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]'
                }`}
                key={window.id}
                onClick={() => setDinnerWindow(window.id)}
                type="button"
              >
                {window.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[var(--text-primary)]">پیشنهادهای مناسب</p>
            <span className="text-[9px] font-bold text-[var(--text-muted)]">
              {toPersianDigits(matches.length)} گزینه
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {matches.map((option) => (
              <article
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                key={option.id}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[var(--text-primary)]">{option.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-bold text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Flame aria-hidden="true" size={11} />
                        {toPersianDigits(option.nutrition.calories)} کالری
                      </span>
                      <span>{toPersianDigits(option.nutrition.protein)}g پروتئین</span>
                      {option.prepTimeMinutes !== undefined && (
                        <span className="flex items-center gap-1">
                          <Clock3 aria-hidden="true" size={11} />
                          {toPersianDigits(option.prepTimeMinutes)} دقیقه
                        </span>
                      )}
                      {option.satietyScore !== undefined && (
                        <span className="flex items-center gap-1">
                          <Star aria-hidden="true" size={11} />
                          سیری {toPersianDigits(option.satietyScore)}/۵
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black ${
                      loggedOptionId === option.id
                        ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                        : 'bg-[var(--emerald)] text-[#07110d]'
                    }`}
                    disabled={loggedOptionId !== undefined}
                    onClick={() => {
                      if (logEmergencyFood(date, option)) {
                        setLoggedOptionId(option.id)
                      }
                    }}
                    type="button"
                  >
                    {loggedOptionId === option.id ? (
                      <>
                        <Check aria-hidden="true" size={14} />
                        ثبت شد
                      </>
                    ) : (
                      <>
                        <ShieldCheck aria-hidden="true" size={14} />
                        ثبت · ۵ XP
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
            {matches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-5 text-center">
                <p className="text-xs font-bold text-[var(--text-secondary)]">
                  گزینه متناسبی در فایل برنامه وجود ندارد.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
