import { createClient } from '@supabase/supabase-js'
import { requiredEnv } from '../_shared/config.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts'
import { productRegionFromCountry } from '../_shared/jurisdiction.ts'
import { resolvePaymentRoute } from '../_shared/billing.ts'

const COUNTRY_PATTERN = /^[A-Z]{2}$/

function validCountry(value: string | null): string | undefined {
  const normalized = value?.trim().toUpperCase()
  return normalized && COUNTRY_PATTERN.test(normalized) ? normalized : undefined
}

function preferredLocale(request: Request, region: 'ir' | 'intl'): 'fa-IR' | 'en-US' {
  if (region === 'ir') return 'fa-IR'
  return request.headers.get('accept-language')?.toLowerCase().includes('fa') ? 'fa-IR' : 'en-US'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)

  try {
    assertAllowedOrigin(request)
    if (request.method !== 'GET') {
      throw new HttpError(405, 'method_not_allowed', 'Only GET is supported.')
    }

    const url = new URL(request.url)
    const manualCountry = validCountry(url.searchParams.get('country'))
    const edgeCountry = validCountry(
      request.headers.get('cf-ipcountry') ??
        request.headers.get('x-vercel-ip-country') ??
        request.headers.get('x-country-code'),
    )
    const country = manualCountry ?? edgeCountry ?? 'US'
    const source = manualCountry ? 'manual' : edgeCountry ? 'edge_hint' : 'fallback'
    const productRegion = productRegionFromCountry(country)
    const paymentRoute = resolvePaymentRoute(country)
    const market = paymentRoute.market
    const currency = paymentRoute.currency
    const locale = preferredLocale(request, productRegion)

    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    )
    const { data: prices, error } = await admin
      .from('product_prices')
      .select(
        'id,product_code,market,currency,billing_interval,amount_minor,included_plan_generations,metadata',
      )
      .eq('market', market)
      .eq('currency', currency)
      .eq('active', true)
      .eq('billing_interval', 'month')
      .order('product_code')

    if (error) {
      throw new HttpError(503, 'pricing_unavailable', 'Pricing is temporarily unavailable.')
    }

    return jsonResponse(
      request,
      {
        country,
        source,
        suggested_locale: locale,
        suggested_market: market,
        suggested_product_region: productRegion,
        suggested_currency: currency,
        suggested_payment_provider: paymentRoute.provider,
        suggested_cuisine_region: country === 'IR' ? 'iran' : 'international',
        ai_service_available: true,
        prices: prices ?? [],
        authoritative_for_checkout: false,
      },
      200,
      {
        'Cache-Control': 'private, max-age=300',
        Vary: 'Origin, Accept-Language, CF-IPCountry, X-Vercel-IP-Country, X-Country-Code',
      },
    )
  } catch (error) {
    return errorResponse(request, error)
  }
})
