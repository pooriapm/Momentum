import { useState, type FormEvent } from 'react'
import { Check, ClipboardCheck, Save, X } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import {
  optionalLocalizedNumber,
  sanitizeLocalizedNumberInput,
} from '../../lib/numbers/localized-number'
import type {
  DailyCheckInUpdate,
  DailyLog,
  ISODate,
} from '../../types/domain'

type WorkoutType = NonNullable<DailyCheckInUpdate['workout']>['type']

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: 1 | 2 | 3 | 4 | 5
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void
}) {
  return (
    <fieldset>
      <legend className="text-[10px] font-bold text-[var(--text-secondary)]">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <button
            aria-pressed={value === rating}
            className={`min-h-10 rounded-lg text-[10px] font-black ${
              value === rating
                ? 'bg-[var(--emerald)] text-[#07110d]'
                : 'bg-[var(--surface-soft)] text-[var(--text-muted)]'
            }`}
            key={rating}
            onClick={() => onChange(rating)}
            type="button"
          >
            {new Intl.NumberFormat('fa-IR').format(rating)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function DailyCheckIn({
  date,
  existing,
  onClose,
}: {
  date: ISODate
  existing?: DailyLog
  onClose: () => void
}) {
  const { saveDailyCheckIn } = useAppState()
  const [form, setForm] = useState({
    weightKg: existing?.weightKg?.toString() ?? '',
    waistCm: existing?.waistCm?.toString() ?? '',
    sleepHours: existing?.sleepHours?.toString() ?? '',
    waterMl: existing?.waterMl?.toString() ?? '',
    steps: existing?.steps?.toString() ?? '',
    treadmillMinutes: existing?.treadmillMinutes?.toString() ?? '',
    workoutType: (existing?.workout?.type ?? 'none') as WorkoutType,
    workoutDuration: existing?.workout?.durationMinutes?.toString() ?? '',
    activeCalories: existing?.workout?.activeCalories?.toString() ?? '',
    adherencePercent: existing?.adherencePercent?.toString() ?? '',
    notes: existing?.notes ?? '',
  })
  const [hungerScore, setHungerScore] = useState(existing?.hungerScore)
  const [moodScore, setMoodScore] = useState(existing?.moodScore)
  const [energyScore, setEnergyScore] = useState(existing?.energyScore)
  const [saved, setSaved] = useState(false)

  const inputClass =
    'min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const update: DailyCheckInUpdate = {
      weightKg: optionalLocalizedNumber(form.weightKg),
      waistCm: optionalLocalizedNumber(form.waistCm),
      sleepHours: optionalLocalizedNumber(form.sleepHours),
      hungerScore,
      moodScore,
      energyScore,
      waterMl: optionalLocalizedNumber(form.waterMl),
      steps: optionalLocalizedNumber(form.steps),
      treadmillMinutes: optionalLocalizedNumber(form.treadmillMinutes),
      workout: {
        type: form.workoutType as WorkoutType,
        durationMinutes: optionalLocalizedNumber(form.workoutDuration),
        activeCalories: optionalLocalizedNumber(form.activeCalories),
      },
      adherencePercent: optionalLocalizedNumber(form.adherencePercent),
      notes: form.notes.trim() || undefined,
    }

    if (saveDailyCheckIn(date, update)) {
      setSaved(true)
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 backdrop-blur-sm desktop:items-center desktop:p-5"
      role="dialog"
    >
      <form
        className="safe-bottom max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-2xl desktop:rounded-[30px] desktop:p-7"
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
              <ClipboardCheck aria-hidden="true" size={21} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--emerald)]">ثبت روزانه</p>
              <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                چک‌این امروز
              </h2>
              <p className="mt-1 text-[9px] text-[var(--text-muted)]">
                همه فیلدها اختیاری‌اند؛ ذخیره اول ۸ XP دارد.
              </p>
            </div>
          </div>
          <button
            aria-label="بستن چک‌این"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        {saved ? (
          <div className="my-12 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--emerald-soft)] text-[var(--emerald)]">
              <Check aria-hidden="true" size={28} />
            </div>
            <p className="mt-4 text-lg font-black text-[var(--text-primary)]">چک‌این ذخیره شد</p>
            <button
              className="mt-5 min-h-11 rounded-xl bg-[var(--emerald)] px-5 text-xs font-black text-[#07110d]"
              onClick={onClose}
              type="button"
            >
              بستن
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 desktop:grid-cols-3">
              {[
                ['وزن (کیلوگرم)', 'weightKg', 'decimal'],
                ['دور کمر (سانتی‌متر)', 'waistCm', 'decimal'],
                ['خواب (ساعت)', 'sleepHours', 'decimal'],
                ['آب (میلی‌لیتر)', 'waterMl', 'numeric'],
                ['تعداد قدم', 'steps', 'numeric'],
                ['تردمیل (دقیقه)', 'treadmillMinutes', 'numeric'],
              ].map(([label, key, inputMode]) => (
                <label key={key}>
                  <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                    {label}
                  </span>
                  <input
                    className={inputClass}
                    inputMode={inputMode as 'decimal' | 'numeric'}
                    min="0"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [key]: sanitizeLocalizedNumberInput(
                          event.target.value,
                          inputMode === 'decimal',
                        ),
                      })
                    }
                    step="any"
                    type="text"
                    value={form[key as keyof typeof form]}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 grid gap-5 desktop:grid-cols-3">
              <RatingField label="گرسنگی" onChange={setHungerScore} value={hungerScore} />
              <RatingField label="حال روحی" onChange={setMoodScore} value={moodScore} />
              <RatingField label="انرژی" onChange={setEnergyScore} value={energyScore} />
            </div>

            <div className="mt-6 grid gap-4 desktop:grid-cols-3">
              <label>
                <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                  نوع تمرین
                </span>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setForm({ ...form, workoutType: event.target.value as WorkoutType })
                  }
                  value={form.workoutType}
                >
                  <option value="none">بدون تمرین</option>
                  <option value="crossfit">کراس‌فیت</option>
                  <option value="full_body">فول‌بادی</option>
                  <option value="cardio">هوازی</option>
                  <option value="walk">پیاده‌روی</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                  مدت تمرین (دقیقه)
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      workoutDuration: sanitizeLocalizedNumberInput(
                        event.target.value,
                        false,
                      ),
                    })
                  }
                  type="text"
                  value={form.workoutDuration}
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                  کالری فعال ساعت
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      activeCalories: sanitizeLocalizedNumberInput(
                        event.target.value,
                        false,
                      ),
                    })
                  }
                  type="text"
                  value={form.activeCalories}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 desktop:grid-cols-[180px_1fr]">
              <label>
                <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                  پایبندی به برنامه (درصد)
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  max="100"
                  min="0"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      adherencePercent: sanitizeLocalizedNumberInput(
                        event.target.value,
                        false,
                      ),
                    })
                  }
                  type="text"
                  value={form.adherencePercent}
                />
              </label>
              <label>
                <span className="mb-2 block text-[10px] font-bold text-[var(--text-secondary)]">
                  یادداشت
                </span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--emerald)]"
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  value={form.notes}
                />
              </label>
            </div>

            <button
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--emerald)] text-sm font-black text-[#07110d]"
              type="submit"
            >
              <Save aria-hidden="true" size={17} />
              ذخیره چک‌این
            </button>
          </>
        )}
      </form>
    </div>
  )
}
