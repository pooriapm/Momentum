import type { ReactNode } from 'react'
import { cx } from '../../lib/class-names'
import { ViewportPortal } from '../overlay/ViewportPortal'

type DialogPlacement = 'center' | 'sheet'
type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-lg',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export function Dialog({
  children,
  className,
  contentClassName,
  placement = 'center',
  size = 'md',
  labelledBy,
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
  placement?: DialogPlacement
  size?: DialogSize
  labelledBy?: string
}) {
  return (
    <ViewportPortal>
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cx(
          'fixed inset-0 z-[80] flex h-[100dvh] justify-center overflow-hidden bg-[var(--color-overlay)] backdrop-blur-md',
          placement === 'sheet'
            ? 'items-end desktop:items-center desktop:p-5'
            : 'items-center p-4 desktop:p-8',
          className,
        )}
        role="dialog"
      >
        <div
          className={cx(
            'recipe-screen-enter safe-bottom max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto overscroll-contain border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-dialog)] desktop:max-h-[calc(100dvh-2.5rem)]',
            placement === 'sheet'
              ? 'rounded-t-[var(--radius-dialog)] desktop:rounded-[var(--radius-dialog)]'
              : 'rounded-[var(--radius-dialog)]',
            sizeClasses[size],
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </ViewportPortal>
  )
}
