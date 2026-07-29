import {
  forwardRef,
  type ButtonHTMLAttributes,
} from 'react'
import { cx } from '../../lib/class-names'

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = 'button', ...props }, ref) => (
  <button
    className={cx(
      'grid size-11 shrink-0 place-items-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-45',
      className,
    )}
    ref={ref}
    type={type}
    {...props}
  />
))

IconButton.displayName = 'IconButton'
