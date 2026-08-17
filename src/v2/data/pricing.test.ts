import { describe, expect, it } from 'vitest'
import { intlMembershipCatalog, irMembershipCatalog } from '../entitlement'
import { formatPrice, giftCampaignFromContext, membershipPriceFromContext } from './pricing'

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
})
