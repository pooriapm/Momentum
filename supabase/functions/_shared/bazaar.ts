import { optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'

// Cafe Bazaar developer API ("Pardakht"). The Android app buys a consumable
// in-app product with Poolakey and sends the purchase token here; the server
// validates it with Bazaar before granting anything, then the app consumes it.
// Confirm the endpoints against the current Bazaar developer docs when the
// panel credentials are created; the base URL is configurable for that reason.
function bazaarBase(): string {
  return (optionalEnv('BAZAAR_API_BASE_URL') ?? 'https://pardakht.cafebazaar.ir/devapi/v2').replace(
    /\/$/,
    '',
  )
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function accessToken(): Promise<string> {
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

export type BazaarValidation =
  | { ok: true; orderReference: string; developerPayload: string | null }
  | { ok: false; reason: 'not_found' | 'refunded' }

export async function validateBazaarPurchase(
  productId: string,
  purchaseToken: string,
): Promise<BazaarValidation> {
  const packageName = requiredEnv('BAZAAR_PACKAGE_NAME')
  const url = `${bazaarBase()}/api/validate/${encodeURIComponent(packageName)}/inapp/${
    encodeURIComponent(productId)
  }/purchases/${encodeURIComponent(purchaseToken)}/`
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new HttpError(503, 'store_unreachable', 'Cafe Bazaar is unreachable.')
  }
  if (response.status === 404) return { ok: false, reason: 'not_found' }
  const body = await response.json().catch(() => null) as {
    purchaseState?: number
    consumptionState?: number
    developerPayload?: string
    purchaseTime?: number
  } | null
  if (!response.ok || !body) {
    throw new HttpError(502, 'store_invalid_response', 'Cafe Bazaar answered unexpectedly.')
  }
  // purchaseState 0 = purchased, 1 = refunded.
  if (body.purchaseState !== 0) return { ok: false, reason: 'refunded' }
  return {
    ok: true,
    orderReference: `bazaar:${body.purchaseTime ?? 'unknown'}`,
    developerPayload: typeof body.developerPayload === 'string' ? body.developerPayload : null,
  }
}
