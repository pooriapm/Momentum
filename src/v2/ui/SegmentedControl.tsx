import type { KeyboardEvent, ReactNode } from 'react'

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
// labels. Tabs follow the WAI-ARIA pattern: one tab stop, arrows move in reading direction.
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
    <div
      aria-label={label}
      className={`segmented-control glass-chrome ${className}`.trim()}
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <button
          aria-controls={`${idPrefix}-panel-${item.value}`}
          aria-selected={item.value === value}
          className={item.value === value ? 'is-active' : ''}
          id={`${idPrefix}-tab-${item.value}`}
          key={item.value}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          role="tab"
          tabIndex={item.value === value ? 0 : -1}
          type="button"
        >
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  )
}
