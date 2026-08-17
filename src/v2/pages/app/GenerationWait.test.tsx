import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GenerationWait } from './GenerationWait'
import { TODAY_GENERATION_WAIT_MS } from './today-state'

describe('GenerationWait inventory copy', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('LIFE-12 and TODAY-04 allow leaving without a second job', () => {
    render(<GenerationWait locale="en" phase="queued" />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-12')
    expect(document.querySelector('[data-today]')?.getAttribute('data-today')).toBe('TODAY-04')
    expect(screen.getByText(/please wait\. your personalized plan is being created/i)).toBeInTheDocument()
    expect(screen.getByText(/you can leave this page and come back\. a second job is not created/i)).toBeInTheDocument()
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument()
  })

  it('LIFE-14 and LIFE-15 stay on the same wait screen', () => {
    const { rerender } = render(<GenerationWait locale="en" phase="validating" />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-14')
    expect(screen.getByText(/one plan for one month · safety check/i)).toBeInTheDocument()
    rerender(<GenerationWait locale="en" phase="importing" />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-15')
    expect(screen.getByText(/one plan for one month · importing/i)).toBeInTheDocument()
  })

  it('LIFE-16 shows ready_at and an immutable version', () => {
    render(<GenerationWait locale="en" phase="ready" readyAt="08:42" versionLabel="v2" />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-16')
    expect(screen.getByText(/your one-month plan is ready/i)).toBeInTheDocument()
    expect(screen.getByText(/started 08:42 · v2/i)).toBeInTheDocument()
    expect(screen.getByText(/this version is immutable/i)).toBeInTheDocument()
    expect(screen.getByText(/open today/i).closest('a')).toHaveAttribute('href', '/en/app/today')
  })

  it('LIFE-18 times out after 3 minutes with a same-job retry', async () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    render(<GenerationWait locale="en" onRetry={onRetry} phase="generating" startedAt={Date.now()} />)
    await vi.advanceTimersByTimeAsync(TODAY_GENERATION_WAIT_MS)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-18')
    expect(screen.getByText(/the plan is not ready yet/i)).toBeInTheDocument()
    expect(screen.getByText(/you are not stuck/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('LIFE-19 and LIFE-20 keep the prior plan safe and do not blame the user', () => {
    const onRetry = vi.fn()
    const { rerender } = render(<GenerationWait failure="validation" hasPriorPlan locale="en" onRetry={onRetry} />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-19')
    expect(screen.getByText(/nothing was imported/i)).toBeInTheDocument()
    expect(screen.getByText(/that version stays active and readable/i)).toBeInTheDocument()
    expect(screen.getByText(/no pressure to keep a streak/i)).toBeInTheDocument()
    rerender(<GenerationWait failure="import" hasPriorPlan locale="en" onRetry={onRetry} />)
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-20')
    expect(screen.getByText(/does not call the generation provider again/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry import'))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/view previous plan/i).closest('a')).toHaveAttribute('href', '/en/app/plan')
  })
})
