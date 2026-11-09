import type { KeyboardEvent, ReactNode } from 'react'
import { LiquidSelector } from './LiquidSelector'

export interface SegmentedItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string
  items: Array<SegmentedItem<T>>
  value: T
  onChange: (value: T) => void
  /** Prefix for tab and panel ids; panels use `${idPrefix}-panel-${value}`. */
  idPrefix: string
  className?: string
}

// Switches between views of the same content (week/nutrition, chart/table). Two to four short
// labels on clear Liquid Glass; the selection lens can be tapped or dragged. Tabs follow the
// WAI-ARIA pattern: one tab stop, arrows move in reading direction.
export function SegmentedControl<T extends string>({ label, items, value, onChange, idPrefix, className = '' }: SegmentedControlProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
    const back = rtl ? 'ArrowRight' : 'ArrowLeft'
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
        : event.key === forward ? (index + 1) % items.length
          : event.key === back ? (index - 1 + items.length) % items.length
            : null
    if (next === null) return
    event.preventDefault()
    onChange(items[next].value)
    const tab = document.getElementById(`${idPrefix}-tab-${items[next].value}`)
    tab?.focus({ preventScroll: true })
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }

  return (
    <LiquidSelector
      aria-label={label}
      className={`segmented-control ${className}`.trim()}
      count={items.length}
      onSelect={(index) => onChange(items[index].value)}
      renderItem={(index, active) => {
        const item = items[index]
        return (
          <button
            aria-controls={`${idPrefix}-panel-${item.value}`}
            aria-selected={active}
            className={active ? 'is-active' : ''}
            id={`${idPrefix}-tab-${item.value}`}
            key={item.value}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            {item.icon}{item.label}
          </button>
        )
      }}
      role="tablist"
      selected={items.findIndex((item) => item.value === value)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    />
  )
}
