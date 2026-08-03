import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

const COUNTRY_PATTERN = /^[A-Z]{2}$/

function configuredCountries(): Set<string> {
  return new Set(
    (optionalEnv('AI_ALLOWED_BILLING_COUNTRIES') ?? '')
      .split(',')
      .map((country) => country.trim().toUpperCase())
      .filter((country) => COUNTRY_PATTERN.test(country)),
  )
}

export async function assertAiRequestRegion(request: Request): Promise<string> {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim()
  if (!forwardedFor || forwardedFor.length > 64 || !/^[0-9a-fA-F:.]+$/.test(forwardedFor)) {
    throw new HttpError(
      503,
      'ai_region_verification_unavailable',
      'Current region could not be verified.',
    )
  }

  const token = optionalEnv('IPINFO_TOKEN')
  if (!token) {
    throw new HttpError(
      503,
      'ai_region_verification_unavailable',
      'Current region verification is not configured.',
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3_500)
  let response: Response
  try {
    response = await fetch(`https://ipinfo.io/${encodeURIComponent(forwardedFor)}/json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    })
  } catch {
    throw new HttpError(
      503,
      'ai_region_verification_unavailable',
      'Current region could not be verified.',
    )
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) {
    throw new HttpError(
      503,
      'ai_region_verification_unavailable',
      'Current region could not be verified.',
    )
  }
  const payload = await response.json() as { country?: unknown }
  const country = typeof payload.country === 'string' ? payload.country.trim().toUpperCase() : ''
  const allowed = configuredCountries()
  if (!COUNTRY_PATTERN.test(country) || country === 'IR' || !allowed.has(country)) {
    throw new HttpError(
      403,
      'ai_unavailable_in_current_region',
      'AI features are not available from the current region.',
    )
  }
  return country
}

export function assertAiJurisdiction(
  countryCode: unknown,
  verifiedAt: unknown,
  verificationMethod: unknown,
): asserts countryCode is string {
  const country = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : ''
  const verifiedTimestamp = typeof verifiedAt === 'string' ? Date.parse(verifiedAt) : Number.NaN
  if (
    !COUNTRY_PATTERN.test(country) ||
    !Number.isFinite(verifiedTimestamp) ||
    !['payment_provider', 'admin_review'].includes(String(verificationMethod))
  ) {
    throw new HttpError(
      409,
      'verified_country_required',
      'A verified billing country is required before AI features can be used.',
    )
  }

  // Iran is intentionally denied even if it is accidentally included in the
  // environment allowlist. Geo headers and manual locale choices never bypass it.
  if (country === 'IR') {
    throw new HttpError(
      403,
      'ai_unavailable_in_region',
      'AI features are not available for this billing region.',
    )
  }

  const allowed = configuredCountries()
  if (allowed.size === 0) {
    throw new HttpError(
      503,
      'ai_jurisdiction_not_configured',
      'AI availability is not configured.',
    )
  }
  if (!allowed.has(country)) {
    throw new HttpError(
      403,
      'ai_unavailable_in_region',
      'AI features are not available for this billing region.',
    )
  }
}
