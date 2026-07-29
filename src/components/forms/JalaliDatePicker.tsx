import { CalendarDays } from 'lucide-react'
import { SelectInput } from '../ui/FormField'
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

  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]">
        <CalendarDays aria-hidden="true" size={16} />
        {label}
      </legend>
      <div className="grid grid-cols-[0.8fr_1.35fr_1fr] gap-2" dir="rtl">
        <label>
          <span className="sr-only">روز</span>
          <SelectInput
            aria-label="روز"
            className="appearance-none px-3 text-center font-bold"
            onChange={(event) => updateDate({ jd: Number(event.target.value) })}
            value={selected.jd}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {toPersianDigits(day)}
              </option>
            ))}
          </SelectInput>
        </label>
        <label>
          <span className="sr-only">ماه</span>
          <SelectInput
            aria-label="ماه"
            className="appearance-none px-3 text-center font-bold"
            onChange={(event) => updateDate({ jm: Number(event.target.value) })}
            value={selected.jm}
          >
            {PERSIAN_MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </SelectInput>
        </label>
        <label>
          <span className="sr-only">سال</span>
          <SelectInput
            aria-label="سال"
            className="appearance-none px-3 text-center font-bold"
            onChange={(event) => updateDate({ jy: Number(event.target.value) })}
            value={selected.jy}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {toPersianDigits(year)}
              </option>
            ))}
          </SelectInput>
        </label>
      </div>
    </fieldset>
  )
}
