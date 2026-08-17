import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { intlMembershipCatalog, irMembershipCatalog } from '../../entitlement'
import { PricingPage } from './PricingPage'

function fakeUser(): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00.000Z',
    email: 'ava@example.com',
    id: '7df18aa8-d1d9-40aa-9326-22262d806db6',
    user_metadata: {},
  } as User
}

function renderPricing(
  catalog: Parameters<typeof PricingPage>[0]['catalog'],
  options: { authenticated?: boolean; giftCampaign?: Parameters<typeof PricingPage>[0]['giftCampaign'] } = {},
) {
  const auth: AuthContextValue = {
    isConfigured: true,
    requestPasswordReset: vi.fn(),
    resendConfirmation: vi.fn(),
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    status: options.authenticated ? 'authenticated' : 'anonymous',
    updatePassword: vi.fn(),
    user: options.authenticated ? fakeUser() : null,
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <AuthContext.Provider value={auth}>
        <QueryClientProvider client={client}>
          <PricingPage catalog={catalog} giftCampaign={options.giftCampaign} locale="en" />
        </QueryClientProvider>
      </AuthContext.Provider>
    </I18nProvider>,
  )
}

describe('PricingPage inventory states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('PUB-07 and PUB-08 show one membership and a gift that is reserved later', () => {
    const { container } = renderPricing(intlMembershipCatalog, { giftCampaign: 'available' })
    expect(container.firstChild).toHaveAttribute('data-inventory', expect.stringContaining('PUB-07'))
    expect(container.firstChild).toHaveAttribute('data-inventory', expect.stringContaining('PUB-08'))
    expect(screen.getByRole('heading', { name: 'Momentum membership', level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/\$14\.99/)).toBeInTheDocument()
    expect(screen.getByText(/reservation happens only after authenticated review/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start membership/i })).toHaveAttribute('href', '/en/auth/sign-up')
    expect(screen.queryByText(/Core\/Pro|7-day trial/i)).not.toBeInTheDocument()
  })

  it('PUB-09 keeps the paid offer when the gift is exhausted', () => {
    renderPricing(intlMembershipCatalog, { giftCampaign: 'exhausted' })
    expect(screen.getByText(/gift budget is currently exhausted/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /start membership/i }).length).toBeGreaterThan(0)
    expect(screen.getByText(/\$14\.99/)).toBeInTheDocument()
  })

  it('PUB-10 shows Iranian list prices without a geo-block', () => {
    const { container } = renderPricing(irMembershipCatalog, { giftCampaign: 'available' })
    expect(container.firstChild).toHaveAttribute('data-inventory', expect.stringContaining('PUB-10'))
    expect(screen.getByText(/490,000 toman/i)).toBeInTheDocument()
    expect(screen.getByText(/rial prices/i)).toBeInTheDocument()
    expect(screen.queryByText(/not available in your region|unavailable market/i)).not.toBeInTheDocument()
  })

  it('PUB-11 does not guess a currency or amount when the catalog is missing', () => {
    renderPricing(null)
    expect(screen.getByText(/no currency or amount has been guessed/i)).toBeInTheDocument()
    expect(screen.queryByText(/\$14\.99|490,000/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Momentum membership', level: 2 })).not.toBeInTheDocument()
  })

  it('sends authenticated members to Me instead of a payment SDK', () => {
    renderPricing(intlMembershipCatalog, { authenticated: true, giftCampaign: 'available' })
    expect(screen.getByRole('link', { name: /view membership/i })).toHaveAttribute('href', '/en/app/me')
    expect(screen.getByRole('link', { name: /use the gift/i })).toHaveAttribute('href', '/en/onboarding/review')
    expect(screen.getByText(/live checkout is not enabled/i)).toBeInTheDocument()
  })
})
