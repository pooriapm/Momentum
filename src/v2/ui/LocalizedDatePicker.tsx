import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { toPersianDigits } from '../../lib/dates/jalali'
import {
  calendarParts,
  formatLocalizedDate,
  GREGORIAN_WEEKDAYS,
  monthGrid,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  shiftIsoYears,
  todayIso,
} from './localized-date'

interface LocalizedDatePickerProps {
  error?: string
  label: string
  locale: AppLocale
  onChange: (value: string) => void
  purpose?: 'birth' | 'report'
  value: string
}

export function LocalizedDatePicker({ error, label, locale, onChange, purpose = 'report', value }: LocalizedDatePickerProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const today = todayIso()
  const initialIso = value || (purpose === 'birth' ? shiftIsoYears(today, -30) : today)
  const initial = calendarParts(initialIso, locale)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)
  const fa = locale === 'fa'
  const minIso = purpose === 'birth' ? shiftIsoYears(today, -100) : shiftIsoYears(today, -10)
  const maxIso = purpose === 'birth' ? shiftIsoYears(today, -18) : today
  const minYear = calendarParts(minIso, locale).year
  const maxYear = calendarParts(maxIso, locale).year
  const cells = useMemo(() => monthGrid(viewYear, viewMonth, locale), [locale, viewMonth, viewYear])
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index),
    [maxYear, minYear],
  )
  const months = fa
    ? PERSIAN_MONTHS
    : Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, index, 1)))
  const weekdays = fa ? PERSIAN_WEEKDAYS : GREGORIAN_WEEKDAYS

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function showPicker() {
    const next = calendarParts(value || initialIso, locale)
    setViewYear(next.year)
    setViewMonth(next.month)
    setOpen((current) => !current)
  }

  function moveMonth(amount: number) {
    const index = viewYear * 12 + viewMonth - 1 + amount
    const nextYear = Math.floor(index / 12)
    const nextMonth = (index % 12 + 12) % 12 + 1
    if (nextYear < minYear || nextYear > maxYear) return
    setViewYear(nextYear)
    setViewMonth(nextMonth)
  }

  function selectDate(isoDate: string) {
    if (isoDate < minIso || isoDate > maxIso) return
    onChange(isoDate)
    setOpen(false)
  }

  return (
    <div className={`orbit-field localized-date-field ${error ? 'orbit-field--error' : ''}`} ref={rootRef}>
      <label className="orbit-field__label" id={`${id}-label`}>{label}</label>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        className={`localized-date-trigger ${value ? 'has-value' : ''}`}
        id={`${id}-value`}
        onClick={showPicker}
        type="button"
      >
        <span><CalendarDays size={19} /></span>
        <strong>{value ? formatLocalizedDate(value, locale) : (fa ? 'انتخاب تاریخ' : 'Choose a date')}</strong>
        <small>{fa ? 'تقویم هجری شمسی' : 'Gregorian calendar'}</small>
      </button>
      {open ? (
        <div aria-label={fa ? 'انتخاب‌گر تاریخ' : 'Date picker'} className="localized-date-popover" role="dialog">
          <div className="localized-date-popover__topbar">
            <button aria-label={fa ? 'ماه قبل' : 'Previous month'} onClick={() => moveMonth(-1)} type="button"><ChevronLeft className="directional-icon" size={19} /></button>
            <div>
              <select aria-label={fa ? 'ماه' : 'Month'} onChange={(event) => setViewMonth(Number(event.target.value))} value={viewMonth}>
                {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
              <select aria-label={fa ? 'سال' : 'Year'} onChange={(event) => setViewYear(Number(event.target.value))} value={viewYear}>
                {years.map((year) => <option key={year} value={year}>{fa ? toPersianDigits(year) : year}</option>)}
              </select>
            </div>
            <button aria-label={fa ? 'ماه بعد' : 'Next month'} onClick={() => moveMonth(1)} type="button"><ChevronRight className="directional-icon" size={19} /></button>
          </div>
          <div className="localized-date-weekdays">
            {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="localized-date-grid">
            {cells.map((cell) => {
              const disabled = cell.isoDate < minIso || cell.isoDate > maxIso
              const selected = cell.isoDate === value
              return (
                <button
                  aria-label={formatLocalizedDate(cell.isoDate, locale)}
                  aria-pressed={selected}
                  className={`${cell.isCurrentMonth ? '' : 'is-outside'} ${selected ? 'is-selected' : ''}`}
                  disabled={disabled}
                  key={cell.isoDate}
                  onClick={() => selectDate(cell.isoDate)}
                  type="button"
                >
                  {fa ? toPersianDigits(cell.day) : cell.day}{selected ? <Check size={12} /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      {error ? <span className="orbit-field__error" role="alert">{error}</span> : null}
    </div>
  )
}
