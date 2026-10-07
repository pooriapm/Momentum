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

  it('PLAN-02 shows the selected day’s meals and options', () => {
    renderPlan({ initialSegment: 'nutrition' })
    expect(screen.getByText('Choose a day')).toBeInTheDocument()
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
    expect(screen.getByText(/checkmarks stay on this device and are not sent to the server/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /chicken breast/i }))
    expect(screen.getByRole('button', { name: /chicken breast/i })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(PLAN_SHOPPING_KEY)).toContain('protein-0')
  })

  it('PLAN-05 puts the calendar date on the week days', () => {
    renderPlan()
    expect(screen.queryByRole('tab', { name: 'Calendar' })).not.toBeInTheDocument()
    expect(screen.getByText('Choose a day')).toBeInTheDocument()
    expect(screen.getByText('Selected day')).toBeInTheDocument()
    const active = document.querySelector('.plan-week__day.is-active .plan-week__date')
    expect(active?.textContent).toMatch(/^\d{1,2}$/)
    expect(document.querySelector('.plan-calendar')).toBeNull()
  })

  it('PLAN-06 does not show the version trace on the plan', () => {
    renderPlan()
    expect(screen.queryByRole('heading', { name: /version trace/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /compare with previous version/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/v2 · cycle 2/i)).not.toBeInTheDocument()
  })

  it('PLAN-07 points a missing plan at one setup action', () => {
    renderPlan({ plan: null })
    expect(screen.getByRole('heading', { name: 'No active plan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue setup/i })).toHaveAttribute('href', '/en/onboarding')
  })

  it('PLAN-08 shows a week-geometry loading skeleton', () => {
    renderPlan({ surface: 'loading' })
    expect(screen.getByLabelText('Loading plan')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading your week…')).toBeInTheDocument()
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

  it('PLAN-11 opens meal detail with recipe, provenance and alternatives', async () => {
    renderPlan({ initialSegment: 'nutrition' })
    fireEvent.click(screen.getByRole('button', { name: /saffron chicken.*details/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(document.getElementById('meal-detail-title')).toBeTruthy()
    expect(screen.getByText(/provenance: active plan/i)).toBeInTheDocument()
    expect(screen.getByText('Recipe')).toBeInTheDocument()
    expect(screen.getByText('Equivalent alternatives')).toBeInTheDocument()
  })

  it('PLAN-12 opens workout detail with sets, rest, equipment and adaptations', async () => {
    renderPlan({ initialSegment: 'training' })
    fireEvent.click(screen.getByRole('button', { name: /exercise details/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
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

  it('PLAN-13 workout substitutes stay on the catalog option and do not regenerate', async () => {
    renderPlan({ initialSegment: 'training' })
    fireEvent.click(screen.getByRole('button', { name: /exercise details/i }))
    const substitute = (await screen.findAllByRole('button', { name: /^substitute$/i }))[0]
    fireEvent.click(substitute!)
    expect(await screen.findByText(/does not regenerate the monthly plan/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /choose bodyweight squat/i }))
    expect(await screen.findByText(/same movement-pattern substitute saved/i)).toBeInTheDocument()
    expect(document.querySelector('.workout-detail-card')?.textContent).toMatch(/Bodyweight squat/)
    expect(document.querySelector('.workout-detail-card')?.textContent).not.toMatch(/Goblet squat/)
  })

  it('hides past days and keeps the first unplanned day for the next period', () => {
    renderPlan()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
    const shownDays = [...document.querySelectorAll<HTMLButtonElement>('.plan-week__day')]
    expect(shownDays.length).toBeGreaterThan(0)
    expect(shownDays.every((day) => !day.disabled)).toBe(true)
    let guard = 0
    while (!screen.queryByRole('button', { name: /next period/i }) && guard < 8) {
      const nextWeek = screen.getByRole('button', { name: /next week/i })
      expect(nextWeek).toBeEnabled()
      fireEvent.click(nextWeek)
      guard += 1
    }
    fireEvent.click(screen.getByRole('button', { name: /next period/i }))
    expect(screen.getByRole('heading', { name: /feedback on last month’s plan/i })).toBeInTheDocument()
  })

  it('moves to the next scheduled week without calling the plan start day today', () => {
    renderPlan()
    expect(screen.getByRole('button', { name: /previous week/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /today/i })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /next week/i }))
    expect(screen.queryByRole('button', { name: /today/i })).not.toBeInTheDocument()
    expect(document.querySelector('.plan-week__day.is-active')?.textContent ?? '').not.toMatch(/today/i)
  })

  it('moves across a month from the week strip when the period crosses a month', () => {
    const plan = planFixture()
    renderPlan({ plan })
    const title = () => document.querySelector('.plan-day-picker__month')?.textContent ?? ''
    const start = title()
    expect(start.length).toBeGreaterThan(0)
    const spansMonths = plan.version?.validFrom.slice(0, 7) !== plan.version?.validTo.slice(0, 7)
    if (!spansMonths) return
    let guard = 0
    while (title() === start && guard < 8) {
      const next = screen.getByRole('button', { name: /next week/i })
      expect(next).toBeEnabled()
      fireEvent.click(next)
      guard += 1
    }
    expect(title()).not.toBe(start)
  })

  it('uses Persian digits for week counts, cycles, and exercise doses', () => {
    renderPlan({ initialSegment: 'training', locale: 'fa' })
    expect(screen.getByText(/۲۸ روز تمرین در این دوره/)).toBeInTheDocument()
    expect(screen.getByText('یک روز را انتخاب کن')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /ردیابی نسخه/ })).not.toBeInTheDocument()
    const training = document.querySelector('.workout-detail-card')?.textContent ?? ''
    expect(training).toContain('اسکوات جام')
    expect(training).toContain('۴ × ۸')
    expect(training).toContain('هر طرف')
    expect(training).toContain('دقیقه')
  })
})

describe('Plan grocery completion', () => {
  it('PLAN-04 share action is available without a network', () => {
    online.mockReturnValue(false)
    renderPlan({ initialSegment: 'grocery', surface: 'offline' })
    expect(screen.getByRole('button', { name: /share list/i })).toBeEnabled()
  })
  it('uses a Jalali day number on a Persian plan', () => {
    renderPlan({ locale: 'fa' })
    expect(document.querySelector('.plan-week__day.is-active .plan-week__date')?.textContent).toMatch(/[۰-۹]/)
  })
  it('only offers upcoming planned days from the week strip', () => {
    renderPlan()
    const days = [...document.querySelectorAll<HTMLButtonElement>('.plan-week__day')]
    expect(days.length).toBeGreaterThan(0)
    expect(days.every((day) => !day.disabled)).toBe(true)
    expect(document.querySelector('.plan-calendar')).toBeNull()
  })

})
