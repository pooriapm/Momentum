import {
  useEffect,
  type PropsWithChildren,
} from 'react'
import { createPortal } from 'react-dom'

let openPortalCount = 0
let previousBodyOverflow = ''
let previousDocumentOverflow = ''

export function ViewportPortal({ children }: PropsWithChildren) {
  useEffect(() => {
    if (openPortalCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      previousDocumentOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    openPortalCount += 1

    return () => {
      openPortalCount = Math.max(0, openPortalCount - 1)

      if (openPortalCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        document.documentElement.style.overflow = previousDocumentOverflow
      }
    }
  }, [])

  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
