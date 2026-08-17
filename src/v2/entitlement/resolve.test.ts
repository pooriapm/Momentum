import { describe, expect, it } from 'vitest'
import { entitlementFixture } from './fixtures'
import {
  appContentSurface,
  isEntitledForGeneration,
  isMembershipRequiredTab,
  isSetupAllowedTab,
  mapEntitlementStatus,
  paywallInventoryId,
  postOnboardingPath,
  pricingInventoryIds,
  reviewInventoryIds,
} from './resolve'

describe('entitlement routing', () => {
  it('lets Me stay reachable for setup while Today/Plan/Progress require membership', () => {
    expect(isSetupAllowedTab('me')).toBe(true)
    expect(isMembershipRequiredTab('today')).toBe(true)
    expect(isMembershipRequiredTab('plan')).toBe(true)
    expect(isMembershipRequiredTab('progress')).toBe(true)
    expect(isSetupAllowedTab('today')).toBe(false)
  })

  it('lands review on Today so 3C wait can own generation UX', () => {
    expect(postOnboardingPath('en')).toBe('/en/app/today')
    expect(postOnboardingPath('fa')).toBe('/fa/app/today')
  })

  it('shows the paywall on membership-required tabs when onboarding is done and there is no plan', () => {
    const none = entitlementFixture({ membership: 'none' })
    expect(appContentSurface('today', none)).toBe('entitlement')
    expect(appContentSurface('plan', none)).toBe('entitlement')
    expect(appContentSurface('progress', none)).toBe('entitlement')
    expect(appContentSurface('me', none)).toBe('children')
  })

  it('keeps a saved plan readable after expiry and blocks a new cycle', () => {
    const expired = entitlementFixture({ hasSavedPlan: true, membership: 'expired' })
    expect(appContentSurface('today', expired)).toBe('children')
    expect(isEntitledForGeneration(expired)).toBe(false)
    expect(paywallInventoryId(expired)).toBe('LIFE-11')
  })

  it('sends entitled accounts without a plan to the existing Today wait/ready surface', () => {
    const gift = entitlementFixture({ membership: 'gift', paymentMethod: 'recorded' })
    expect(isEntitledForGeneration(gift)).toBe(true)
    expect(appContentSurface('today', gift)).toBe('preplan')
    expect(appContentSurface('me', gift)).toBe('children')
  })

  it('continues onboarding instead of the paywall when setup is incomplete', () => {
    const started = entitlementFixture({ membership: 'none', onboardingStatus: 'started' })
    expect(appContentSurface('today', started)).toBe('preplan')
    expect(isEntitledForGeneration(started)).toBe(false)
  })
})

describe('one-SKU membership mapping', () => {
  it('maps gift vs paid vs pending vs expired vs none without a trial SKU', () => {
    expect(mapEntitlementStatus(null)).toBe('none')
    expect(mapEntitlementStatus({ entitlement: { source: 'gift', status: 'reserved' } })).toBe('gift')
    expect(mapEntitlementStatus({ entitlement: { source: 'subscription', status: 'active' } })).toBe('active')
    expect(mapEntitlementStatus({ entitlement: { source: 'subscription', status: 'past_due' } })).toBe('pending')
    expect(mapEntitlementStatus({ entitlement: { source: 'subscription', status: 'canceled' } })).toBe('expired')
  })

  it('does not treat a 7-day trial source as a distinct product', () => {
    expect(mapEntitlementStatus({ entitlement: { source: 'trial', status: 'active' } })).toBe('active')
  })
})

describe('inventory IDs', () => {
  it('keeps LIFE-08 as the missing-method / no-membership paywall', () => {
    expect(paywallInventoryId(entitlementFixture({ membership: 'none' }))).toBe('LIFE-08')
    expect(paywallInventoryId(entitlementFixture({ membership: 'pending' }))).toBe('LIFE-10')
    expect(paywallInventoryId(entitlementFixture({ giftCampaign: 'exhausted', membership: 'none' }))).toBe('LIFE-05')
  })

  it('annotates review with gift, Iranian version, and payment-method IDs', () => {
    expect(reviewInventoryIds({
      automationBlocked: false,
      giftCampaign: 'available',
      membership: 'none',
      productRegion: 'ir',
    })).toEqual(['LIFE-01', 'LIFE-08', 'LIFE-06', 'LIFE-02'])
  })

  it('maps public pricing states without guessing a catalog on error', () => {
    expect(pricingInventoryIds({ unavailable: true })).toEqual(['PUB-11'])
    expect(pricingInventoryIds({ giftCampaign: 'available', productRegion: 'intl' })).toEqual(['PUB-07', 'PUB-08'])
    expect(pricingInventoryIds({ currency: 'IRR', giftCampaign: 'exhausted', productRegion: 'ir' })).toEqual(['PUB-07', 'PUB-10', 'PUB-09'])
  })
})
