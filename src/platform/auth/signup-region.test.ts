import { describe, expect, it, vi } from 'vitest'
import { loadPricingContext } from '../../v2/data/pricing'
import { resolveSignupRegion } from './signup-region'

vi.mock('../../v2/data/pricing', () => ({
  loadPricingContext: vi.fn(),
}))

const mockedLoadPricingContext = vi.mocked(loadPricingContext)

describe('resolveSignupRegion', () => {
  it('records the Iranian payment route from geo-context without choosing UI language', async () => {
    mockedLoadPricingContext.mockResolvedValueOnce({
      ai_service_available: true,
      authoritative_for_checkout: false,
      country: 'IR',
      prices: [],
      source: 'edge_hint',
      suggested_cuisine_region: 'iran',
      suggested_currency: 'IRR',
      suggested_locale: 'fa-IR',
      suggested_market: 'ir',
      suggested_product_region: 'ir',
    })

    await expect(resolveSignupRegion('en')).resolves.toEqual({
      countryCode: 'IR',
      productRegion: 'ir',
      source: 'ip_at_signup',
    })
  })

  it('does not infer payment country from language when geo-context is unavailable', async () => {
    mockedLoadPricingContext.mockRejectedValueOnce(new Error('offline'))
    await expect(resolveSignupRegion('fa')).resolves.toEqual({
      countryCode: null,
      productRegion: 'intl',
      source: 'ip_at_signup',
    })
  })
})
