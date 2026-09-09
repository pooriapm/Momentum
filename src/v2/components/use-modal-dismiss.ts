import { useCallback, useRef } from 'react'

export interface ModalHandle {
  dismiss: () => void
}

export function useModalDismiss(onDismiss: () => void) {
  const modalRef = useRef<ModalHandle>(null)
  const onClose = useCallback(() => {
    if (modalRef.current) modalRef.current.dismiss()
    else onDismiss()
  }, [onDismiss])
  return { modalRef, onClose }
}
