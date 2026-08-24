import { HttpError } from './http.ts'

export const DEFAULT_FIRST_PLAN_CAMPAIGN_ID = '20000000-0000-4000-8000-000000000001'

export interface GiftCampaignState {
  id: string
  enabled: boolean
  remainingBudgetUsd: number
  reservationCostUsd: number
  minRemainingUsd: number
  allowedMarkets: Array<'ir' | 'intl'>
  startsAt: string | null
  endsAt: string | null
}

export interface GiftReservationRecord {
  id: string
  campaignId: string
  userId: string
  entitlementId: string
  status: 'reserved' | 'consumed' | 'released'
  reservedCostUsd: number
}

export function mapGiftReservationError(message: string): HttpError {
  const normalized = message.toLowerCase()
  if (normalized.includes('gift_budget_unavailable')) {
    return new HttpError(
      409,
      'GIFT_BUDGET_UNAVAILABLE',
      'The first-plan gift is not available.',
    )
  }
  if (normalized.includes('safety_blocked')) {
    return new HttpError(403, 'SAFETY_BLOCKED', 'Generation is blocked for safety review.')
  }
  return new HttpError(503, 'GIFT_RESERVATION_FAILED', 'Gift reservation is unavailable.')
}

export function reserveGiftBudget(input: {
  campaign: GiftCampaignState
  existing: GiftReservationRecord | null
  userId: string
  productRegion: 'ir' | 'intl'
  nowIso: string
  newReservationId: string
  entitlementId: string
}): { campaign: GiftCampaignState; reservation: GiftReservationRecord; created: boolean } {
  if (input.existing) {
    return { campaign: input.campaign, reservation: input.existing, created: false }
  }

  const now = Date.parse(input.nowIso)
  const starts = input.campaign.startsAt
    ? Date.parse(input.campaign.startsAt)
    : Number.NEGATIVE_INFINITY
  const ends = input.campaign.endsAt ? Date.parse(input.campaign.endsAt) : Number.POSITIVE_INFINITY
  const remainingAfter = input.campaign.remainingBudgetUsd - input.campaign.reservationCostUsd
  if (
    !input.campaign.enabled ||
    !Number.isFinite(now) ||
    now < starts ||
    now >= ends ||
    !input.campaign.allowedMarkets.includes(input.productRegion) ||
    remainingAfter < input.campaign.minRemainingUsd
  ) {
    throw new HttpError(
      409,
      'GIFT_BUDGET_UNAVAILABLE',
      'The first-plan gift is not available.',
    )
  }

  return {
    campaign: {
      ...input.campaign,
      remainingBudgetUsd: remainingAfter,
    },
    reservation: {
      id: input.newReservationId,
      campaignId: input.campaign.id,
      userId: input.userId,
      entitlementId: input.entitlementId,
      status: 'reserved',
      reservedCostUsd: input.campaign.reservationCostUsd,
    },
    created: true,
  }
}
