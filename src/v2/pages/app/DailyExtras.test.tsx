import { act, fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { saveWater } from '../../checkins/repository'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { EatingOutCard, WaterCard } from './DailyExtras'

vi.mock('../../checkins/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../checkins/repository')>()),
  saveWater: vi.fn(async () => undefined),
}))

function plan(): MomentumPlanView {
  return { ...structuredClone(demoPlan), localDate: '2026-10-21', timezone: 'Asia/Tehran', water: { goalMl: 2000, loggedMl: 1750 } }
}

function renderWater(value = plan()) {
  render(<I18nProvider><WaterCard locale="en" locked={false} plan={value} preview={false} /></I18nProvider>)
}

describe('water on Today', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.mocked(saveWater).mockReset().mockResolvedValue(undefined)
    await i18n.changeLanguage('en')
  })
  afterEach(() => vi.useRealTimers())

  it('adds a glass at once and saves the day total after a pause', async () => {
    renderWater()
    fireEvent.click(screen.getByRole('button', { name: 'One glass' }))
    expect(screen.getByText('2,000 / 2,000 ml')).toBeInTheDocument()
    expect(screen.getByText(/water goal is done/i)).toBeInTheDocument()
    expect(saveWater).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(saveWater).toHaveBeenCalledWith(2000, '2026-10-21', 'Asia/Tehran')
  })

  it('sends only the final total when tapped quickly', async () => {
    renderWater()
    fireEvent.click(screen.getByRole('button', { name: 'One glass less' }))
    fireEvent.click(screen.getByRole('button', { name: 'One glass less' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(saveWater).toHaveBeenCalledTimes(1)
    expect(saveWater).toHaveBeenCalledWith(1250, '2026-10-21', 'Asia/Tehran')
  })

  it('returns to the saved total and says so when saving fails', async () => {
    vi.mocked(saveWater).mockRejectedValueOnce(new Error('offline'))
    renderWater()
    fireEvent.click(screen.getByRole('button', { name: 'One glass' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(screen.getByText('1,750 / 2,000 ml')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/water was not saved/i)
  })
})

describe('eating out on Today', () => {
  it('lists the plan tips with their estimate and hides when there are none', async () => {
    await i18n.changeLanguage('fa')
    const { unmount } = render(<I18nProvider><EatingOutCard locale="fa" plan={demoPlan} /></I18nProvider>)
    expect(screen.getByText('بیرون غذا می‌خوری؟')).toBeInTheDocument()
    expect(screen.getByText('جوجه‌کباب با برنج و سالاد')).toBeInTheDocument()
    unmount()
    const { container } = render(<I18nProvider><EatingOutCard locale="fa" plan={{ ...demoPlan, restaurantGuide: [] }} /></I18nProvider>)
    expect(container).toBeEmptyDOMElement()
  })
})
