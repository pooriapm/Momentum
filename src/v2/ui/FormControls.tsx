import { ChevronDown } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldShellProps {
  controlId: string
  descriptionId?: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

function FieldShell({ controlId, descriptionId, label, hint, error, children }: FieldShellProps) {
  return (
    <div className={`orbit-field ${error ? 'orbit-field--error' : ''}`}>
      <label className="orbit-field__label" htmlFor={controlId}>{label}</label>
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

export function Input({ label, hint, error, ...props }: InputProps) {
  const generatedId = useId()
  const controlId = props.id ?? `input-${generatedId}`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label}>
      <input aria-describedby={descriptionId} aria-invalid={Boolean(error)} className="orbit-input" {...props} id={controlId} />
    </FieldShell>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
}

export function Select({ label, hint, error, children, ...props }: SelectProps) {
  const generatedId = useId()
  const controlId = props.id ?? `select-${generatedId}`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label}>
      <div className="orbit-select-shell">
        <select aria-describedby={descriptionId} aria-invalid={Boolean(error)} className="orbit-input orbit-select" {...props} id={controlId}>{children}</select>
        <ChevronDown aria-hidden="true" size={17} />
      </div>
    </FieldShell>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, ...props }: TextareaProps) {
  const generatedId = useId()
  const controlId = props.id ?? `textarea-${generatedId}`
  const descriptionId = error || hint ? `${controlId}-description` : undefined
  return (
    <FieldShell controlId={controlId} descriptionId={descriptionId} error={error} hint={hint} label={label}>
      <textarea aria-describedby={descriptionId} aria-invalid={Boolean(error)} className="orbit-input orbit-textarea" {...props} id={controlId} />
    </FieldShell>
  )
}
