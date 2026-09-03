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

export type PaymentMarket = 'ir' | 'global'
export type PaymentCurrency = 'IRR' | 'USD'
export type PaymentProviderName = 'zarinpal' | 'stripe'

export interface PaymentRoute {
  countryCode: string
  market: PaymentMarket
  currency: PaymentCurrency
  provider: PaymentProviderName
}

export function resolvePaymentRoute(countryCode: string | null | undefined): PaymentRoute {
  const country = countryCode?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new HttpError(422, 'PAYMENT_COUNTRY_REQUIRED', 'Choose a valid billing country.')
  }
  const iranProvider = optionalEnv('IR_PAYMENT_PROVIDER')?.toLowerCase() ?? 'zarinpal'
  const internationalProvider = optionalEnv('INTERNATIONAL_PAYMENT_PROVIDER')?.toLowerCase() ??
    'stripe'
  if (iranProvider !== 'zarinpal' || internationalProvider !== 'stripe') {
    throw new HttpError(503, 'PAYMENT_PROVIDER_INVALID', 'Payment routing is unavailable.')
  }
  return country === 'IR'
    ? { countryCode: country, market: 'ir', currency: 'IRR', provider: iranProvider }
    : { countryCode: country, market: 'global', currency: 'USD', provider: internationalProvider }
}

export function assertPaymentMarketAllowed(countryCode: string | null | undefined): string {
  if (optionalEnv('PAYMENTS_MASTER_ENABLED')?.toLowerCase() !== 'true') {
    throw new HttpError(503, 'PAYMENTS_DISABLED', 'Payments are unavailable.')
  }
  return resolvePaymentRoute(countryCode).countryCode
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

/** Display toman → integer IRR (rials). 1 toman = 10 IRR. */
export function tomanDisplayToIrrMinor(toman: number): number {
  if (!Number.isSafeInteger(toman) || toman < 0) {
    throw new HttpError(422, 'PAYMENT_AMOUNT_INVALID', 'Invalid toman amount.')
  }
  return toman * 10
}

export function assertSandboxLivemode(livemode: boolean): void {
  if (livemode) {
    throw new HttpError(409, 'PAYMENT_LIVEMODE_MISMATCH', 'Sandbox adapters reject live payment events.')
  }
}

export interface WebhookInboxStore {
  has(providerEventId: string): boolean | Promise<boolean>
  remember(providerEventId: string, payloadDigest: string): void | Promise<void>
}

export async function acceptWebhookOnce(
  store: WebhookInboxStore,
  event: NormalizedPaymentEvent,
): Promise<'accepted' | 'duplicate'> {
  assertNormalizedPaymentEvent(event)
  if (await store.has(event.providerEventId)) return 'duplicate'
  await store.remember(event.providerEventId, event.payloadDigest)
  return 'accepted'
}

function digestHex(rawBody: Uint8Array): string {
  // Deterministic non-crypto digest for sandbox tests; production adapters replace with provider signatures.
  let hash = 0n
  for (const byte of rawBody) hash = (hash * 131n + BigInt(byte)) % (2n ** 256n)
  return hash.toString(16).padStart(64, '0').slice(0, 64)
}

function parseJsonBody(rawBody: Uint8Array): Record<string, unknown> {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(rawBody)) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'PAYMENT_PAYLOAD_INVALID', 'Payment webhook payload is invalid.')
  }
}

/**
 * Stripe sandbox adapter: signature header required, livemode must be false.
 * Recurring/tokenization is supported by Stripe; this adapter only verifies webhooks.
 */
export class StripeSandboxAdapter implements PaymentProviderAdapter {
  readonly name = 'stripe'

  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret.trim()) {
      throw new HttpError(503, 'PAYMENT_PROVIDER_UNCONFIGURED', 'Stripe sandbox webhook secret is missing.')
    }
  }

  async verifyAndNormalize(rawBody: Uint8Array, headers: Headers): Promise<NormalizedPaymentEvent> {
    const signature = headers.get('stripe-signature') ?? headers.get('Stripe-Signature')
    if (!signature || !signature.includes(this.webhookSecret)) {
      throw new HttpError(401, 'PAYMENT_SIGNATURE_INVALID', 'Stripe webhook signature is invalid.')
    }
    const body = parseJsonBody(rawBody)
    const livemode = body.livemode === true
    assertSandboxLivemode(livemode)
    const dataObject = (body.data && typeof body.data === 'object' && !Array.isArray(body.data))
      ? body.data as Record<string, unknown>
      : {}
    const object = (dataObject.object && typeof dataObject.object === 'object' && !Array.isArray(dataObject.object))
      ? dataObject.object as Record<string, unknown>
      : {}
    const eventType = mapStripeEventType(String(body.type ?? ''))
    const amountMinor = typeof object.amount_paid === 'number'
      ? object.amount_paid
      : typeof object.amount === 'number'
        ? object.amount
        : null
    const currency = typeof object.currency === 'string' ? object.currency.toUpperCase() : 'USD'
    const event: NormalizedPaymentEvent = {
      schemaVersion: '1.0.0',
      provider: 'stripe',
      providerAccountId: String(body.account ?? object.customer ?? 'acct_sandbox'),
      providerEventId: String(body.id ?? ''),
      providerObjectId: String(object.id ?? body.id ?? ''),
      eventType,
      occurredAt: new Date(Number(body.created ?? 0) * 1000 || Date.now()).toISOString(),
      receivedAt: new Date().toISOString(),
      livemode: false,
      amountMinor,
      currency,
      countryCode: String(object.country ?? body.country ?? 'US').toUpperCase(),
      payloadDigest: digestHex(rawBody),
    }
    assertNormalizedPaymentEvent(event)
    return event
  }
}

function mapStripeEventType(type: string): PaymentEventType {
  switch (type) {
    case 'checkout.session.completed':
      return 'checkout_completed'
    case 'invoice.paid':
      return 'invoice_paid'
    case 'invoice.payment_failed':
      return 'invoice_failed'
    case 'customer.subscription.deleted':
      return 'subscription_cancelled'
    case 'charge.refunded':
      return 'payment_refunded'
    case 'charge.dispute.created':
      return 'payment_disputed'
    default:
      throw new HttpError(422, 'PAYMENT_EVENT_UNSUPPORTED', 'Stripe event type is unsupported.')
  }
}

/**
 * Zarinpal sandbox adapter: authority callback verification.
 * Zarinpal does not provide Stripe-equivalent recurring tokenization; subscription
 * renewal events that imply provider-managed recurring billing are rejected explicitly.
 */
export class ZarinpalSandboxAdapter implements PaymentProviderAdapter {
  readonly name = 'zarinpal'

  constructor(private readonly merchantId: string) {
    if (!merchantId.trim()) {
      throw new HttpError(503, 'PAYMENT_PROVIDER_UNCONFIGURED', 'Zarinpal sandbox merchant id is missing.')
    }
  }

  async verifyAndNormalize(rawBody: Uint8Array, headers: Headers): Promise<NormalizedPaymentEvent> {
    void headers
    const body = parseJsonBody(rawBody)
    if (String(body.merchant_id ?? '') !== this.merchantId) {
      throw new HttpError(401, 'PAYMENT_SIGNATURE_INVALID', 'Zarinpal merchant mismatch.')
    }
    if (body.livemode === true) {
      assertSandboxLivemode(true)
    }
    if (body.recurring === true || body.tokenized_renewal === true) {
      throw new HttpError(
        422,
        'PAYMENT_CAPABILITY_UNSUPPORTED',
        'Zarinpal sandbox does not support provider-managed recurring tokenization.',
      )
    }
    const status = String(body.status ?? '')
    const eventType: PaymentEventType = status === 'OK' || status === 'paid'
      ? 'checkout_completed'
      : status === 'NOK' || status === 'failed'
        ? 'invoice_failed'
        : (() => {
          throw new HttpError(422, 'PAYMENT_EVENT_UNSUPPORTED', 'Zarinpal status is unsupported.')
        })()
    const amountToman = Number(body.amount ?? body.Amount ?? 0)
    const amountMinor = tomanDisplayToIrrMinor(amountToman)
    const event: NormalizedPaymentEvent = {
      schemaVersion: '1.0.0',
      provider: 'zarinpal',
      providerAccountId: this.merchantId,
      providerEventId: String(body.authority ?? body.Authority ?? ''),
      providerObjectId: String(body.ref_id ?? body.RefID ?? body.authority ?? ''),
      eventType,
      occurredAt: String(body.occurred_at ?? new Date().toISOString()),
      receivedAt: new Date().toISOString(),
      livemode: false,
      amountMinor,
      currency: 'IRR',
      countryCode: 'IR',
      payloadDigest: digestHex(rawBody),
    }
    assertNormalizedPaymentEvent(event)
    return event
  }
}

export function createPaymentAdapter(provider: PaymentProviderName): PaymentProviderAdapter {
  if (optionalEnv('PAYMENTS_MASTER_ENABLED')?.toLowerCase() !== 'true') {
    return new DisabledPaymentProvider()
  }
  if (provider === 'stripe') {
    return new StripeSandboxAdapter(optionalEnv('STRIPE_WEBHOOK_SECRET') ?? '')
  }
  return new ZarinpalSandboxAdapter(optionalEnv('ZARINPAL_MERCHANT_ID') ?? '')
}
