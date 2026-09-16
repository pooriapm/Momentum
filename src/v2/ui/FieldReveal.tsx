import type { ReactNode } from 'react'
import './field-reveal.css'

export function FieldReveal({ open, children, className }: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  if (!open) return null

  return (
    <div className={['field-reveal', className].filter(Boolean).join(' ')}>
      <div className="field-reveal__clip">
        <div className="field-reveal__content">{children}</div>
      </div>
    </div>
  )
}
