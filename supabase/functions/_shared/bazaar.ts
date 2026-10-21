import { optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'

// Cafe Bazaar developer API ("Pardakht"). The Android app buys a consumable
// in-app product with Poolakey and sends the purchase token here; the server
// validates it with Bazaar before granting anything, then the app consumes it.
//
// Auth: the current method is a per-app Pishkhan API token ("API پیشخان بازار" →
// "دریافت توکن جدید") sent as the CAFEBAZAAR-PISHKHAN-API-SECRET header on every
// request. When BAZAAR_PISHKHAN_API_SECRET is unset, the legacy OAuth refresh-token
// flow (BAZAAR_CLIENT_ID / BAZAAR_CLIENT_SECRET / BAZAAR_REFRESH_TOKEN) is used.
// The API allows 50,000 requests per day. Never log tokens or purchase tokens.
function bazaarBase(): string {
  return (optionalEnv('BAZAAR_API_BASE_URL') ?? 'https://pardakht.cafebazaar.ir/devapi/v2').replace(
    /\/$/,
    '',
  )
}

let cachedToken: { value: string; expiresAt: number } | null = null

/** Test hook: forget the cached legacy OAuth access token. */
export function resetBazaarAuthCache() {
  cachedToken = null
}

async function legacyAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: requiredEnv('BAZAAR_CLIENT_ID'),
    client_secret: requiredEnv('BAZAAR_CLIENT_SECRET'),
    refresh_token: requiredEnv('BAZAAR_REFRESH_TOKEN'),
  })
  let response: Response
  try {
    response = await fetch(`${bazaarBase()}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new HttpError(503, 'store_unreachable', 'Cafe Bazaar is unreachable.')
  }
  const body = await response.json().catch(() => null) as {
    access_token?: string
    expires_in?: number
  } | null
  if (!response.ok || !body?.access_token) {
    throw new HttpError(503, 'store_auth_failed', 'Cafe Bazaar credentials were rejected.')
  }
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return body.access_token
}

async function authHeaders(): Promise<Record<string, string>> {
  const secret = optionalEnv('BAZAAR_PISHKHAN_API_SECRET')
  if (secret) return { 'CAFEBAZAAR-PISHKHAN-API-SECRET': secret }
  return { Authorization: `Bearer ${await legacyAccessToken()}` }
}

export type BazaarValidation =
  | { ok: true; orderReference: string; developerPayload: string | null }
  | { ok: false; reason: 'not_found' | 'refunded' | 'already_consumed' }

/**
 * Validates an unconsumed purchase. Callers must first short-circuit tokens that
 * already have a paid row: the app consumes only after the server grants, so a
 * purchase Bazaar reports as consumed with no paid row here was consumed
 * elsewhere (a replayed token) and is rejected as `already_consumed`.
 */
export async function validateBazaarPurchase(
  productId: string,
  purchaseToken: string,
): Promise<BazaarValidation> {
  const packageName = requiredEnv('BAZAAR_PACKAGE_NAME')
  const url = `${bazaarBase()}/api/validate/${encodeURIComponent(packageName)}/inapp/${
    encodeURIComponent(productId)
  }/purchases/${encodeURIComponent(purchaseToken)}/`
  const headers = { ...(await authHeaders()), Accept: 'application/json' }
  let response: Response
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  } catch {
    throw new HttpError(503, 'store_unreachable', 'Cafe Bazaar is unreachable.')
  }
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(503, 'store_auth_failed', 'Cafe Bazaar credentials were rejected.')
  }
  const body = await response.json().catch(() => null) as {
    error?: string
    purchaseState?: number
    consumptionState?: number
    developerPayload?: string
    purchaseTime?: number
  } | null
  if (response.status === 404) {
    // invalid_value = wrong package or product id: our configuration, not the buyer.
    if (body?.error === 'invalid_value') {
      throw new HttpError(503, 'store_misconfigured', 'Cafe Bazaar purchases are misconfigured.')
    }
    return { ok: false, reason: 'not_found' }
  }
  if (!response.ok || !body) {
    throw new HttpError(502, 'store_invalid_response', 'Cafe Bazaar answered unexpectedly.')
  }
  // purchaseState 0 = purchased, 1 = refunded.
  if (body.purchaseState !== 0) return { ok: false, reason: 'refunded' }
  // consumptionState 0 = consumed, 1 = not consumed.
  if (body.consumptionState === 0) return { ok: false, reason: 'already_consumed' }
  if (body.consumptionState !== 1) {
    throw new HttpError(502, 'store_invalid_response', 'Cafe Bazaar answered unexpectedly.')
  }
  return {
    ok: true,
    orderReference: `bazaar:${body.purchaseTime ?? 'unknown'}`,
    developerPayload: typeof body.developerPayload === 'string' ? body.developerPayload : null,
  }
}
