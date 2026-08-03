import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  loading?: boolean
  icon?: ReactNode
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
  return (
    <button
      className={`orbit-button orbit-button--${variant} ${block ? 'orbit-button--block' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="orbit-spin" size={18} /> : icon}
      <span>{children}</span>
    </button>
  )
}

export function ContentCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`content-card ${className}`} {...props} />
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
    <main aria-busy="true" aria-label="Loading" className="app-page app-skeleton">
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
