import type { AppLocale } from '../../platform/i18n/catalog'
import { localizedPath } from '../router/route-utils'
import type {
  AppContentSurface,
  AppTabSurface,
  EntitlementInventoryId,
  EntitlementSnapshot,
  EntitlementUsage,
  GiftCampaignStatus,
  MembershipStatus,
  PricingInventoryId,
} from './types'

export function mapEntitlementStatus(usage: EntitlementUsage | null | undefined): MembershipStatus {
  if (!usage?.entitlement) return 'none'
  const status = usage.entitlement.status ?? ''
  if (usage.entitlement.source === 'gift' && status !== 'expired' && status !== 'cancelled' && status !== 'canceled') return 'gift'
  if (status === 'past_due' || status === 'pending' || status === 'incomplete' || status === 'grace') return 'pending'
  if (status === 'canceled' || status === 'cancelled' || status === 'expired' || status === 'unpaid') return 'expired'
  if (status === 'active' || status === 'trialing' || status === 'reserved') return 'active'
  return 'active'
}

export function isSetupAllowedTab(tab: string): tab is 'me' {
  return tab === 'me'
}

export function isMembershipRequiredTab(tab: string): tab is Exclude<AppTabSurface, 'me'> {
  return tab === 'today' || tab === 'plan' || tab === 'progress'
}

export function isEntitledForGeneration(snapshot: EntitlementSnapshot) {
  if (snapshot.automationBlocked || snapshot.aiPlanState === 'safety_blocked') return false
  if (snapshot.onboardingStatus !== 'complete') return false
  return snapshot.membership === 'gift' || snapshot.membership === 'active'
}

export function canReadSavedPlan(snapshot: EntitlementSnapshot) {
  return snapshot.hasSavedPlan
}

export function appContentSurface(tab: string, snapshot: EntitlementSnapshot): AppContentSurface {
  if (isSetupAllowedTab(tab)) return 'children'
  if (snapshot.hasSavedPlan) return 'children'
  if (snapshot.onboardingStatus === 'started' || snapshot.onboardingStatus === 'profile_complete') return 'preplan'
  if (snapshot.automationBlocked || snapshot.onboardingStatus === 'automation_blocked' || snapshot.aiPlanState === 'safety_blocked') {
    return 'preplan'
  }
  if (!isEntitledForGeneration(snapshot)) return 'entitlement'
  return 'preplan'
}

export function postOnboardingPath(locale: AppLocale) {
  return localizedPath(locale, '/app/today')
}

export function paywallInventoryId(snapshot: EntitlementSnapshot): EntitlementInventoryId {
  if (snapshot.automationBlocked || snapshot.aiPlanState === 'safety_blocked') return 'LIFE-07'
  if (snapshot.membership === 'pending') return 'LIFE-10'
  if (snapshot.membership === 'expired') return 'LIFE-11'
  if ((snapshot.giftCampaign === 'exhausted' || snapshot.giftCampaign === 'disabled') && snapshot.membership === 'none') return 'LIFE-05'
  if (snapshot.paymentMethod === 'missing' || snapshot.membership === 'none') return 'LIFE-08'
  return 'LIFE-17'
}

export function reviewInventoryIds(snapshot: Pick<EntitlementSnapshot, 'productRegion' | 'giftCampaign' | 'automationBlocked' | 'membership'>): EntitlementInventoryId[] {
  const ids: EntitlementInventoryId[] = ['LIFE-01', 'LIFE-08']
  if (snapshot.productRegion === 'ir') ids.push('LIFE-06')
  if (snapshot.giftCampaign === 'available') ids.push('LIFE-02')
  if (snapshot.giftCampaign === 'exhausted' || snapshot.giftCampaign === 'disabled') ids.push('LIFE-05')
  if (snapshot.automationBlocked) ids.push('LIFE-07')
  if (snapshot.membership === 'gift') ids.push('LIFE-04')
  return ids
}

export function pricingInventoryIds(input: {
  loading?: boolean
  unavailable?: boolean
  productRegion?: 'ir' | 'intl'
  currency?: 'IRR' | 'USD'
  giftCampaign?: GiftCampaignStatus
}): PricingInventoryId[] {
  if (input.unavailable) return ['PUB-11']
  if (input.loading) return ['PUB-07']
  const ids: PricingInventoryId[] = ['PUB-07']
  if (input.productRegion === 'ir' || input.currency === 'IRR') ids.push('PUB-10')
  if (input.giftCampaign === 'available') ids.push('PUB-08')
  if (input.giftCampaign === 'exhausted' || input.giftCampaign === 'disabled') ids.push('PUB-09')
  return ids
}

export function giftCampaignFromUnknown(value: unknown): GiftCampaignStatus {
  if (value === 'available' || value === 'exhausted' || value === 'disabled') return value
  return 'unknown'
}
