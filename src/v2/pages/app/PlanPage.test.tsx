import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { PLAN_SHOPPING_KEY } from './plan-state'
import { PlanPage } from './PlanPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)

function planFixture(overrides: Partial<MomentumPlanView> = {}): MomentumPlanView {
  return structuredClone({ ...demoPlan, ...overrides })
}

function renderPlan(props: Partial<ComponentProps<typeof PlanPage>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <PlanPage locale="en" plan={planFixture()} preview {...props} />
      </QueryClientProvider>
    </I18nProvider>,
  )
}

describe('PlanPage inventory states', () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    sessionStorage.clear()
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('PLAN-01 selects the current week and day', () => {
    renderPlan()
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Today’s workout')).toBeInTheDocument()
    expect(document.querySelector('.plan-week__day.is-active')).not.toBeNull()
  })

  it('PLAN-02 shows monthly nutrition structure and meal options', () => {
    renderPlan({ initialSegment: 'nutrition' })
    expect(screen.getByText('Monthly nutrition pattern')).toBeInTheDocument()
    expect(screen.getAllByText(/Vegetable omelet|Cinnamon oats|Avocado egg toast/).length).toBeGreaterThan(0)
  })

  it('PLAN-03 shows monthly training structure and workout days', () => {
    renderPlan({ initialSegment: 'training' })
    expect(screen.getByText(/workout days this period/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lower-body strength' })).toBeInTheDocument()
    expect(screen.getByText(/12 kg dumbbell/i)).toBeInTheDocument()
  })

  it('PLAN-04 groups the grocery list and keeps checks offline-safe', () => {
    renderPlan({ initialSegment: 'grocery' })
    expect(screen.getByText(/offline checkmarks are stored on this device/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /chicken breast/i }))
    expect(screen.getByRole('button', { name: /chicken breast/i })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(PLAN_SHOPPING_KEY)).toContain('protein-0')
  })

  it('PLAN-05 renders a locale-safe calendar for the effective period', () => {
    renderPlan({ initialSegment: 'calendar' })
    expect(screen.getByText('Month view')).toBeInTheDocument()
    expect(screen.getByText(/the current period runs/i)).toBeInTheDocument()
    expect(document.querySelectorAll('.plan-calendar__cell').length).toBeGreaterThan(27)
  })

  it('PLAN-06 exposes version, source cycle, interval and readable changes', () => {
    renderPlan()
    expect(screen.getAllByText(/v2 · cycle 2/i).length).toBeGreaterThan(0)
    expect(screen.getByText('This version is active and read-only. Next-period changes are stored separately and do not overwrite this version.')).toBeInTheDocument()
    expect(screen.getByText('Training increased from 2 to 3 days')).toBeInTheDocument()
  })

  it('PLAN-07 points a missing plan at one setup action', () => {
    renderPlan({ plan: null })
    expect(screen.getByRole('heading', { name: 'No active plan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue setup/i })).toHaveAttribute('href', '/en/onboarding')
  })

  it('PLAN-08 shows a week-geometry loading skeleton', () => {
    renderPlan({ surface: 'loading' })
    expect(screen.getByLabelText('Loading plan')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('The final Week-view geometry is preserved')).toBeInTheDocument()
    expect(document.querySelectorAll('.plan-skeleton-day').length).toBe(7)
  })

  it('PLAN-09 shows a cached offline plan with last-sync time and locked logging', () => {
    renderPlan({ surface: 'offline', lastSyncedAt: '2026-08-17T08:42:00.000Z', initialSegment: 'nutrition' })
    expect(screen.getByText(/saved plan copy/i)).toBeInTheDocument()
    expect(screen.getByText(/last synced/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^complete$/i }).every((button) => button.hasAttribute('disabled'))).toBe(true)
  })

  it('PLAN-10 keeps the cached plan readable on a recoverable load error', () => {
    const onRetry = vi.fn()
    renderPlan({ surface: 'error', lastSyncedAt: '2026-08-17T08:42:00.000Z', onRetry })
    expect(screen.getByText(/the latest plan could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByText(/showing the cached copy/i)).toBeInTheDocument()
    expect(screen.getByText('Today’s workout')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('PLAN-11 opens meal detail with recipe, provenance and alternatives', () => {
    renderPlan({ initialSegment: 'nutrition' })
    fireEvent.click(screen.getByRole('button', { name: /saffron chicken.*details/i }))
    expect(document.getElementById('meal-detail-title')).toBeTruthy()
    expect(screen.getByText(/provenance: active plan/i)).toBeInTheDocument()
    expect(screen.getByText('Recipe')).toBeInTheDocument()
    expect(screen.getByText('Equivalent alternatives')).toBeInTheDocument()
  })

  it('PLAN-12 opens workout detail with sets, rest, equipment and adaptations', () => {
    renderPlan({ initialSegment: 'training' })
    fireEvent.click(screen.getByRole('button', { name: /exercise details/i }))
    expect(document.getElementById('workout-detail-title')).toBeTruthy()
    expect(screen.getByText(/4 × 8 · 90s rest/i)).toBeInTheDocument()
    expect(screen.getAllByText(/12 kg dumbbell/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/bodyweight version/i)).toBeInTheDocument()
  })

  it('PLAN-13 saves a catalog substitution with a deterministic consequence', () => {
    renderPlan({ initialSegment: 'nutrition' })
    const options = screen.getAllByRole('button', { name: /cinnamon oats/i })
    fireEvent.click(options[0]!)
    expect(screen.getByText(/only this meal changed; this month’s plan is unchanged/i)).toBeInTheDocument()
  })

  it('PLAN-14 shows immutable prior versions and a human-readable cycle diff', () => {
    renderPlan()
    fireEvent.click(screen.getByRole('button', { name: /v2 · cycle 2/i }))
    expect(screen.getByText('What changed from the prior period')).toBeInTheDocument()
    expect(screen.getByText(/every version is tied to its source cycle/i)).toBeInTheDocument()
    expect(screen.getByText(/prior v1 · cycle 1/i)).toBeInTheDocument()
  })

  it('PLAN-13 workout substitutes stay on the catalog option and do not regenerate', () => {
    renderPlan({ initialSegment: 'training' })
    fireEvent.click(screen.getByRole('button', { name: /exercise details/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /^substitute$/i })[0]!)
    expect(screen.getByText(/does not regenerate the monthly plan/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /choose bodyweight squat/i }))
    expect(screen.getByText(/same movement-pattern substitute saved/i)).toBeInTheDocument()
  })
})

describe('Plan grocery completion', () => {
  it('PLAN-04 share action is available without a network', () => {
    online.mockReturnValue(false)
    renderPlan({ initialSegment: 'grocery', surface: 'offline' })
    expect(screen.getByRole('button', { name: /share list/i })).toBeEnabled()
  })
})
