import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from 'i18next'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { logMealSelection } from '../../data/repository'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { PlanPage } from './PlanPage'
import { ProgressPage } from './ProgressPage'
import { TodayPage } from './TodayPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

vi.mock('../../data/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/repository')>()),
  logMealSelection: vi.fn(async () => undefined),
}))

function freePlan(): MomentumPlanView {
  const plan = structuredClone(demoPlan)
  plan.progress.entitlementStatus = 'none'
  return plan
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </I18nProvider>,
  )
}

describe('free tier', () => {
  beforeEach(async () => {
    vi.mocked(logMealSelection).mockClear()
    localStorage.clear()
    sessionStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('keeps the shopping list for members and invites free users to membership', () => {
    wrap(<PlanPage initialSegment="grocery" locale="en" plan={freePlan()} preview={false} />)
    expect(screen.getByRole('heading', { name: /shopping list comes with membership/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /see membership/i })).toHaveAttribute('href', '/en/pricing')
  })

  it('does not save a meal swap for a free user and explains why', () => {
    wrap(<TodayPage locale="en" plan={freePlan()} preview={false} />)
    const strip = document.querySelector('.meal-option-strip') as HTMLElement
    const options = within(strip).getAllByRole('button')
    expect(options.length).toBeGreaterThan(1)
    fireEvent.click(options[1]!)
    expect(logMealSelection).not.toHaveBeenCalled()
    expect(screen.getByText(/meal swaps come with membership/i)).toBeInTheDocument()
  })

  it('keeps check-ins and this week’s numbers free but locks trends', () => {
    render(<I18nProvider><ProgressPage locale="en" plan={freePlan()} preview={false} /></I18nProvider>)
    expect(screen.getByRole('heading', { name: /trends and comparisons come with membership/i })).toBeInTheDocument()
    expect(screen.getByText(/daily logging and check-ins stay free/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent check-ins/i })).toBeInTheDocument()
    expect(screen.queryByText(/monthly-plan adherence/i)).not.toBeInTheDocument()
  })
})
