import { Children, isValidElement, type ButtonHTMLAttributes, type HTMLAttributes, type PropsWithChildren, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Reveal } from './Reveal'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

function splitButtonContent(children: ReactNode, explicitIcon?: ReactNode) {
  if (explicitIcon) return { icon: explicitIcon, label: children }
  const items = Children.toArray(children)
  if (items.length >= 2 && isValidElement(items[0]) && typeof items[0].type !== 'string') {
    return { icon: items[0], label: items.slice(1) }
  }
  return { icon: null, label: children }
}

export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const { icon: resolvedIcon, label } = splitButtonContent(children, icon)

  return (
    <button
      className={`orbit-button orbit-button--${variant} ${block ? 'orbit-button--block' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="orbit-spin" size={18} /> : resolvedIcon}
      <span>{label}</span>
    </button>
  )
}

export function ContentCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Reveal className={`content-card ${className}`} {...props} />
}

export function GlassChrome({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass-chrome ${className}`} {...props} />
}

export function Eyebrow({ children }: PropsWithChildren) {
  return <p className="orbit-eyebrow">{children}</p>
}

export function StatusPill({ tone = 'brand', children }: PropsWithChildren<{ tone?: 'brand' | 'success' | 'energy' | 'neutral' }>) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>
}

export function PageSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading" className="app-page app-skeleton screen-enter">
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </main>
  )
}
