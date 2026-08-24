import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { entitlementFixture } from '../../entitlement'
import { EntitlementGate } from './EntitlementGate'

function renderGate(snapshot = entitlementFixture()) {
  return render(
    <I18nProvider>
      <EntitlementGate locale="en" snapshot={snapshot} />
    </I18nProvider>,
  )
}

describe('EntitlementGate membership states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('LIFE-08 shows one offer and does not start checkout or generation', () => {
    renderGate(entitlementFixture({ membership: 'none' }))
    expect(screen.getByRole('heading', { name: /your first plan is a gift/i })).toBeInTheDocument()
    expect(screen.getByText(/no core\/pro ladder/i)).toBeInTheDocument()
    expect(screen.getByText(/not a 7-day trial/i)).toBeInTheDocument()
    expect(screen.getByText(/stripe and real charges stay out of scope/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate plan/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start membership/i })).toHaveAttribute('href', '/en/app/me')
    expect(screen.getByRole('link', { name: /view pricing/i })).toHaveAttribute('href', '/en/pricing')
  })

  it('LIFE-05 keeps the paid offer when the gift is exhausted', () => {
    renderGate(entitlementFixture({ giftCampaign: 'exhausted', membership: 'none' }))
    expect(screen.getByRole('heading', { name: /gift budget is currently exhausted/i })).toBeInTheDocument()
    expect(screen.getByText(/earlier reservations are not revoked/i)).toBeInTheDocument()
  })

  it('LIFE-10 blocks generation while payment is pending', () => {
    renderGate(entitlementFixture({ membership: 'pending' }))
    expect(screen.getByRole('heading', { name: /recover payment to continue/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /recover payment/i })).toHaveAttribute('href', '/en/app/me')
    expect(screen.getByText(/plan generation does not start until membership is confirmed/i)).toBeInTheDocument()
  })
})
