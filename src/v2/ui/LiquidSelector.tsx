import { useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { glass } from '../../design/tokens'
import { useLiquidGlass } from './liquid-glass'

// Liquid Glass selector, the web counterpart of the Android LiquidSelector (Kyant backdrop):
// clear glass over the content, and a selection lens you can tap or drag between options. The lens
// stretches with drag velocity and refracts while pressed. Right-to-left aware. Items own their
// semantics and keyboard behaviour (tabs, links); the lens is decoration.

interface LiquidSelectorProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect' | 'children'> {
  count: number
  /** Selected index; -1 hides the lens. */
  selected: number
  onSelect: (index: number) => void
  /** Each item fills its cell and is the focusable control (button or link). */
  renderItem: (index: number, active: boolean) => ReactNode
  as?: 'div' | 'nav'
}

const DRAG_THRESHOLD = 6

export function LiquidSelector({ count, selected, onSelect, renderItem, as: Tag = 'div', className = '', style, ...props }: LiquidSelectorProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const lensRef = useRef<HTMLSpanElement | null>(null)
  const drag = useRef<{ id: number; startX: number; lastX: number; lastTime: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const [velocity, setVelocity] = useState(0)
  const [pressed, setPressed] = useState(false)

  useLiquidGlass(rootRef)
  useLiquidGlass(lensRef, { refraction: glass.lensRefraction, bezel: 12, enabled: pressed })

  function positionAt(clientX: number) {
    const root = rootRef.current
    if (!root) return selected
    const rect = root.getBoundingClientRect()
    const rtl = getComputedStyle(root).direction === 'rtl'
    const fraction = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width
    return Math.min(Math.max(fraction * count - 0.5, 0), count - 1)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    suppressClick.current = false
    if (event.button !== 0 || selected < 0) return
    drag.current = { id: event.pointerId, startX: event.clientX, lastX: event.clientX, lastTime: performance.now(), moved: false }
    setPressed(true)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    if (!state.moved && Math.abs(event.clientX - state.startX) < DRAG_THRESHOLD) return
    if (!state.moved) {
      state.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const now = performance.now()
    const width = event.currentTarget.getBoundingClientRect().width / count
    setVelocity(((event.clientX - state.lastX) / Math.max(now - state.lastTime, 1)) * (16 / width))
    state.lastX = event.clientX
    state.lastTime = now
    setDragPosition(positionAt(event.clientX))
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    drag.current = null
    setPressed(false)
    setVelocity(0)
    if (state.moved) {
      suppressClick.current = true
      const next = Math.round(positionAt(event.clientX))
      setDragPosition(null)
      if (next !== selected) onSelect(next)
    }
  }

  const position = dragPosition ?? selected
  const stretch = Math.min(Math.abs(velocity) * 0.75, 0.2)
  const lensStyle = {
    '--lens-position': position,
    '--lens-scale-x': (pressed ? 1.12 : 1) / (1 - stretch),
    '--lens-scale-y': (pressed ? 1.12 : 1) * (1 - stretch / 3),
  } as CSSProperties

  return (
    <Tag
      className={`liquid-selector liquid-glass ${dragPosition !== null ? 'is-dragging' : ''} ${pressed ? 'is-pressed' : ''} ${className}`.trim()}
      onClickCapture={(event) => {
        if (!suppressClick.current) return
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
      onPointerCancel={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      ref={rootRef as never}
      style={{ ...style, '--lens-count': count } as CSSProperties}
      {...props}
    >
      {selected >= 0 ? <span aria-hidden="true" className="liquid-selector__lens" ref={lensRef} style={lensStyle} /> : null}
      {Array.from({ length: count }, (_, index) => renderItem(index, index === selected))}
    </Tag>
  )
}
