import { CalendarDays } from 'lucide-react'
import {
  fromJalali,
  getJalaliMonthLength,
  getTodayIso,
  PERSIAN_MONTHS,
  toJalali,
  toPersianDigits,
} from '../../lib/dates/jalali'
import type { ISODate } from '../../types/domain'

interface JalaliDatePickerProps {
  value: ISODate
  onChange: (value: ISODate) => void
  label: string
  minYear?: number
  maxYear?: number
}

export function JalaliDatePicker({
  value,
  onChange,
  label,
  minYear,
  maxYear,
}: JalaliDatePickerProps) {
  const selected = toJalali(value)
  const currentYear = toJalali(getTodayIso()).jy
  const startYear = minYear ?? currentYear - 2
  const endYear = maxYear ?? currentYear + 6
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
  const days = Array.from(
    { length: getJalaliMonthLength(selected.jy, selected.jm) },
    (_, index) => index + 1,
  )

  const updateDate = (next: Partial<typeof selected>) => {
    const year = next.jy ?? selected.jy
    const month = next.jm ?? selected.jm
    const maxDay = getJalaliMonthLength(year, month)
    const day = Math.min(next.jd ?? selected.jd, maxDay)
    onChange(fromJalali(year, month, day))
  }

  const selectClass =
    'min-h-12 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-center text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--emerald)]'

  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
        <CalendarDays aria-hidden="true" size={16} />
        {label}
      </legend>
      <div className="grid grid-cols-[0.8fr_1.35fr_1fr] gap-2" dir="rtl">
        <label>
          <span className="sr-only">روز</span>
          <select
            aria-label="روز"
            className={selectClass}
            onChange={(event) => updateDate({ jd: Number(event.target.value) })}
            value={selected.jd}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {toPersianDigits(day)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">ماه</span>
          <select
            aria-label="ماه"
            className={selectClass}
            onChange={(event) => updateDate({ jm: Number(event.target.value) })}
            value={selected.jm}
          >
            {PERSIAN_MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">سال</span>
          <select
            aria-label="سال"
            className={selectClass}
            onChange={(event) => updateDate({ jy: Number(event.target.value) })}
            value={selected.jy}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {toPersianDigits(year)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  )
}
