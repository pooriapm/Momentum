import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { AccountDashboardView } from '../../data/repository'
import { requestPlanGeneration } from '../../onboarding/repository'
import { PrePlanState } from './PrePlanState'
import { TODAY_GENERATION_WAIT_MS } from './today-state'

vi.mock('../../onboarding/repository', () => ({
  requestPlanGeneration: vi.fn(),
}))

const generate = vi.mocked(requestPlanGeneration)

const readyAccount: AccountDashboardView = {
  aiCountryVerified: true,
  aiPlanAccess: { reason: 'eligible', state: 'ready' },
  automationBlockReason: null,
  countryCode: 'DE',
  onboardingStatus: 'complete',
  plan: null,
}

describe('PrePlanState generation wait', () => {
  beforeEach(() => {
    generate.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TODAY-03 continues onboarding when the profile is incomplete', () => {
    render(<PrePlanState account={{ ...readyAccount, onboardingStatus: 'started' }} locale="en" />)
    expect(screen.getByRole('link', { name: /continue onboarding/i })).toHaveAttribute('href', '/en/onboarding')
  })

  it('TODAY-04 shows the wait screen, 3-minute timeout, and same-job retry', async () => {
    vi.useFakeTimers()
    generate.mockImplementation(() => new Promise(() => {}))
    render(<PrePlanState account={readyAccount} locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))
    expect(screen.getByText(/please wait\. your personalized plan is being created/i)).toBeInTheDocument()
    expect(screen.getByText(/you can leave this page and come back/i)).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(TODAY_GENERATION_WAIT_MS)
    expect(screen.getByText(/the plan is not ready yet/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(generate).toHaveBeenCalledTimes(2)
    expect(generate.mock.calls[0]?.[1]).toBe(generate.mock.calls[1]?.[1])
  })
})
