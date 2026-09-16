import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPricingContext } from '../data/pricing'
import { loadUiState } from '../../lib/ui-state'
import { ROOT_LOCALE_LOOKUP_TIMEOUT_MS, RootLocaleRedirect } from './MomentumRouter'

vi.mock('../data/pricing', async (importOriginal) => {
  const original = await importOriginal<typeof import('../data/pricing')>()
  return { ...original, loadPricingContext: vi.fn() }
})

const loadContext = vi.mocked(loadPricingContext)

describe('root locale redirect', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aborts a stalled geo lookup and redirects to the stored-state fallback', async () => {
    vi.useFakeTimers()
    const fallbackLocale = loadUiState().locale
    loadContext.mockImplementation((_country, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))

    render(<RootLocaleRedirect />)
    const signal = loadContext.mock.calls[0]?.[1]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ROOT_LOCALE_LOOKUP_TIMEOUT_MS)
    })

    expect(signal?.aborted).toBe(true)
    expect(window.location.pathname).toBe(`/${fallbackLocale}`)
  })
})
