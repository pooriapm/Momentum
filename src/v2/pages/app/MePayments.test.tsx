import type { User } from '@supabase/supabase-js'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { loadCardDetails, loadLatestCardPayment, registerMembershipInterest, submitCardPayment, uploadReceipt } from '../../data/payments'
import { MePage } from './MePage'

vi.mock('../../entitlement', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../entitlement')>()),
  PAYMENTS_LIVE: true,
}))

vi.mock('../../data/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/payments')>()),
  loadCardDetails: vi.fn(async () => ({ card_number: '6037991234567890', card_holder: 'Pooria', amount_minor: 4_900_000, currency: 'IRR' as const })),
  loadLatestCardPayment: vi.fn(async () => null),
  uploadReceipt: vi.fn(async () => 'u1/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f.jpg'),
  discardReceipt: vi.fn(async () => undefined),
  submitCardPayment: vi.fn(async () => ({ payment_id: '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f', status: 'pending' as const })),
  registerMembershipInterest: vi.fn(async () => ({ registered: true as const })),
}))

const searchMock = vi.hoisted(() => ({ value: '' }))
vi.mock('wouter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('wouter')>()),
  useSearch: () => searchMock.value,
}))

function planIn(region: 'ir' | 'intl'): MomentumPlanView {
  const plan = structuredClone(demoPlan)
  plan.progress.productRegion = region
  plan.progress.entitlementStatus = 'none'
  return plan
}

function renderMembership(locale: 'fa' | 'en', region: 'ir' | 'intl') {
  const auth = {
    isConfigured: true,
    session: null,
    status: 'authenticated',
    user: { id: 'u1', email: 'ava@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } as User,
    signIn: vi.fn(), signOut: vi.fn(), signUp: vi.fn(),
    requestPasswordReset: vi.fn(), resendConfirmation: vi.fn(), updatePassword: vi.fn(),
  } as unknown as AuthContextValue
  return render(
    <I18nProvider>
      <AuthContext.Provider value={auth}>
        <MePage locale={locale} panel="subscription" plan={planIn(region)} preview={false} />
      </AuthContext.Provider>
    </I18nProvider>,
  )
}

describe('website membership payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchMock.value = ''
    // jsdom has no object URLs; the receipt preview only needs a string.
    URL.createObjectURL = vi.fn(() => 'blob:receipt')
    URL.revokeObjectURL = vi.fn()
  })

  it('lets an Iranian member pay by card transfer and submit a receipt for review', async () => {
    await i18n.changeLanguage('en')
    renderMembership('en', 'ir')
    fireEvent.click(await screen.findByRole('button', { name: 'Pay by card transfer' }))
    expect(await screen.findByText('6037 9912 3456 7890')).toBeInTheDocument()
    expect(loadCardDetails).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Submit receipt' })).toBeDisabled()

    const file = new File(['receipt'], 'receipt.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Upload the payment receipt'), { target: { files: [file] } })
    await waitFor(() => expect(uploadReceipt).toHaveBeenCalledWith('u1', file))
    fireEvent.click(await screen.findByRole('button', { name: 'Submit receipt' }))
    await waitFor(() => expect(submitCardPayment).toHaveBeenCalledWith('u1/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f.jpg'))
    expect(await screen.findByText(/reviewing it/)).toBeInTheDocument()
  })

  it('shows the receipt under review instead of a second payment button', async () => {
    vi.mocked(loadLatestCardPayment).mockResolvedValueOnce({ provider: 'card_transfer', status: 'pending', failure_code: null, created_at: '' })
    await i18n.changeLanguage('fa')
    renderMembership('fa', 'ir')
    expect(await screen.findByText(/در حال بررسی است/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'پرداخت کارت به کارت' })).not.toBeInTheDocument()
  })

  it('asks members outside Iran to be notified instead of paying', async () => {
    await i18n.changeLanguage('en')
    renderMembership('en', 'intl')
    expect(screen.queryByRole('button', { name: /card transfer/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Notify me when it opens' }))
    await waitFor(() => expect(registerMembershipInterest).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'We will let you know' })).toBeDisabled()
  })
})
