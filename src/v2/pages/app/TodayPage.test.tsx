import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from 'i18next'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { TODAY_GENERATION_WAIT_MS } from './today-state'
import { TodayPage } from './TodayPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)

function planFixture(overrides: Partial<MomentumPlanView> = {}): MomentumPlanView {
  return structuredClone({ ...demoPlan, ...overrides })
}

function renderToday(
  props: Partial<ComponentProps<typeof TodayPage>> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TodayPage locale="en" plan={planFixture()} preview {...props} />
      </QueryClientProvider>
    </I18nProvider>,
  )
}

describe('TodayPage inventory states', () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    sessionStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TODAY-01 keeps one next action above the fold and a quiet check-in', () => {
    renderToday()
    expect(screen.getByText('Next action')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /start workout/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /daily check-in · optional/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /30-second check-in/i })).not.toBeInTheDocument()
  })

  it('TODAY-02 renders a rest day without failure styling', () => {
    renderToday({ plan: planFixture({ workout: null }) })
    expect(screen.getAllByText('Today is for recovery and adaptation').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/skipping them is not treated as failure/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
  })

  it('TODAY-03 points a missing plan at setup', () => {
    renderToday({ plan: null })
    expect(screen.getByRole('heading', { name: 'No active plan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue setup/i })).toHaveAttribute('href', '/en/onboarding')
  })

  it('TODAY-04 shows the monthly generation wait, allows leaving, and times out with retry', async () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    renderToday({ surface: 'preparing', onRetry })
    expect(screen.getByText(/please wait\. your personalized plan is being created/i)).toBeInTheDocument()
    expect(screen.getByText(/you can leave this page and come back/i)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(TODAY_GENERATION_WAIT_MS)
    expect(screen.getByText(/the plan is not ready yet/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('TODAY-05 and TODAY-06 complete a meal, update the next action, and allow undo', () => {
    renderToday()
    fireEvent.click(screen.getByRole('button', { name: /^complete$/i }))
    expect(screen.getByRole('button', { name: /undo log/i })).toBeInTheDocument()
    expect(screen.getByText(/is next|you completed today’s plan/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /undo log/i }))
    expect(screen.queryByRole('button', { name: /undo log/i })).not.toBeInTheDocument()
  })

  it('TODAY-07 shows a cached offline plan with last-sync time and locked logging', () => {
    renderToday({ surface: 'offline', lastSyncedAt: '2026-08-17T08:42:00.000Z' })
    expect(screen.getByText(/you’re offline/i)).toBeInTheDocument()
    expect(screen.getByText(/last synced/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^complete$/i })).toBeDisabled()
  })

  it('TODAY-08 disables mutations on stale plan data', () => {
    renderToday({ surface: 'stale' })
    expect(screen.getByText(/this copy may be out of date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^complete$/i })).toBeDisabled()
  })

  it('TODAY-09 keeps the stored plan safe on a recoverable load error', () => {
    const onRetry = vi.fn()
    renderToday({ surface: 'load-error', lastSyncedAt: '2026-08-17T08:42:00.000Z', onRetry })
    expect(screen.getByRole('heading', { name: /today’s plan could not be loaded/i })).toBeInTheDocument()
    expect(screen.getByText(/saved plan is safe/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('TODAY-09 cold load error without a cached plan still retries', () => {
    const onRetry = vi.fn()
    renderToday({ plan: null, loadError: true, onRetry })
    expect(screen.getByRole('heading', { name: /today’s plan could not be loaded/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /continue setup/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('TODAY-10 pauses training without streak pressure', () => {
    renderToday({ surface: 'safety' })
    expect(screen.getAllByText(/today’s workout is paused/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/no pressure to keep a streak/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /view safety guidance/i })).toHaveAttribute('href', '/en/safety')
  })

  it('TODAY-11 and TODAY-12 open the quiet check-in and confirm a saved log with no AI', async () => {
    renderToday()
    fireEvent.click(screen.getAllByRole('button', { name: /daily check-in · optional/i })[0]!)
    expect(screen.getByRole('heading', { name: 'Daily check-in' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/sleep last night/i), { target: { value: '7.5' } })
    fireEvent.click(screen.getByRole('button', { name: /save check-in/i }))
    expect(await screen.findByText(/check-in saved\. no ai was called/i)).toBeInTheDocument()
  })

  it('EXEC-01 and EXEC-03 keep meal selection, details, and substitution on Today', () => {
    renderToday()
    const strip = document.querySelector('.meal-option-strip')
    expect(strip).not.toBeNull()
    const options = within(strip as HTMLElement).getAllByRole('button')
    fireEvent.click(options[1]!)
    expect(screen.getByText(/substitution saved\. this month’s plan is unchanged/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /details/i }))
    expect(document.getElementById('meal-detail-title')).toBeTruthy()
  })
})
