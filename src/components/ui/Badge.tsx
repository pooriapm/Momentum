import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/class-names'

type BadgeTone = 'neutral' | 'accent' | 'highlight' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]',
  accent:
    'border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))] bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  highlight:
    'border-[color-mix(in_srgb,var(--color-highlight)_35%,var(--color-border))] bg-[var(--color-highlight-soft)] text-[var(--color-highlight)]',
  danger:
    'border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] text-[var(--color-danger)]',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
