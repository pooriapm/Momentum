import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireIdempotencyKey } from '../supabase/functions/_shared/http.ts'
import { assertAiJurisdiction } from '../supabase/functions/_shared/jurisdiction.ts'

beforeEach(() => {
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) => name === 'AI_ALLOWED_BILLING_COUNTRIES' ? 'US,CA' : undefined,
    },
  })
})

describe('jurisdiction and idempotency boundaries', () => {
  it('denies Iran even when verification fields are otherwise complete', () => {
    expect(() => assertAiJurisdiction('IR', '2026-08-09T00:00:00.000Z', 'admin_review'))
      .toThrow(expect.objectContaining({ code: 'ai_unavailable_in_region', status: 403 }))
  })

  it('denies a verified but unsupported billing country', () => {
    expect(() => assertAiJurisdiction('GB', '2026-08-09T00:00:00.000Z', 'admin_review'))
      .toThrow(expect.objectContaining({ code: 'ai_unavailable_in_region', status: 403 }))
  })

  it('accepts only configured, verified billing countries', () => {
    expect(() => assertAiJurisdiction('US', '2026-08-09T00:00:00.000Z', 'payment_provider'))
      .not.toThrow()
  })

  it('rejects missing, short, or unsafe idempotency keys', () => {
    for (const key of [undefined, 'short', 'unsafe key', 'x'.repeat(129)]) {
      const headers = key ? { 'Idempotency-Key': key } : undefined
      expect(() => requireIdempotencyKey(new Request('https://example.test', { headers })))
        .toThrow(expect.objectContaining({ code: 'invalid_idempotency_key' }))
    }
  })

  it('normalizes a valid idempotency key without changing its identity', () => {
    const request = new Request('https://example.test', {
      headers: { 'Idempotency-Key': '  revision:request-01  ' },
    })
    expect(requireIdempotencyKey(request)).toBe('revision:request-01')
  })
})
