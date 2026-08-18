import { Check, ChevronDown, Minus, Plus } from 'lucide-react'
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { formatNumber } from '../lib/format'

export function RequiredMark() {
  return <span aria-hidden="true" className="orbit-field__required">*</span>
}

interface FieldShellProps {
  controlId: string
  descriptionId?: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

function FieldShell({ controlId, descriptionId, label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className={`orbit-field ${error ? 'orbit-field--error' : ''}`}>
      <div className="orbit-field__label">
        <label htmlFor={controlId}>{label}</label>
        {required ? <RequiredMark /> : null}
      </div>
      {children}
      {error ? <span className="orbit-field__error" id={descriptionId} role="alert">{error}</span> : hint ? <span className="orbit-field__hint" id={descriptionId}>{hint}</span> : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, required, ...props }: InputProps) {
  const generatedId = useId()
  const controlId = props.id ?? `input-${generatedId}`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label} required={required}>
      <input {...props} aria-describedby={descriptionId} aria-invalid={Boolean(error)} aria-required={required || undefined} className="orbit-input" id={controlId} required={required} />
    </FieldShell>
  )
}

function clampStepperValue(raw: string, min: number, max: number, fallback: number) {
  const n = Number(raw)
  if (!raw.trim() || !Number.isFinite(n)) return Math.min(max, Math.max(min, fallback))
  return Math.min(max, Math.max(min, Math.round(n)))
}

interface NumberStepperProps {
  decreaseLabel: string
  error?: string
  fallback?: number
  increaseLabel: string
  label: string
  locale: AppLocale
  max: number
  min: number
  onChange: (value: string) => void
  required?: boolean
  step?: number
  value: string
}

export function NumberStepper({
  decreaseLabel,
  error,
  fallback,
  increaseLabel,
  label,
  locale,
  max,
  min,
  onChange,
  required,
  step = 1,
  value,
}: NumberStepperProps) {
  const generatedId = useId()
  const controlId = `stepper-${generatedId}`
  const descriptionId = error ? `${controlId}-description` : undefined
  const count = clampStepperValue(value, min, max, fallback ?? min)
  const atMin = count <= min
  const atMax = count >= max

  useEffect(() => {
    if (value !== String(count)) onChange(String(count))
  }, [count, onChange, value])

  function setCount(next: number) {
    const clamped = Math.min(max, Math.max(min, next))
    if (clamped === count && String(count) === value) return
    onChange(String(clamped))
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      setCount(count + step)
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setCount(count - step)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setCount(min)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setCount(max)
    }
  }

  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} label={label} required={required}>
      <div className="orbit-stepper">
        <button
          aria-label={decreaseLabel}
          className="orbit-stepper__button glass-chrome glass-interactive"
          disabled={atMin}
          onClick={() => setCount(count - step)}
          type="button"
        >
          <Minus size={18} />
        </button>
        <div
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error) || undefined}
          aria-label={label}
          aria-required={required || undefined}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={count}
          aria-valuetext={formatNumber(count, locale)}
          className="orbit-stepper__value"
          id={controlId}
          onKeyDown={onKeyDown}
          role="spinbutton"
          tabIndex={0}
        >
          {formatNumber(count, locale)}
        </div>
        <button
          aria-label={increaseLabel}
          className="orbit-stepper__button glass-chrome glass-interactive"
          disabled={atMax}
          onClick={() => setCount(count + step)}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>
    </FieldShell>
  )
}

interface SelectOption {
  disabled?: boolean
  label: string
  value: string
}

function isBlankPlaceholder(option: SelectOption) {
  return option.value === '' && /^[\s\-–—−]*$/.test(option.label)
}

function readSelectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; disabled?: boolean; label?: string; value?: string }>(child)) return []
    if (child.type === 'optgroup') return readSelectOptions(child.props.children)
    if (child.type !== 'option') return []
    const value = child.props.value == null ? '' : String(child.props.value)
    const label = typeof child.props.children === 'string' || typeof child.props.children === 'number'
      ? String(child.props.children)
      : child.props.label ?? value
    const option = { disabled: Boolean(child.props.disabled), label, value }
    return isBlankPlaceholder(option) ? [] : [option]
  })
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  defaultOpen?: boolean
  error?: string
  hint?: string
  label: string
}

export function Select({
  children,
  defaultOpen = false,
  disabled,
  error,
  hint,
  id,
  label,
  onChange,
  required,
  value,
  ...props
}: SelectProps) {
  const generatedId = useId()
  const controlId = id ?? `select-${generatedId}`
  const listboxId = `${controlId}-listbox`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const options = useMemo(() => readSelectOptions(children), [children])
  const selectedValue = value == null ? '' : String(value)
  const selected = options.find((option) => option.value === selectedValue)
  const nativeValue = selected ? selectedValue : ''

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function choose(nextValue: string) {
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label} required={required}>
      <div className="orbit-select-shell" ref={rootRef}>
        <select
          aria-hidden="true"
          className="orbit-select-native"
          disabled={disabled}
          onChange={onChange}
          required={required}
          tabIndex={-1}
          value={nativeValue}
          {...props}
        >
          {nativeValue === '' ? <option value="" /> : null}
          {options.map((option) => (
            <option disabled={option.disabled} key={option.value || option.label} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          aria-controls={listboxId}
          aria-describedby={descriptionId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          className={`orbit-select-trigger ${open ? 'is-open' : ''}`}
          disabled={disabled}
          id={controlId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setOpen(true)
            }
            if (event.key === 'Escape') setOpen(false)
          }}
          type="button"
        >
          <span>{selected?.label ?? ''}</span>
          <ChevronDown aria-hidden="true" size={17} />
        </button>
        {open ? (
          <div className="glass-menu">
            <div className="glass-menu__scroller" id={listboxId} role="listbox">
              {options.map((option) => {
                const isSelected = option.value === selectedValue
                return (
                  <button
                    aria-selected={isSelected}
                    className={`glass-menu__item ${isSelected ? 'is-selected' : ''}`}
                    disabled={option.disabled}
                    key={option.value || option.label}
                    onClick={() => choose(option.value)}
                    role="option"
                    type="button"
                  >
                    <span>{option.label}</span>
                    {isSelected ? <Check size={16} /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FieldShell>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, required, ...props }: TextareaProps) {
  const generatedId = useId()
  const controlId = props.id ?? `textarea-${generatedId}`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label} required={required}>
      <textarea {...props} aria-describedby={descriptionId} aria-invalid={Boolean(error)} aria-required={required || undefined} className="orbit-input orbit-textarea" id={controlId} required={required} />
    </FieldShell>
  )
}
