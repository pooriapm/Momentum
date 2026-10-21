import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { demoPlan } from '../../data/demo'
import { skipMeal, undoMeal } from '../../data/repository'
import type { MomentumPlanView } from '../../data/types'
import { TodayPage } from './TodayPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

vi.mock('../../data/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/repository')>()),
  skipMeal: vi.fn(async () => undefined),
  undoMeal: vi.fn(async () => undefined),
  completeMeal: vi.fn(async () => undefined),
}))

function plan(): MomentumPlanView {
  const value = structuredClone(demoPlan)
  value.localDate = new Intl.DateTimeFormat('en-CA', { timeZone: value.timezone }).format(new Date())
  return value
}

function renderToday(locale: 'en' | 'fa', value = plan()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TodayPage locale={locale} plan={value} preview={false} />
      </QueryClientProvider>
    </I18nProvider>,
  )
  return value
}

describe('skipping a meal on the website', () => {
  beforeEach(() => {
    vi.mocked(skipMeal).mockClear()
    vi.mocked(undoMeal).mockClear()
  })

  it('skips the next meal with its chosen option and moves on to the following one', async () => {
    await i18n.changeLanguage('en')
    const value = renderToday('en')
    const ordered = [...value.meals].sort((a, b) => a.time.localeCompare(b.time))
    fireEvent.click(screen.getByRole('button', { name: 'Skip meal' }))
    await waitFor(() => expect(skipMeal).toHaveBeenCalledTimes(1))
    const [date, slot, option] = vi.mocked(skipMeal).mock.calls[0]!
    expect(date).toBe(value.localDate)
    expect(ordered.some((meal) => meal.id === slot)).toBe(true)
    const meal = value.meals.find((item) => item.id === slot)!
    expect(meal.options.some((item) => item.id === option)).toBe(true)
    await waitFor(() => expect(screen.getAllByText('Skipped').length).toBeGreaterThan(0))
  })

  it('shows a skipped meal crossed out with an undo that returns it to planned', async () => {
    await i18n.changeLanguage('fa')
    const value = plan()
    const ordered = [...value.meals].sort((a, b) => a.time.localeCompare(b.time))
    const skipped = ordered[ordered.length - 1]!
    skipped.completionStatus = 'skipped'
    renderToday('fa', value)
    const row = screen.getAllByText('رد شد')[0]!.closest('.today-meal-row') as HTMLElement
    expect(row).toHaveClass('is-skipped')
    fireEvent.click(within(row).getByRole('button', { name: 'برگرداندن ثبت' }))
    await waitFor(() => expect(undoMeal).toHaveBeenCalledWith(value.localDate, skipped.id, expect.any(String), expect.any(String)))
  })

  it('offers eat and skip on every planned meal in the list', async () => {
    await i18n.changeLanguage('en')
    const value = renderToday('en')
    const planned = value.meals.filter((meal) => (meal.completionStatus ?? 'planned') === 'planned').length - 1
    const list = document.querySelector('.today-timeline-list') as HTMLElement
    expect(within(list).getAllByRole('button', { name: /^Skip / }).length).toBe(planned)
    expect(within(list).getAllByRole('button', { name: /^Log / }).length).toBe(planned)
  })
})
