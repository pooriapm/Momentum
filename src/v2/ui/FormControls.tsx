import { Check, ChevronDown } from 'lucide-react'
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
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

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
