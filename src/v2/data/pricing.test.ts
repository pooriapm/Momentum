import { afterEach, describe, expect, it, vi } from 'vitest'
import { intlMembershipCatalog, irMembershipCatalog } from '../entitlement'
import {
  formatPrice,
  giftCampaignFromContext,
  membershipPriceFromContext,
  suggestedLocaleFromContext,
  loadPricingContext,
} from './pricing'

afterEach(() => vi.unstubAllGlobals())

describe('pricing catalog helpers', () => {
  it('reads the single membership SKU and does not invent a price', () => {
    expect(membershipPriceFromContext(null)).toBeNull()
    expect(membershipPriceFromContext(intlMembershipCatalog)?.amount_minor).toBe(1499)
    expect(formatPrice(1499, 'USD', 'en')).toContain('14.99')
    expect(formatPrice(4_900_000, 'IRR', 'en')).toMatch(/490,000/)
  })

  it('treats missing campaign payload as unknown instead of a client-side budget', () => {
    expect(giftCampaignFromContext(intlMembershipCatalog)).toBe('unknown')
    expect(giftCampaignFromContext({ ...irMembershipCatalog, gift_campaign: { status: 'exhausted' } })).toBe('exhausted')
  })

  it('uses IP context only as an initial locale suggestion', () => {
    expect(suggestedLocaleFromContext({
      ...intlMembershipCatalog,
      suggested_locale: 'fa-IR',
    }, 'en')).toBe('fa')
    expect(suggestedLocaleFromContext(null, 'en')).toBe('en')
  })

  it('passes cancellation through to the geo request', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    vi.stubGlobal('fetch', fetchMock)
    const request = loadPricingContext(undefined, controller.signal)
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ signal: controller.signal }))
  })
})
