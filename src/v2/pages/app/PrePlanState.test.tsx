import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { resources } from '../../../platform/i18n/catalog'
import type { AccountDashboardView } from '../../data/repository'
import { requestPlanGeneration } from '../../onboarding/repository'
import { PrePlanState } from './PrePlanState'
import { GENERATION_WAIT_STORAGE_KEY } from './generation-wait'
import { TODAY_GENERATION_WAIT_MS } from './today-state'

vi.mock('../../onboarding/repository', () => ({
  requestPlanGeneration: vi.fn(),
}))

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

const generate = vi.mocked(requestPlanGeneration)

const readyAccount: AccountDashboardView = {
  aiPlanAccess: { reason: 'eligible', state: 'ready' },
  automationBlockReason: null,
  countryCode: 'DE',
  entitlementStatus: 'gift',
  onboardingStatus: 'complete',
  plan: null,
}

describe('PrePlanState generation wait', () => {
  beforeEach(() => {
    generate.mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('TODAY-03 continues onboarding when the profile is incomplete', () => {
    render(<PrePlanState account={{ ...readyAccount, onboardingStatus: 'started' }} locale="en" />)
    expect(screen.getByRole('link', { name: /continue onboarding/i })).toHaveAttribute('href', '/en/onboarding')
  })

  it('routes an entitled empty plan to the wait/ready surface', () => {
    render(<PrePlanState account={readyAccount} locale="en" />)
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /start membership/i })).not.toBeInTheDocument()
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

  it('LIFE-12 resumes the same queued job after leave-and-return', () => {
    generate.mockImplementation(() => new Promise(() => {}))
    const first = render(<PrePlanState account={readyAccount} locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))
    expect(screen.getByText(/please wait\. your personalized plan is being created/i)).toBeInTheDocument()
    const key = generate.mock.calls[0]?.[1]
    expect(sessionStorage.getItem(GENERATION_WAIT_STORAGE_KEY)).toContain(key)
    first.unmount()
    render(<PrePlanState account={readyAccount} locale="en" />)
    expect(screen.getByText(/please wait\. your personalized plan is being created/i)).toBeInTheDocument()
    expect(generate.mock.calls.at(-1)?.[1]).toBe(key)
    expect(generate.mock.calls.every((call) => call[1] === key)).toBe(true)
  })

  it('LIFE-19 stays on the wait screen and retries the same job', async () => {
    generate.mockRejectedValueOnce({ code: 'PLAN_VALIDATION_FAILED' }).mockImplementation(() => new Promise(() => {}))
    render(<PrePlanState account={readyAccount} locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))
    expect(await screen.findByText(/the result was not safe to import/i)).toBeInTheDocument()
    expect(document.querySelector('[data-inventory]')?.getAttribute('data-inventory')).toBe('LIFE-19')
    const key = generate.mock.calls[0]?.[1]
    fireEvent.click(screen.getByText('Try again'))
    expect(generate.mock.calls[1]?.[1]).toBe(key)
  })

  it('blocks generation until gift or paid membership is present', () => {
    render(<PrePlanState account={{ ...readyAccount, entitlementStatus: 'none' }} locale="en" />)
    expect(screen.queryByRole('button', { name: /generate plan/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start membership/i })).toHaveAttribute('href', '/en/app/me')
  })

  it('shows D8 payment-method copy on the ready surface and after a 402', async () => {
    const copy = resources.en.translation.app
    render(<PrePlanState account={readyAccount} locale="en" />)
    expect(screen.getByText((content) => content.includes(copy.paymentRequiredBody))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes(copy.paymentRequiredNote))).toBeInTheDocument()
    expect(screen.getByText(copy.openMembership).closest('a')).toHaveAttribute('href', '/en/app/me')
    expect(screen.queryByLabelText(/card/i)).not.toBeInTheDocument()

    generate.mockRejectedValueOnce({ code: 'PAYMENT_METHOD_REQUIRED', status: 402 })
    fireEvent.click(screen.getByRole('button', { name: /generate plan/i }))
    expect(await screen.findByText(copy.paymentRequiredTitle)).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes(copy.paymentRequiredNote))).toBeInTheDocument()
    expect(screen.queryByText(/creating the plan did not finish this time/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
    expect(screen.getByText(copy.openMembership).closest('a')).toHaveAttribute('href', '/en/app/me')
  })
})
