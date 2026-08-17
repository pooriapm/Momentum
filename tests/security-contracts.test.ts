import { describe, expect, it } from 'vitest'
import { requireIdempotencyKey } from '../supabase/functions/_shared/http.ts'
import {
  assertAiJurisdiction,
  productRegionFromCountry,
} from '../supabase/functions/_shared/jurisdiction.ts'

describe('jurisdiction and idempotency boundaries', () => {
  it('treats Iran as a served product region, not a geo-block', () => {
    expect(productRegionFromCountry('IR')).toBe('ir')
    expect(() => assertAiJurisdiction('IR', '2026-08-09T00:00:00.000Z', 'admin_review'))
      .not.toThrow()
  })

  it('maps every other ISO country to the international product version', () => {
    expect(productRegionFromCountry('US')).toBe('intl')
    expect(productRegionFromCountry('GB')).toBe('intl')
  })

  it('still requires a complete billing-country verification tuple', () => {
    expect(() => assertAiJurisdiction('US', null, 'payment_provider'))
      .toThrow(expect.objectContaining({ code: 'verified_country_required', status: 409 }))
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
