import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

function countrySet(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '').split(',').map((value) => value.trim().toUpperCase()).filter((value) =>
      /^[A-Z]{2}$/.test(value)
    ),
  )
}

export function assertLiveAiMarketAllowed(countryCode: string | null | undefined): string {
  const country = countryCode?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new HttpError(
      403,
      'AI_MARKET_UNVERIFIED',
      'Live plan generation is unavailable in this market.',
    )
  }
  if (country === 'IR') {
    throw new HttpError(
      403,
      'AI_MARKET_BLOCKED',
      'Live plan generation is unavailable in this market.',
    )
  }
  if (!countrySet(optionalEnv('AI_ENABLED_MARKETS')).has(country)) {
    throw new HttpError(
      403,
      'AI_MARKET_NOT_APPROVED',
      'Live plan generation is unavailable in this market.',
    )
  }
  return country
}
