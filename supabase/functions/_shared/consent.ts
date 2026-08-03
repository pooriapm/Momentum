import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

interface ConsentProfile {
  terms_accepted_at?: unknown
  terms_version?: unknown
  privacy_accepted_at?: unknown
  privacy_version?: unknown
  health_data_consent_at?: unknown
  health_consent_version?: unknown
}

export function assertCurrentConsents(profile: ConsentProfile): void {
  const requiredTerms = optionalEnv('CURRENT_TERMS_VERSION')
  const requiredPrivacy = optionalEnv('CURRENT_PRIVACY_VERSION')
  const requiredHealth = optionalEnv('CURRENT_HEALTH_CONSENT_VERSION')
  if (!requiredTerms || !requiredPrivacy || !requiredHealth) {
    throw new HttpError(
      503,
      'consent_policy_not_configured',
      'Consent policy versions are not configured.',
    )
  }
  if (
    !profile.terms_accepted_at ||
    profile.terms_version !== requiredTerms ||
    !profile.privacy_accepted_at ||
    profile.privacy_version !== requiredPrivacy ||
    !profile.health_data_consent_at ||
    profile.health_consent_version !== requiredHealth
  ) {
    throw new HttpError(
      409,
      'consent_update_required',
      'Current terms, privacy policy, and health-data consent must be accepted.',
    )
  }
}
