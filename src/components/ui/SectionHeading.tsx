import type { ReactNode } from 'react'
import { cx } from '../../lib/class-names'

export function SectionHeading({
  action,
  className,
  description,
  eyebrow,
  icon,
  level = 2,
  title,
}: {
  action?: ReactNode
  className?: string
  description?: ReactNode
  eyebrow?: ReactNode
  icon?: ReactNode
  level?: 1 | 2 | 3
  title: ReactNode
}) {
  const Heading = `h${level}` as 'h1' | 'h2' | 'h3'

  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-bold text-[var(--color-accent)]">
              {eyebrow}
            </p>
          )}
          <Heading className="mt-1 text-xl font-black text-[var(--color-text)]">
            {title}
          </Heading>
          {description && (
            <p className="mt-2 text-[11px] leading-6 text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
