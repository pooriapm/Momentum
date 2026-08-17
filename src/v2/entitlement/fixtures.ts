import type { PricingContext } from '../data/pricing'
import type { EntitlementSnapshot } from './types'

const intlPriceId = '10000000-0000-4000-8000-000000000001'
const irPriceId = '10000000-0000-4000-8000-000000000005'

/** Public list-price fixtures for tests and Storybook. Not a checkout catalog and not a secret. */
export const intlMembershipCatalog: PricingContext = {
  ai_service_available: true,
  authoritative_for_checkout: false,
  country: 'US',
  prices: [{
    amount_minor: 1499,
    billing_interval: 'month',
    currency: 'USD',
    id: intlPriceId,
    included_plan_generations: 1,
    market: 'global',
    metadata: { pricing_stage: 'preview', tax_included: false },
    product_code: 'membership',
  }],
  source: 'fallback',
  suggested_cuisine_region: 'international',
  suggested_currency: 'USD',
  suggested_locale: 'en-US',
  suggested_market: 'global',
  suggested_product_region: 'intl',
}

export const irMembershipCatalog: PricingContext = {
  ai_service_available: true,
  authoritative_for_checkout: false,
  country: 'IR',
  prices: [{
    amount_minor: 4_900_000,
    billing_interval: 'month',
    currency: 'IRR',
    id: irPriceId,
    included_plan_generations: 1,
    market: 'ir',
    metadata: { display_amount_toman: 490_000, pricing_stage: 'preview', tax_included: false },
    product_code: 'membership',
  }],
  source: 'fallback',
  suggested_cuisine_region: 'iran',
  suggested_currency: 'IRR',
  suggested_locale: 'fa-IR',
  suggested_market: 'ir',
  suggested_product_region: 'ir',
}

export function entitlementFixture(overrides: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot {
  return {
    aiPlanState: 'ready',
    giftCampaign: 'unknown',
    hasSavedPlan: false,
    membership: 'none',
    onboardingStatus: 'complete',
    paymentMethod: 'missing',
    ...overrides,
  }
}
