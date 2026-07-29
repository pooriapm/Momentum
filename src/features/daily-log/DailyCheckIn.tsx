import { useState, type FormEvent } from 'react'
import { Check, ClipboardCheck, Save, X } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '../../components/ui/FormField'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
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
type DailyMetricFieldKey =
  | 'weightKg'
  | 'waistCm'
  | 'sleepHours'
  | 'waterMl'
  | 'steps'
  | 'treadmillMinutes'

const DAILY_METRIC_FIELDS: ReadonlyArray<{
  key: DailyMetricFieldKey
  label: string
  inputMode: 'decimal' | 'numeric'
}> = [
  { key: 'weightKg', label: 'وزن (کیلوگرم)', inputMode: 'decimal' },
  { key: 'waistCm', label: 'دور کمر (سانتی‌متر)', inputMode: 'decimal' },
  { key: 'sleepHours', label: 'خواب (ساعت)', inputMode: 'decimal' },
  { key: 'waterMl', label: 'آب (میلی‌لیتر)', inputMode: 'numeric' },
  { key: 'steps', label: 'تعداد قدم', inputMode: 'numeric' },
  { key: 'treadmillMinutes', label: 'تردمیل (دقیقه)', inputMode: 'numeric' },
]

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
      <legend className="text-[10px] font-bold text-[var(--color-text-secondary)]">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <Button
            aria-pressed={value === rating}
            block
            className="rounded-lg px-0 text-[10px]"
            key={rating}
            onClick={() => onChange(rating)}
            size="sm"
            variant={value === rating ? 'primary' : 'secondary'}
          >
            {new Intl.NumberFormat('fa-IR').format(rating)}
          </Button>
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
    <Dialog contentClassName="p-5 desktop:p-7" placement="sheet" size="xl">
      <form onSubmit={submit}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconTile>
              <ClipboardCheck aria-hidden="true" size={21} />
            </IconTile>
            <div>
              <p className="text-xs font-bold text-[var(--color-accent)]">ثبت روزانه</p>
              <h2 className="mt-1 text-xl font-black text-[var(--color-text)]">
                چک‌این امروز
              </h2>
              <p className="mt-1 text-[9px] text-[var(--color-text-muted)]">
                همه فیلدها اختیاری‌اند؛ ذخیره اول ۸ XP دارد.
              </p>
            </div>
          </div>
          <IconButton
            aria-label="بستن چک‌این"
            onClick={onClose}
          >
            <X aria-hidden="true" size={19} />
          </IconButton>
        </div>

        {saved ? (
          <div className="my-12 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Check aria-hidden="true" size={28} />
            </div>
            <p className="mt-4 text-lg font-black text-[var(--color-text)]">چک‌این ذخیره شد</p>
            <Button className="mt-5" onClick={onClose}>
              بستن
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 desktop:grid-cols-3">
              {DAILY_METRIC_FIELDS.map(({ key, label, inputMode }) => (
                <Field key={key} label={label}>
                  <TextInput
                    className="min-h-11 rounded-xl px-3 font-bold"
                    inputMode={inputMode}
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
                    value={form[key]}
                  />
                </Field>
              ))}
            </div>

            <div className="mt-6 grid gap-5 desktop:grid-cols-3">
              <RatingField label="گرسنگی" onChange={setHungerScore} value={hungerScore} />
              <RatingField label="حال روحی" onChange={setMoodScore} value={moodScore} />
              <RatingField label="انرژی" onChange={setEnergyScore} value={energyScore} />
            </div>

            <div className="mt-6 grid gap-4 desktop:grid-cols-3">
              <Field label="نوع تمرین">
                <SelectInput
                  className="min-h-11 rounded-xl px-3 font-bold"
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
                </SelectInput>
              </Field>
              <Field label="مدت تمرین (دقیقه)">
                <TextInput
                  className="min-h-11 rounded-xl px-3 font-bold"
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
              </Field>
              <Field label="کالری فعال ساعت">
                <TextInput
                  className="min-h-11 rounded-xl px-3 font-bold"
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
              </Field>
            </div>

            <div className="mt-4 grid gap-4 desktop:grid-cols-[180px_1fr]">
              <Field label="پایبندی به برنامه (درصد)">
                <TextInput
                  className="min-h-11 rounded-xl px-3 font-bold"
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
              </Field>
              <Field label="یادداشت">
                <TextArea
                  className="min-h-24 rounded-xl text-xs"
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  value={form.notes}
                />
              </Field>
            </div>

            <Button
              block
              className="mt-6 rounded-xl"
              size="lg"
              type="submit"
            >
              <Save aria-hidden="true" size={17} />
              ذخیره چک‌این
            </Button>
          </>
        )}
      </form>
    </Dialog>
  )
}
