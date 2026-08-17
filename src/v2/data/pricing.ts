import { z } from 'zod'
import { runtimeConfig } from '../../platform/config/runtime'
import { MEMBERSHIP_PRODUCT_CODE, type GiftCampaignStatus } from '../entitlement/types'
import { giftCampaignFromUnknown } from '../entitlement/resolve'

const pricingContextSchema = z.object({
  country: z.string().length(2),
  source: z.enum(['manual', 'edge_hint', 'fallback']),
  suggested_locale: z.enum(['fa-IR', 'en-US']),
  suggested_market: z.enum(['ir', 'global']),
  suggested_product_region: z.enum(['ir', 'intl']).optional(),
  suggested_currency: z.enum(['IRR', 'USD']),
  suggested_cuisine_region: z.enum(['iran', 'international']),
  ai_service_available: z.boolean(),
  authoritative_for_checkout: z.literal(false),
  gift_campaign: z.object({
    status: z.enum(['available', 'exhausted', 'disabled']),
  }).optional(),
  prices: z.array(z.object({
    id: z.string().uuid(),
    product_code: z.string(),
    market: z.enum(['ir', 'global']),
    currency: z.enum(['IRR', 'USD']),
    billing_interval: z.enum(['month']),
    amount_minor: z.number().nonnegative(),
    included_plan_generations: z.number().int().nonnegative(),
    metadata: z.record(z.string(), z.unknown()),
  })),
})

export type PricingContext = z.infer<typeof pricingContextSchema>
export type MembershipPrice = PricingContext['prices'][number]

export async function loadPricingContext(manualCountry?: string): Promise<PricingContext | null> {
  if (!runtimeConfig.hasSupabase) return null
  const url = new URL(`${runtimeConfig.supabaseUrl}/functions/v1/geo-context`)
  if (manualCountry) url.searchParams.set('country', manualCountry)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: runtimeConfig.supabasePublishableKey,
      Authorization: `Bearer ${runtimeConfig.supabasePublishableKey}`,
      Accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error('Pricing context unavailable.')
  return pricingContextSchema.parse(await response.json())
}

export function membershipPriceFromContext(context: PricingContext | null | undefined): MembershipPrice | null {
  return context?.prices.find((price) => price.product_code === MEMBERSHIP_PRODUCT_CODE && price.billing_interval === 'month') ?? null
}

export function giftCampaignFromContext(context: PricingContext | null | undefined): GiftCampaignStatus {
  const metadataStatus = membershipPriceFromContext(context)?.metadata.gift_campaign
  return giftCampaignFromUnknown(context?.gift_campaign?.status ?? metadataStatus)
}

export function formatPrice(amountMinor: number, currency: 'IRR' | 'USD', locale: 'fa' | 'en') {
  if (currency === 'IRR') {
    const toman = amountMinor / 10
    return `${new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(toman)} ${locale === 'fa' ? 'تومان' : 'toman'}`
  }
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}
