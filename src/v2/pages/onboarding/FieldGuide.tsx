import { CircleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'

export function FieldGuide({ locale, text }: { locale: AppLocale; text: string }) {
  const id = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false)
    }
    window.addEventListener('field-guide-open', onOpen)
    return () => window.removeEventListener('field-guide-open', onOpen)
  }, [id])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setOpen(false), 4_200)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  function toggle() {
    setOpen((current) => {
      const next = !current
      if (next) window.dispatchEvent(new CustomEvent('field-guide-open', { detail: id }))
      return next
    })
  }

  return (
    <span className="field-guide" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={locale === 'fa' ? 'توضیح این فیلد' : 'About this field'}
        className="field-guide__mark"
        onClick={toggle}
        type="button"
      >
        <CircleAlert size={13} />
      </button>
      {open ? <span className="field-guide__toast" role="status">{text}</span> : null}
    </span>
  )
}
