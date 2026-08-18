import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { toPersianDigits } from '../../lib/dates/jalali'
import { RequiredMark } from './FormControls'
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
  required?: boolean
  value: string
}

type PickerPanel = 'days' | 'months' | 'years'

export function LocalizedDatePicker({ error, label, locale, onChange, purpose = 'report', required, value }: LocalizedDatePickerProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedYearRef = useRef<HTMLButtonElement>(null)
  const today = todayIso()
  const minIso = purpose === 'birth' ? shiftIsoYears(today, -100) : shiftIsoYears(today, -10)
  const maxIso = purpose === 'birth' ? shiftIsoYears(today, -18) : today
  const fallbackIso = purpose === 'birth' ? shiftIsoYears(today, -30) : today
  const initialIso = clampIsoDate(value || fallbackIso, minIso, maxIso)
  const initial = calendarParts(initialIso, locale)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<PickerPanel>('days')
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)
  const fa = locale === 'fa'
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

  useEffect(() => {
    if (!open) setPanel('days')
  }, [open])

  useLayoutEffect(() => {
    if (panel !== 'years') return
    selectedYearRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [panel, viewYear])

  function showPicker() {
    const next = calendarParts(clampIsoDate(value || initialIso, minIso, maxIso), locale)
    setViewYear(next.year)
    setViewMonth(next.month)
    setPanel('days')
    setOpen((current) => !current)
  }

  function moveMonth(amount: number) {
    const index = viewYear * 12 + viewMonth - 1 + amount
    const nextYear = Math.floor(index / 12)
    const nextMonth = (index % 12 + 12) % 12 + 1
    if (nextYear < minYear || nextYear > maxYear) return
    setViewYear(nextYear)
    setViewMonth(nextMonth)
    setPanel('days')
  }

  function selectDate(isoDate: string) {
    if (isoDate < minIso || isoDate > maxIso) return
    onChange(isoDate)
    setOpen(false)
  }

  return (
    <div className={`orbit-field localized-date-field ${error ? 'orbit-field--error' : ''}`} ref={rootRef}>
      <div className="orbit-field__label" id={`${id}-label`}>
        <span>{label}</span>
        {required ? <RequiredMark /> : null}
      </div>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-required={required || undefined}
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
        <div aria-label={fa ? 'انتخاب‌گر تاریخ' : 'Date picker'} className="glass-menu localized-date-popover" role="dialog">
          <div className="localized-date-popover__topbar">
            <button aria-label={fa ? 'ماه قبل' : 'Previous month'} onClick={() => moveMonth(-1)} type="button"><ChevronLeft className="directional-icon" size={19} /></button>
            <div>
              <button
                aria-expanded={panel === 'months'}
                aria-haspopup="listbox"
                aria-label={fa ? 'ماه' : 'Month'}
                className={`localized-date-chip${panel === 'months' ? ' is-open' : ''}`}
                onClick={() => setPanel((current) => current === 'months' ? 'days' : 'months')}
                role="combobox"
                type="button"
              >
                {months[viewMonth - 1]}
              </button>
              <button
                aria-expanded={panel === 'years'}
                aria-haspopup="listbox"
                aria-label={fa ? 'سال' : 'Year'}
                className={`localized-date-chip${panel === 'years' ? ' is-open' : ''}`}
                onClick={() => setPanel((current) => current === 'years' ? 'days' : 'years')}
                role="combobox"
                type="button"
              >
                {fa ? toPersianDigits(viewYear) : viewYear}
              </button>
            </div>
            <button aria-label={fa ? 'ماه بعد' : 'Next month'} onClick={() => moveMonth(1)} type="button"><ChevronRight className="directional-icon" size={19} /></button>
          </div>
          {panel === 'months' ? (
            <div className="localized-date-choices localized-date-choices--months" role="listbox">
              {months.map((month, index) => (
                <button
                  aria-selected={viewMonth === index + 1}
                  className={viewMonth === index + 1 ? 'is-selected' : ''}
                  key={month}
                  onClick={() => { setViewMonth(index + 1); setPanel('days') }}
                  role="option"
                  type="button"
                >
                  {month}
                </button>
              ))}
            </div>
          ) : null}
          {panel === 'years' ? (
            <div className="localized-date-choices localized-date-choices--years" role="listbox">
              {years.map((year) => (
                <button
                  aria-selected={year === viewYear}
                  className={year === viewYear ? 'is-selected' : ''}
                  key={year}
                  onClick={() => { setViewYear(year); setPanel('days') }}
                  ref={year === viewYear ? selectedYearRef : undefined}
                  role="option"
                  type="button"
                >
                  {fa ? toPersianDigits(year) : year}
                </button>
              ))}
            </div>
          ) : null}
          {panel === 'days' ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <span className="orbit-field__error" role="alert">{error}</span> : null}
    </div>
  )
}

function clampIsoDate(value: string, min: string, max: string) {
  if (value < min) return min
  if (value > max) return max
  return value
}
