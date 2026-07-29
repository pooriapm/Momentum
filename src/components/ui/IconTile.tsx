import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/class-names'

type IconTileTone = 'neutral' | 'accent' | 'accent-solid' | 'highlight'

const toneClasses: Record<IconTileTone, string> = {
  neutral:
    'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]',
  accent:
    'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  'accent-solid':
    'bg-[var(--color-accent)] text-[var(--color-on-accent)]',
  highlight:
    'bg-[var(--color-highlight-soft)] text-[var(--color-highlight)]',
}

export function IconTile({
  className,
  tone = 'accent',
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: IconTileTone }) {
  return (
    <div
      className={cx(
        'animated-icon grid size-11 shrink-0 place-items-center rounded-[15px]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
