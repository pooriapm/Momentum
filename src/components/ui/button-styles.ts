import { cx } from '../../lib/class-names'

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'highlight'
  | 'highlight-soft'
  | 'danger'
  | 'danger-outline'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[var(--shadow-accent)] hover:bg-[var(--color-accent-strong)]',
  accent:
    'border border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)]',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]',
  outline:
    'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]',
  ghost:
    'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)]',
  highlight:
    'bg-[var(--color-highlight)] text-[var(--color-on-highlight)] hover:brightness-95',
  'highlight-soft':
    'border border-[color-mix(in_srgb,var(--color-highlight)_35%,var(--color-border))] bg-[var(--color-highlight-soft)] text-[var(--color-highlight)] hover:bg-[color-mix(in_srgb,var(--color-highlight)_16%,transparent)]',
  danger:
    'bg-[var(--color-danger)] text-white hover:brightness-95',
  'danger-outline':
    'border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 rounded-xl px-3 text-[11px]',
  md: 'min-h-11 rounded-xl px-4 text-xs',
  lg: 'min-h-12 rounded-2xl px-5 text-sm',
  icon: 'size-11 shrink-0 rounded-xl',
}

export function buttonClassNames({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  className?: string
} = {}) {
  return cx(
    'inline-flex items-center justify-center gap-2 font-black transition disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
    variantClasses[variant],
    sizeClasses[size],
    block && 'w-full',
    className,
  )
}
