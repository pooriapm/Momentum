import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  acceptWebhookOnce,
  assertPaymentMarketAllowed,
  createPaymentAdapter,
  DisabledPaymentProvider,
  resolvePaymentRoute,
  reduceBillingState,
  StripeSandboxAdapter,
  tomanDisplayToIrrMinor,
  ZarinpalSandboxAdapter,
  type NormalizedPaymentEvent,
  assertNormalizedPaymentEvent,
} from '../supabase/functions/_shared/billing.ts'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => vi.unstubAllGlobals())

describe('R5 billing lifecycle', () => {
  it('is disabled by default without restricting any valid country', () => {
    env({})
    expect(() => assertPaymentMarketAllowed('US')).toThrow(expect.objectContaining({ code: 'PAYMENTS_DISABLED' }))
    env({ PAYMENTS_MASTER_ENABLED: 'true' })
    expect(assertPaymentMarketAllowed('US')).toBe('US')
    expect(assertPaymentMarketAllowed('IR')).toBe('IR')
  })

  it('routes Iran to Zarinpal/IRR and every other country to Stripe/USD', () => {
    env({})
    expect(resolvePaymentRoute('ir')).toEqual({
      countryCode: 'IR', market: 'ir', currency: 'IRR', provider: 'zarinpal',
    })
    expect(resolvePaymentRoute('DE')).toEqual({
      countryCode: 'DE', market: 'global', currency: 'USD', provider: 'stripe',
    })
    expect(() => resolvePaymentRoute(null))
      .toThrow(expect.objectContaining({ code: 'PAYMENT_COUNTRY_REQUIRED' }))
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

  it('converts display toman to integer IRR and verifies Stripe sandbox webhooks', async () => {
    expect(tomanDisplayToIrrMinor(149_000)).toBe(1_490_000)
    const adapter = new StripeSandboxAdapter('whsec_test')
    const raw = new TextEncoder().encode(JSON.stringify({
      id: 'evt_sandbox_1',
      type: 'invoice.paid',
      livemode: false,
      created: 1_725_000_000,
      data: { object: { id: 'in_1', amount_paid: 1499, currency: 'usd', customer: 'cus_1' } },
    }))
    const event = await adapter.verifyAndNormalize(raw, new Headers({ 'stripe-signature': 't=1,whsec_test' }))
    expect(event).toMatchObject({
      provider: 'stripe',
      eventType: 'invoice_paid',
      amountMinor: 1499,
      currency: 'USD',
      livemode: false,
    })
    await expect(adapter.verifyAndNormalize(raw, new Headers({ 'stripe-signature': 'bad' })))
      .rejects.toMatchObject({ code: 'PAYMENT_SIGNATURE_INVALID' })
  })

  it('verifies Zarinpal sandbox callbacks and rejects fake recurring capability', async () => {
    const adapter = new ZarinpalSandboxAdapter('merchant-sandbox')
    const raw = new TextEncoder().encode(JSON.stringify({
      merchant_id: 'merchant-sandbox',
      authority: 'A00000000000000000000000000000000000',
      status: 'OK',
      amount: 14900,
      ref_id: 123456,
    }))
    const event = await adapter.verifyAndNormalize(raw, new Headers())
    expect(event.currency).toBe('IRR')
    expect(event.amountMinor).toBe(149_000)
    expect(event.eventType).toBe('checkout_completed')

    await expect(adapter.verifyAndNormalize(
      new TextEncoder().encode(JSON.stringify({
        merchant_id: 'merchant-sandbox',
        authority: 'A1',
        status: 'OK',
        amount: 100,
        recurring: true,
      })),
      new Headers(),
    )).rejects.toMatchObject({ code: 'PAYMENT_CAPABILITY_UNSUPPORTED' })
  })

  it('deduplicates webhook inbox events and keeps master switch fail-closed', async () => {
    env({})
    expect(createPaymentAdapter('stripe')).toBeInstanceOf(DisabledPaymentProvider)

    const seen = new Map<string, string>()
    const store = {
      has: (id: string) => seen.has(id),
      remember: (id: string, digest: string) => { seen.set(id, digest) },
    }
    const event: NormalizedPaymentEvent = {
      schemaVersion: '1.0.0',
      provider: 'stripe',
      providerAccountId: 'acct_1',
      providerEventId: 'evt_dup',
      providerObjectId: 'in_1',
      eventType: 'invoice_paid',
      occurredAt: '2026-09-03T00:00:00.000Z',
      receivedAt: '2026-09-03T00:00:01.000Z',
      livemode: false,
      amountMinor: 1499,
      currency: 'USD',
      countryCode: 'US',
      payloadDigest: 'b'.repeat(64),
    }
    expect(await acceptWebhookOnce(store, event)).toBe('accepted')
    expect(await acceptWebhookOnce(store, event)).toBe('duplicate')
  })
})
