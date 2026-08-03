import { z } from 'zod'
import { runtimeConfig } from '../../platform/config/runtime'

const pricingContextSchema = z.object({
  country: z.string().length(2),
  source: z.enum(['manual', 'edge_hint', 'fallback']),
  suggested_locale: z.enum(['fa-IR', 'en-US']),
  suggested_market: z.enum(['ir', 'global']),
  suggested_currency: z.enum(['IRR', 'USD']),
  suggested_cuisine_region: z.enum(['iran', 'international']),
  ai_service_available: z.boolean(),
  authoritative_for_checkout: z.literal(false),
  prices: z.array(z.object({
    id: z.string().uuid(),
    product_code: z.string(),
    market: z.enum(['ir', 'global']),
    currency: z.enum(['IRR', 'USD']),
    billing_interval: z.enum(['month', 'year']),
    amount_minor: z.number().nonnegative(),
    included_plan_generations: z.number().int().nonnegative(),
    included_coach_messages: z.number().int().nonnegative(),
    included_body_composition_extractions: z.number().int().nonnegative(),
    metadata: z.record(z.string(), z.unknown()),
  })),
})

export type PricingContext = z.infer<typeof pricingContextSchema>

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
