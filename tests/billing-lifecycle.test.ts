import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertNormalizedPaymentEvent,
  assertPaymentMarketAllowed,
  DisabledPaymentProvider,
  reduceBillingState,
  type NormalizedPaymentEvent,
} from '../supabase/functions/_shared/billing.ts'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => vi.unstubAllGlobals())

describe('R5 billing lifecycle', () => {
  it('is disabled by default and blocks Iran regardless of configuration', () => {
    env({})
    expect(() => assertPaymentMarketAllowed('US')).toThrow(expect.objectContaining({ code: 'PAYMENTS_DISABLED' }))
    env({ PAYMENTS_MASTER_ENABLED: 'true', PAYMENTS_ENABLED_MARKETS: 'US,IR' })
    expect(assertPaymentMarketAllowed('US')).toBe('US')
    expect(() => assertPaymentMarketAllowed('IR')).toThrow(expect.objectContaining({ code: 'PAYMENT_MARKET_BLOCKED' }))
  })

  it('reduces checkout, renewal failure, recovery, cancellation and expiry deterministically', () => {
    let state = reduceBillingState('none', 'checkout_started')
    state = reduceBillingState(state, 'checkout_completed')
    expect(state).toBe('active')
    state = reduceBillingState(state, 'invoice_failed')
    expect(state).toBe('past_due')
    state = reduceBillingState(state, 'invoice_paid')
    expect(state).toBe('active')
    state = reduceBillingState(state, 'subscription_cancelled')
    state = reduceBillingState(state, 'subscription_expired')
    expect(state).toBe('expired')
    expect(() => reduceBillingState('expired', 'invoice_paid'))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_TRANSITION_INVALID' }))
  })

  it('treats duplicate success as idempotent and disputes as suspension', () => {
    expect(reduceBillingState('active', 'invoice_paid')).toBe('active')
    expect(reduceBillingState('active', 'payment_disputed')).toBe('suspended')
  })

  it('validates normalized money and metadata without card or address fields', () => {
    const event: NormalizedPaymentEvent = {
      schemaVersion: '1.0.0', provider: 'sandbox', providerAccountId: 'acct_1',
      providerEventId: 'evt_1', providerObjectId: 'sub_1', eventType: 'invoice_paid',
      occurredAt: '2026-08-25T00:00:00.000Z', receivedAt: '2026-08-25T00:00:01.000Z',
      livemode: false, amountMinor: 999, currency: 'USD', countryCode: 'US',
      payloadDigest: 'a'.repeat(64),
    }
    expect(() => assertNormalizedPaymentEvent(event)).not.toThrow()
    expect(() => assertNormalizedPaymentEvent({ ...event, amountMinor: 1.2 }))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_AMOUNT_INVALID' }))
    expect(() => assertNormalizedPaymentEvent({ ...event, eventType: 'provider_specific' as never }))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_SCHEMA_INVALID' }))
    expect(() => assertNormalizedPaymentEvent({ ...event, livemode: 'yes' as never }))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_SCHEMA_INVALID' }))
  })

  it('has no accidental network path without a selected provider adapter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(new DisabledPaymentProvider().verifyAndNormalize(new Uint8Array(), new Headers()))
      .rejects.toMatchObject({ code: 'PAYMENTS_DISABLED' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
