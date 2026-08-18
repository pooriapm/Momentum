import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from '../../lib/class-names'

export function Field({
  children,
  className,
  error,
  hint,
  label,
  labelClassName,
}: {
  children: ReactNode
  className?: string
  error?: string
  hint?: string
  label: ReactNode
  labelClassName?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span
        className={cx(
          'mb-2 block text-xs font-bold text-[var(--color-text-secondary)]',
          labelClassName,
        )}
      >
        {label}
      </span>
      {children}
      {(error || hint) && (
        <span
          className={cx(
            'mt-1.5 block text-[10px] leading-5',
            error
              ? 'font-bold text-[var(--color-danger)]'
              : 'text-[var(--color-text-muted)]',
          )}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  )
}

function fieldControlClassName({
  error,
  multiline,
  className,
}: {
  error?: boolean
  multiline?: boolean
  className?: string
} = {}) {
  return cx(
    'w-full rounded-2xl border bg-[var(--color-surface-muted)] px-4 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]',
    multiline
      ? 'min-h-[calc(var(--size-field)*2)] resize-y py-3 leading-7'
      : 'h-[length:var(--size-field)] max-h-[length:var(--size-field)] min-h-[length:var(--size-field)] py-0 leading-[1.25]',
    error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
    className,
  )
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <input
    className={fieldControlClassName({ error: hasError, className })}
    ref={ref}
    {...props}
  />
))

TextInput.displayName = 'TextInput'

export const SelectInput = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <select
    className={fieldControlClassName({ error: hasError, className })}
    ref={ref}
    {...props}
  />
))

SelectInput.displayName = 'SelectInput'

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <textarea
    className={fieldControlClassName({
      error: hasError,
      multiline: true,
      className,
    })}
    ref={ref}
    {...props}
  />
))

TextArea.displayName = 'TextArea'
