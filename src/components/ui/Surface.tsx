import {
  createElement,
  type HTMLAttributes,
} from 'react'
import { cx } from '../../lib/class-names'

type SurfaceElement = 'article' | 'aside' | 'div' | 'section'
type SurfaceVariant =
  | 'glass'
  | 'raised'
  | 'muted'
  | 'accent'
  | 'highlight'
  | 'danger'
  | 'dashed'

const variantClasses: Record<SurfaceVariant, string> = {
  glass: 'glass-panel',
  raised:
    'border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-card)]',
  muted:
    'border border-[var(--color-border)] bg-[var(--color-surface-muted)]',
  accent:
    'border border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))] bg-[var(--color-accent-soft)]',
  highlight:
    'border border-[color-mix(in_srgb,var(--color-highlight)_35%,var(--color-border))] bg-[var(--color-highlight-soft)]',
  danger:
    'border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_7%,var(--color-surface))]',
  dashed:
    'border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)]',
}

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: SurfaceElement
  variant?: SurfaceVariant
}

export function Surface({
  as = 'div',
  className,
  variant = 'glass',
  ...props
}: SurfaceProps) {
  return createElement(as, {
    ...props,
    className: cx('rounded-[var(--radius-panel)]', variantClasses[variant], className),
  })
}
