import { optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'

// Zarinpal REST v4. Sandbox and production share the same contract; only the
// host differs. Amounts are sent in IRR (rial) to match product_prices.
function zarinpalHost(): string {
  return optionalEnv('ZARINPAL_SANDBOX')?.toLowerCase() === 'true'
    ? 'https://sandbox.zarinpal.com'
    : 'https://payment.zarinpal.com'
}

interface ZarinpalEnvelope {
  data?: { code?: number; authority?: string; ref_id?: number | string } | unknown[]
  errors?: { code?: number; message?: string } | unknown[]
}

async function post(path: string, body: Record<string, unknown>): Promise<ZarinpalEnvelope> {
  let response: Response
  try {
    response = await fetch(`${zarinpalHost()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new HttpError(503, 'gateway_unreachable', 'The payment gateway is unreachable.')
  }
  // Zarinpal answers business errors with 4xx and a JSON body, so parse first.
  try {
    return await response.json() as ZarinpalEnvelope
  } catch {
    throw new HttpError(
      502,
      'gateway_invalid_response',
      'The payment gateway answered unexpectedly.',
    )
  }
}

function dataOf(envelope: ZarinpalEnvelope) {
  return envelope.data && !Array.isArray(envelope.data) ? envelope.data : {}
}

export interface ZarinpalCheckout {
  authority: string
  redirectUrl: string
}

export async function requestZarinpalPayment(input: {
  amountIrr: number
  callbackUrl: string
  description: string
  email?: string
}): Promise<ZarinpalCheckout> {
  const envelope = await post('/pg/v4/payment/request.json', {
    merchant_id: requiredEnv('ZARINPAL_MERCHANT_ID'),
    amount: input.amountIrr,
    currency: 'IRR',
    callback_url: input.callbackUrl,
    description: input.description,
    metadata: input.email ? { email: input.email } : {},
  })
  const data = dataOf(envelope)
  if (data.code !== 100 || typeof data.authority !== 'string' || !data.authority) {
    throw new HttpError(502, 'gateway_request_rejected', 'The payment could not be started.')
  }
  return {
    authority: data.authority,
    redirectUrl: `${zarinpalHost()}/pg/StartPay/${encodeURIComponent(data.authority)}`,
  }
}

export type ZarinpalVerification =
  | { ok: true; refId: string }
  | { ok: false; code: number | null }

export async function verifyZarinpalPayment(
  authority: string,
  amountIrr: number,
): Promise<ZarinpalVerification> {
  const envelope = await post('/pg/v4/payment/verify.json', {
    merchant_id: requiredEnv('ZARINPAL_MERCHANT_ID'),
    amount: amountIrr,
    authority,
  })
  const data = dataOf(envelope)
  // 100 = verified now, 101 = already verified by an earlier callback.
  if ((data.code === 100 || data.code === 101) && data.ref_id !== undefined) {
    return { ok: true, refId: String(data.ref_id) }
  }
  return { ok: false, code: typeof data.code === 'number' ? data.code : null }
}
