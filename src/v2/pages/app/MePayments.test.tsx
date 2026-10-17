import type { User } from '@supabase/supabase-js'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { demoPlan } from '../../data/demo'
import type { MomentumPlanView } from '../../data/types'
import { startZarinpalCheckout } from '../../data/payments'
import { MePage } from './MePage'

vi.mock('../../entitlement', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../entitlement')>()),
  PAYMENTS_LIVE: true,
}))

vi.mock('../../data/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/payments')>()),
  startZarinpalCheckout: vi.fn(async () => undefined),
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

describe('website membership checkout', () => {
  beforeEach(() => {
    vi.mocked(startZarinpalCheckout).mockClear()
    searchMock.value = ''
  })

  it('offers Zarinpal to Iranian members in English and returns them to English', async () => {
    await i18n.changeLanguage('en')
    renderMembership('en', 'ir')
    fireEvent.click(screen.getByRole('button', { name: 'Pay with Zarinpal' }))
    await waitFor(() => expect(startZarinpalCheckout).toHaveBeenCalledWith('en'))
  })

  it('offers Zarinpal to Iranian members in Persian', async () => {
    await i18n.changeLanguage('fa')
    renderMembership('fa', 'ir')
    fireEvent.click(screen.getByRole('button', { name: 'پرداخت با زرین‌پال' }))
    await waitFor(() => expect(startZarinpalCheckout).toHaveBeenCalledWith('fa'))
  })

  it('keeps members outside Iran on the pricing path while their payment is undecided', async () => {
    await i18n.changeLanguage('en')
    renderMembership('en', 'intl')
    expect(screen.queryByRole('button', { name: /zarinpal/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start membership' })).toHaveAttribute('href', '/en/pricing')
  })

  it('shows the gateway result after Zarinpal sends the buyer back', async () => {
    await i18n.changeLanguage('en')
    searchMock.value = 'payment=success'
    renderMembership('en', 'ir')
    expect(screen.getByText('Payment confirmed. Your 30-day membership is active.')).toBeInTheDocument()
  })
})
