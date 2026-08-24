import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

export type BillingState =
  | 'none'
  | 'method_required'
  | 'checkout_pending'
  | 'active'
  | 'past_due'
  | 'cancelled_pending'
  | 'expired'
  | 'suspended'

export type PaymentEventType =
  | 'method_recorded'
  | 'checkout_started'
  | 'checkout_completed'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'payment_refunded'
  | 'payment_disputed'

export interface NormalizedPaymentEvent {
  schemaVersion: '1.0.0'
  provider: string
  providerAccountId: string
  providerEventId: string
  providerObjectId: string
  eventType: PaymentEventType
  occurredAt: string
  receivedAt: string
  livemode: boolean
  amountMinor: number | null
  currency: string | null
  countryCode: string
  payloadDigest: string
}

export interface PaymentProviderAdapter {
  readonly name: string
  verifyAndNormalize(rawBody: Uint8Array, headers: Headers): Promise<NormalizedPaymentEvent>
}

function configuredCountries(): ReadonlySet<string> {
  return new Set(
    (optionalEnv('PAYMENTS_ENABLED_MARKETS') ?? '').split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^[A-Z]{2}$/.test(value)),
  )
}

export function assertPaymentMarketAllowed(countryCode: string | null | undefined): string {
  if (optionalEnv('PAYMENTS_MASTER_ENABLED')?.toLowerCase() !== 'true') {
    throw new HttpError(503, 'PAYMENTS_DISABLED', 'Payments are unavailable.')
  }
  const country = countryCode?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new HttpError(
      403,
      'PAYMENT_MARKET_UNVERIFIED',
      'Payments are unavailable in this market.',
    )
  }
  if (country === 'IR') {
    throw new HttpError(403, 'PAYMENT_MARKET_BLOCKED', 'Payments are unavailable in this market.')
  }
  if (!configuredCountries().has(country)) {
    throw new HttpError(
      403,
      'PAYMENT_MARKET_NOT_APPROVED',
      'Payments are unavailable in this market.',
    )
  }
  return country
}

export function reduceBillingState(state: BillingState, event: PaymentEventType): BillingState {
  const transitions: Partial<
    Record<BillingState, Partial<Record<PaymentEventType, BillingState>>>
  > = {
    none: { method_recorded: 'method_required', checkout_started: 'checkout_pending' },
    method_required: { method_recorded: 'method_required', checkout_started: 'checkout_pending' },
    checkout_pending: {
      checkout_completed: 'active',
      invoice_paid: 'active',
      invoice_failed: 'past_due',
      subscription_cancelled: 'cancelled_pending',
    },
    active: {
      invoice_paid: 'active',
      invoice_failed: 'past_due',
      subscription_cancelled: 'cancelled_pending',
      payment_refunded: 'suspended',
      payment_disputed: 'suspended',
    },
    past_due: {
      invoice_paid: 'active',
      invoice_failed: 'past_due',
      subscription_cancelled: 'cancelled_pending',
      subscription_expired: 'expired',
      payment_disputed: 'suspended',
    },
    cancelled_pending: {
      invoice_paid: 'cancelled_pending',
      subscription_expired: 'expired',
      payment_refunded: 'suspended',
    },
    expired: { checkout_started: 'checkout_pending' },
    suspended: { payment_refunded: 'suspended', payment_disputed: 'suspended' },
  }
  const next = transitions[state]?.[event]
  if (!next) {
    throw new HttpError(
      409,
      'PAYMENT_TRANSITION_INVALID',
      'The payment event is invalid for the current state.',
    )
  }
  return next
}

export function assertNormalizedPaymentEvent(value: NormalizedPaymentEvent): void {
  const eventTypes = new Set<PaymentEventType>([
    'method_recorded',
    'checkout_started',
    'checkout_completed',
    'invoice_paid',
    'invoice_failed',
    'subscription_cancelled',
    'subscription_expired',
    'payment_refunded',
    'payment_disputed',
  ])
  if (value.schemaVersion !== '1.0.0') {
    throw new HttpError(422, 'PAYMENT_SCHEMA_INVALID', 'Invalid payment event.')
  }
  if (!eventTypes.has(value.eventType)) {
    throw new HttpError(422, 'PAYMENT_SCHEMA_INVALID', 'Invalid payment event.')
  }
  if (typeof value.livemode !== 'boolean') {
    throw new HttpError(422, 'PAYMENT_SCHEMA_INVALID', 'Invalid payment event.')
  }
  if (
    !value.provider || !value.providerAccountId || !value.providerEventId || !value.providerObjectId
  ) {
    throw new HttpError(422, 'PAYMENT_SCHEMA_INVALID', 'Invalid payment event.')
  }
  if (!Number.isSafeInteger(value.amountMinor ?? 0) || (value.amountMinor ?? 0) < 0) {
    throw new HttpError(422, 'PAYMENT_AMOUNT_INVALID', 'Invalid payment amount.')
  }
  if (value.currency !== null && !/^[A-Z]{3}$/.test(value.currency)) {
    throw new HttpError(422, 'PAYMENT_CURRENCY_INVALID', 'Invalid payment currency.')
  }
  if (!/^[A-Z]{2}$/.test(value.countryCode) || !/^[a-f0-9]{64}$/.test(value.payloadDigest)) {
    throw new HttpError(422, 'PAYMENT_SCHEMA_INVALID', 'Invalid payment event.')
  }
  if (
    !Number.isFinite(Date.parse(value.occurredAt)) || !Number.isFinite(Date.parse(value.receivedAt))
  ) {
    throw new HttpError(422, 'PAYMENT_TIMESTAMP_INVALID', 'Invalid payment timestamp.')
  }
}

export class DisabledPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'disabled'

  verifyAndNormalize(_rawBody: Uint8Array, _headers: Headers): Promise<NormalizedPaymentEvent> {
    void _rawBody
    void _headers
    return Promise.reject(new HttpError(503, 'PAYMENTS_DISABLED', 'Payments are unavailable.'))
  }
}
