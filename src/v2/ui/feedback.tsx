import { useRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidGlass } from './liquid-glass'
import { ContentCard } from './primitives'

export type NoticeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

interface NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** neutral and info are status, success confirms, warning needs attention, error blocks. */
  tone?: NoticeTone
  /** Leading 18px icon; the tone's color comes from the notice. */
  icon?: ReactNode
  /** Optional short bold line before the message. */
  title?: ReactNode
  /** One recovery action, e.g. «تلاش دوباره». */
  action?: ReactNode
  /** false for a static explanation present from the start: it becomes a note, not a live region. */
  live?: boolean
}

// A message in the flow of the page that states a real condition. Errors interrupt (role=alert);
// everything else is announced politely (role=status); a static explanation is a note. Success feedback appears next to the action
// that caused it; the app has no global toast queue, only the connectivity toast.
export function Notice({ tone = 'neutral', icon, title, action, live = true, className = '', children, ...props }: NoticeProps) {
  const toneClass = tone === 'neutral' ? '' : ` inline-notice--${tone}`
  const ref = useRef<HTMLDivElement>(null)
  useLiquidGlass(ref, { refraction: 12, bezel: 16 })
  return (
    <div className={`inline-notice${toneClass} ${className}`.trim()} ref={ref} role={!live ? 'note' : tone === 'error' ? 'alert' : 'status'} {...props}>
      {icon}
      {title || action ? (
        <div className="inline-notice__body">
          {title ? <strong>{title}</strong> : null}
          {children ? <span>{children}</span> : null}
          {action ? <div className="inline-notice__action">{action}</div> : null}
        </div>
      ) : children}
    </div>
  )
}

interface EmptyStateProps {
  /** A Lucide icon or the OrbitMark, at icon-slot-lg. */
  icon: ReactNode
  /** What is empty, as a fact: «هنوز برنامه‌ای فعال نیست». */
  title: ReactNode
  /** Why, and what happens next. One or two sentences. */
  children?: ReactNode
  /** The one action that fills the state. */
  action?: ReactNode
  className?: string
  'data-inventory'?: string
}

// Empty is a valid state, not an error: say what is missing and the one step that fills it.
export function EmptyState({ icon, title, children, action, className = '', ...props }: EmptyStateProps) {
  return (
    <ContentCard className={`empty-state ${className}`.trim()} {...props}>
      <span aria-hidden="true" className="empty-state__icon">{icon}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </ContentCard>
  )
}

interface SkeletonProps {
  /** line: one text line; title: a heading; card: a content-card placeholder. */
  variant?: 'line' | 'title' | 'card'
  /** Shorter line for eyebrows and metadata. */
  short?: boolean
  className?: string
}

// Loading placeholders keep the final layout's shape. They never stand in for unknown data once
// loading has finished: that is "Not known yet", in words.
export function Skeleton({ variant = 'line', short = false, className = '' }: SkeletonProps) {
  const base = variant === 'card' ? 'skeleton-card' : `skeleton-line${variant === 'title' ? ' skeleton-line--title' : ''}${short ? ' skeleton-line--short' : ''}`
  return <div aria-hidden="true" className={`${base} ${className}`.trim()} />
}
