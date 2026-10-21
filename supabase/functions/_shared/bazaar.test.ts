import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBazaarAuthCache, validateBazaarPurchase } from './bazaar.ts'

const PRODUCT = 'momentum_month'
const TOKEN = 'purchase-token-123'
const USER = '00000000-0000-4000-8000-000000000001'
const VALIDATE_URL =
  `https://pardakht.cafebazaar.ir/devapi/v2/api/validate/com.pooriapm.momentum/inapp/${PRODUCT}/purchases/${TOKEN}/`

function stubEnv(values: Record<string, string>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

const headerEnv = {
  BAZAAR_PACKAGE_NAME: 'com.pooriapm.momentum',
  BAZAAR_PISHKHAN_API_SECRET: 'pishkhan-secret',
}
const legacyEnv = {
  BAZAAR_PACKAGE_NAME: 'com.pooriapm.momentum',
  BAZAAR_CLIENT_ID: 'client',
  BAZAAR_CLIENT_SECRET: 'client-secret',
  BAZAAR_REFRESH_TOKEN: 'refresh',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const purchase = (overrides: Record<string, unknown> = {}) => ({
  consumptionState: 1,
  purchaseState: 0,
  developerPayload: USER,
  purchaseTime: 1_760_000_000_000,
  ...overrides,
})

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetBazaarAuthCache()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Bazaar purchase validation', () => {
  it('sends the Pishkhan API token as a header with no OAuth exchange', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(200, purchase()))

    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toEqual({
      ok: true,
      orderReference: 'bazaar:1760000000000',
      developerPayload: USER,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(VALIDATE_URL)
    const headers = init.headers as Record<string, string>
    expect(headers['CAFEBAZAAR-PISHKHAN-API-SECRET']).toBe('pishkhan-secret')
    expect(headers.Authorization).toBeUndefined()
  })

  it('falls back to the legacy refresh-token flow without the API token', async () => {
    stubEnv(legacyEnv)
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'access-1', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, purchase()))
      .mockResolvedValueOnce(json(200, purchase()))

    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toMatchObject({ ok: true })
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toMatchObject({ ok: true })

    // The access token is cached: one exchange, two validations.
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [authUrl, authInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(authUrl).toBe('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/')
    expect(String(authInit.body)).toContain('grant_type=refresh_token')
    const headers = (fetchMock.mock.calls[1] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >
    expect(headers.Authorization).toBe('Bearer access-1')
    expect(headers['CAFEBAZAAR-PISHKHAN-API-SECRET']).toBeUndefined()
  })

  it('reports rejected legacy credentials as a store auth failure', async () => {
    stubEnv(legacyEnv)
    fetchMock.mockResolvedValueOnce(json(401, { error: 'invalid_grant' }))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).rejects.toMatchObject({
      status: 503,
      code: 'store_auth_failed',
    })
  })

  it('reports a rejected API token as a store auth failure', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(401, { error: 'unauthorized' }))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).rejects.toMatchObject({
      status: 503,
      code: 'store_auth_failed',
    })
  })

  it('rejects a refunded purchase', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(200, purchase({ purchaseState: 1 })))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'refunded',
    })
  })

  it('treats 404 not_found as a purchase that was never made', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(404, { error: 'not_found' }))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('treats 404 invalid_value as a server misconfiguration, not a missing purchase', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(
      json(404, { error: 'invalid_value', error_description: 'Product is not found.' }),
    )
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).rejects.toMatchObject({
      status: 503,
      code: 'store_misconfigured',
    })
  })

  it('rejects a purchase Bazaar already reports as consumed (replayed token)', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(200, purchase({ consumptionState: 0 })))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'already_consumed',
    })
  })

  it('rejects an answer without a known consumption state', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(200, purchase({ consumptionState: undefined })))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).rejects.toMatchObject({
      status: 502,
      code: 'store_invalid_response',
    })
  })

  it('returns a null payload when Bazaar omits it so the caller rejects the claim', async () => {
    stubEnv(headerEnv)
    fetchMock.mockResolvedValueOnce(json(200, purchase({ developerPayload: undefined })))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).resolves.toMatchObject({
      ok: true,
      developerPayload: null,
    })
  })

  it('maps a network failure to store_unreachable', async () => {
    stubEnv(headerEnv)
    fetchMock.mockRejectedValueOnce(new TypeError('network down'))
    await expect(validateBazaarPurchase(PRODUCT, TOKEN)).rejects.toMatchObject({
      status: 503,
      code: 'store_unreachable',
    })
  })
})
