import { HttpError } from './http.ts'

const COUNTRY_PATTERN = /^[A-Z]{2}$/

export function productRegionFromCountry(country: string): 'ir' | 'intl' {
  return country.trim().toUpperCase() === 'IR' ? 'ir' : 'intl'
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
}
