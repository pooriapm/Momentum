import { useImperativeHandle, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type PropsWithChildren, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { rubberband, sampleVelocity, shouldDismissSheet, stepSpring } from '../ui/sheet-motion'
import type { ModalHandle } from './use-modal-dismiss'

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ModalShell({
  children,
  className = '',
  labelId,
  material = 'glass',
  onClose,
  ref,
}: PropsWithChildren<{ className?: string; labelId: string; material?: 'glass' | 'content'; onClose: () => void; ref?: Ref<ModalHandle> }>) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const motion = useRef({
    position: 0, velocity: 0, opacity: 1, opacityVelocity: 0,
    target: 0, closing: false, frame: 0, lastTime: 0, damping: 1,
    reduced: true, completed: false,
  })
  const gesture = useRef<{
    pointerId: number; startY: number; startPosition: number; dragging: boolean;
    samples: Array<{ y: number; time: number }>;
  } | null>(null)
  const suppressClick = useRef(false)

  useLayoutEffect(() => { onCloseRef.current = onClose }, [onClose])

  function paint() {
    const state = motion.current
    if (dialogRef.current) {
      dialogRef.current.style.transform = state.reduced ? '' : `translate3d(0, ${state.position}px, 0)`
      dialogRef.current.style.opacity = String(Math.max(0, Math.min(1, state.opacity)))
    }
    backdropRef.current?.style.setProperty('--sheet-scrim-opacity', String(Math.max(0, Math.min(1, state.opacity))))
  }

  function stop() {
    window.cancelAnimationFrame(motion.current.frame)
    motion.current.frame = 0
  }

  function finish() {
    const state = motion.current
    state.position = state.target
    state.velocity = 0
    state.opacity = state.closing ? 0 : 1
    paint()
    if (state.closing && !state.completed) {
      state.completed = true
      onCloseRef.current()
    }
  }

  function animate(target: number, closing: boolean, momentum = false) {
    stop()
    const state = motion.current
    state.target = target
    state.closing = closing
    state.damping = momentum ? 0.86 : 1
    if (state.reduced) {
      finish()
      return
    }
    state.lastTime = performance.now()
    function tick(now: number) {
      const dt = Math.min((now - state.lastTime) / 1000, 0.064)
      state.lastTime = now
      const next = stepSpring(state, state.target, dt, state.damping)
      state.position = next.position
      state.velocity = next.velocity
      const alpha = stepSpring({ position: state.opacity, velocity: state.opacityVelocity }, state.closing ? 0 : 1, dt)
      state.opacity = alpha.position
      state.opacityVelocity = alpha.velocity
      paint()
      if (Math.abs(state.position - state.target) < 0.5 && Math.abs(state.velocity) < 5 && Math.abs(state.opacity - (state.closing ? 0 : 1)) < 0.01) {
        state.frame = 0
        finish()
      } else state.frame = window.requestAnimationFrame(tick)
    }
    state.frame = window.requestAnimationFrame(tick)
  }

  function dismiss() {
    if (motion.current.completed) return
    animate((dialogRef.current?.getBoundingClientRect().height ?? 0) + 64, true)
  }

  useImperativeHandle(ref, () => ({ dismiss }))

  useLayoutEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const background = [...document.body.children]
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdropRef.current)
      .map((node) => ({ node, inert: node.inert }))
    background.forEach(({ node }) => { node.inert = true })
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const state = motion.current
    state.completed = false
    state.reduced = preference?.matches ?? true
    state.position = state.reduced ? 0 : 48
    state.velocity = 0
    state.opacity = state.reduced ? 1 : 0
    state.opacityVelocity = 0
    animate(0, false)

    const onPreferenceChange = () => {
      state.reduced = preference?.matches ?? true
      if (state.reduced) {
        gesture.current = null
        stop()
        finish()
      }
    }
    preference?.addEventListener?.('change', onPreferenceChange)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (backdropRef.current?.inert) return
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === dialogRef.current || !dialogRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || active === dialogRef.current || !dialogRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      stop()
      preference?.removeEventListener?.('change', onPreferenceChange)
      window.removeEventListener('keydown', handleKeyDown)
      background.forEach(({ node, inert }) => { node.inert = inert })
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
    // One lifecycle per mounted sheet; callbacks use the current refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    suppressClick.current = false
    if (!event.isPrimary || event.button !== 0 || motion.current.reduced) return
    stop()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      pointerId: event.pointerId, startY: event.clientY, startPosition: motion.current.position,
      dragging: false, samples: [{ y: event.clientY, time: performance.now() }],
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = gesture.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const now = performance.now()
    drag.samples = [...drag.samples.filter((sample) => now - sample.time <= 100), { y: event.clientY, time: now }]
    const delta = event.clientY - drag.startY
    if (!drag.dragging && Math.abs(delta) < 8) return
    drag.dragging = true
    motion.current.closing = false
    const position = drag.startPosition + delta
    const height = dialogRef.current?.offsetHeight || 600
    motion.current.position = position < 0 ? rubberband(position, height) : position
    motion.current.velocity = sampleVelocity(drag.samples, now)
    motion.current.opacity = Math.max(0.15, 1 - Math.max(0, position) / (height + 64))
    motion.current.opacityVelocity = 0
    paint()
  }

  function pointerEnd(event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) {
    const drag = gesture.current
    if (!drag || drag.pointerId !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    suppressClick.current = drag.dragging || cancelled
    const state = motion.current
    if (cancelled) { animate(0, false); return }
    if (!drag.dragging) { animate(state.target, state.closing); return }
    const now = performance.now()
    drag.samples.push({ y: event.clientY, time: now })
    state.velocity = sampleVelocity(drag.samples, now)
    const height = dialogRef.current?.offsetHeight || 600
    const closing = shouldDismissSheet(state.position, state.velocity, height)
    animate(closing ? height + 64 : 0, closing, Math.abs(state.velocity) > 80)
  }

  return createPortal((
    <div className="modal-backdrop" ref={backdropRef} onClick={(event) => {
      if (event.currentTarget === event.target) dismiss()
    }}>
      <div
        aria-labelledby={labelId}
        aria-modal="true"
        className={`modal-surface glass-chrome ${material === 'content' ? 'glass-chrome--content' : ''} ${className}`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={document.documentElement.lang.startsWith('fa') ? 'بستن پنجره' : 'Close sheet'}
          className="modal-drag-handle"
          onClick={(event) => { if (!suppressClick.current || event.detail === 0) dismiss(); suppressClick.current = false }}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={(event) => pointerEnd(event)}
          onPointerCancel={(event) => pointerEnd(event, true)}
          onLostPointerCapture={(event) => { if (gesture.current) pointerEnd(event, true) }}
          type="button"
        ><span aria-hidden="true" /></button>
        {children}
      </div>
    </div>
  ), document.body)
}
