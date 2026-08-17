export type MembershipStatus = 'gift' | 'active' | 'pending' | 'expired' | 'none'
export type GiftCampaignStatus = 'available' | 'exhausted' | 'disabled' | 'unknown'
export type PaymentMethodStatus = 'missing' | 'recorded' | 'pending' | 'unavailable'
export type AppTabSurface = 'today' | 'plan' | 'progress' | 'me'

/** Inventory IDs owned by slice 3B. LIFE-12–16 and LIFE-18–20 stay on Today wait/ready (3C / Phase 4). */
export type EntitlementInventoryId =
  | 'LIFE-01'
  | 'LIFE-02'
  | 'LIFE-03'
  | 'LIFE-04'
  | 'LIFE-05'
  | 'LIFE-06'
  | 'LIFE-07'
  | 'LIFE-08'
  | 'LIFE-09'
  | 'LIFE-10'
  | 'LIFE-11'
  | 'LIFE-17'

export type PricingInventoryId = 'PUB-07' | 'PUB-08' | 'PUB-09' | 'PUB-10' | 'PUB-11'

export type AppContentSurface = 'children' | 'preplan' | 'entitlement'

export interface EntitlementUsage {
  entitlement?: {
    id?: string
    source?: string
    status?: string
    period_start?: string
    period_end?: string
  } | null
}

export interface EntitlementSnapshot {
  membership: MembershipStatus
  onboardingStatus: string
  hasSavedPlan: boolean
  automationBlocked?: boolean
  productRegion?: 'ir' | 'intl'
  giftCampaign?: GiftCampaignStatus
  paymentMethod?: PaymentMethodStatus
  aiPlanState?: 'ready' | 'pending_verification' | 'disabled' | 'safety_blocked'
  periodEnd?: string
}

/**
 * Thin payments (SetupIntent / Stripe.js / webhooks) are Phase 5a.
 * This slice only models client entitlement states and routing. Do not import a payment SDK here.
 */
export const PAYMENTS_LIVE = false
export const MEMBERSHIP_PRODUCT_CODE = 'membership'
