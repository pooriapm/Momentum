import { Clock } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { toPersianDigits } from '../../lib/dates/jalali'
import { RequiredMark } from './FormControls'

interface LocalizedTimePickerProps {
  error?: string
  label: string
  locale: AppLocale
  onChange: (value: string) => void
  required?: boolean
  value: string
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)

function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return { hour: 18, minute: 0 }
  const hour = Math.min(23, Math.max(0, Number(match[1])))
  const minute = Math.min(59, Math.max(0, Number(match[2])))
  return { hour, minute: MINUTES.reduce((nearest, step) => Math.abs(step - minute) < Math.abs(nearest - minute) ? step : nearest, 0) }
}

function padTime(value: number) {
  return String(value).padStart(2, '0')
}

function formatTimeValue(hour: number, minute: number) {
  return `${padTime(hour)}:${padTime(minute)}`
}

function displayDigits(value: number, locale: AppLocale) {
  const padded = padTime(value)
  return locale === 'fa' ? toPersianDigits(padded) : padded
}

export function LocalizedTimePicker({ error, label, locale, onChange, required, value }: LocalizedTimePickerProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLButtonElement>(null)
  const minuteRef = useRef<HTMLButtonElement>(null)
  const parsed = useMemo(() => parseTime(value), [value])
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const fa = locale === 'fa'

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

  useLayoutEffect(() => {
    if (!open) return
    for (const node of [hourRef.current, minuteRef.current]) {
      const scroller = node?.parentElement
      if (!node || !scroller) continue
      scroller.scrollTop = node.offsetTop - scroller.clientHeight / 2 + node.offsetHeight / 2
    }
  }, [hour, minute, open])

  function commit(nextHour: number, nextMinute: number) {
    setHour(nextHour)
    setMinute(nextMinute)
    onChange(formatTimeValue(nextHour, nextMinute))
  }

  function togglePicker() {
    if (open) {
      setOpen(false)
      return
    }
    setHour(parsed.hour)
    setMinute(parsed.minute)
    setOpen(true)
  }

  return (
    <div className={`orbit-field localized-time-field ${error ? 'orbit-field--error' : ''}`} ref={rootRef}>
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
        onClick={togglePicker}
        role="combobox"
        type="button"
      >
        <span><Clock size={19} /></span>
        <strong>{value ? `${displayDigits(parsed.hour, locale)}:${displayDigits(parsed.minute, locale)}` : (fa ? 'انتخاب ساعت' : 'Choose a time')}</strong>
        <small>{fa ? '۲۴ ساعته' : '24-hour'}</small>
      </button>
      {open ? (
        <div aria-label={fa ? 'انتخاب‌گر ساعت' : 'Time picker'} className="glass-menu localized-time-popover" role="dialog">
          <div className="localized-time-head">
            <span>{fa ? 'ساعت' : 'Hour'}</span>
            <span />
            <span>{fa ? 'دقیقه' : 'Minute'}</span>
          </div>
          <div className="localized-time-wheels">
            <div className="localized-time-wheel" role="listbox" aria-label={fa ? 'ساعت' : 'Hour'}>
              {HOURS.map((item) => (
                <button
                  aria-selected={item === hour}
                  className={item === hour ? 'is-selected' : ''}
                  key={item}
                  onClick={() => commit(item, minute)}
                  ref={item === hour ? hourRef : undefined}
                  role="option"
                  type="button"
                >
                  {displayDigits(item, locale)}
                </button>
              ))}
            </div>
            <span aria-hidden="true" className="localized-time-separator">:</span>
            <div className="localized-time-wheel" role="listbox" aria-label={fa ? 'دقیقه' : 'Minute'}>
              {MINUTES.map((item) => (
                <button
                  aria-selected={item === minute}
                  className={item === minute ? 'is-selected' : ''}
                  key={item}
                  onClick={() => commit(hour, item)}
                  ref={item === minute ? minuteRef : undefined}
                  role="option"
                  type="button"
                >
                  {displayDigits(item, locale)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
