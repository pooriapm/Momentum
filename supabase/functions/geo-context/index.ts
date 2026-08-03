import { createClient } from '@supabase/supabase-js'
import { optionalEnv, requiredEnv } from '../_shared/config.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts'

const COUNTRY_PATTERN = /^[A-Z]{2}$/

function validCountry(value: string | null): string | undefined {
  const normalized = value?.trim().toUpperCase()
  return normalized && COUNTRY_PATTERN.test(normalized) ? normalized : undefined
}

function preferredLocale(request: Request, country: string): 'fa-IR' | 'en-US' {
  if (country === 'IR') return 'fa-IR'
  return request.headers.get('accept-language')?.toLowerCase().includes('fa') ? 'fa-IR' : 'en-US'
}

function configuredAiCountries(): Set<string> {
  return new Set(
    (optionalEnv('AI_ALLOWED_BILLING_COUNTRIES') ?? '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => COUNTRY_PATTERN.test(item) && item !== 'IR'),
  )
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
    const market = country === 'IR' ? 'ir' : 'global'
    const currency = market === 'ir' ? 'IRR' : 'USD'
    const locale = preferredLocale(request, country)
    const aiServiceAvailable = configuredAiCountries().has(country)

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
        'id,product_code,market,currency,billing_interval,amount_minor,included_plan_generations,included_coach_messages,included_body_composition_extractions,metadata',
      )
      .eq('market', aiServiceAvailable ? market : '__disabled__')
      .eq('currency', currency)
      .eq('active', true)
      .order('billing_interval')

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
        suggested_currency: currency,
        suggested_cuisine_region: country === 'IR' ? 'iran' : 'international',
        ai_service_available: aiServiceAvailable,
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
