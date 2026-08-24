import type { SupabaseClient } from '@supabase/supabase-js'
import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

export interface ConsentProfile {
  terms_accepted_at?: unknown
  terms_version?: unknown
  privacy_accepted_at?: unknown
  privacy_version?: unknown
  health_data_consent_at?: unknown
  health_consent_version?: unknown
}

export interface RequiredConsentVersions {
  terms: string
  privacy: string
  health: string
}

export type ConsentAdminClient = Pick<SupabaseClient, 'rpc'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseLegalVersions(value: unknown): RequiredConsentVersions {
  if (
    !isRecord(value) ||
    typeof value.terms !== 'string' ||
    typeof value.privacy !== 'string' ||
    typeof value.health !== 'string' ||
    value.terms.length < 1 ||
    value.privacy.length < 1 ||
    value.health.length < 1
  ) {
    throw new HttpError(
      503,
      'consent_policy_not_configured',
      'Consent policy versions are not configured.',
    )
  }
  return { terms: value.terms, privacy: value.privacy, health: value.health }
}

function loadConsentVersionsFromEnv(): RequiredConsentVersions {
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
  return { terms: requiredTerms, privacy: requiredPrivacy, health: requiredHealth }
}

function isConsentPolicyConfiguredError(message: string): boolean {
  return message.includes('consent_policy_not_configured')
}

export async function loadRequiredConsentVersions(
  admin?: ConsentAdminClient | null,
): Promise<RequiredConsentVersions> {
  if (admin) {
    const { data, error } = await admin.rpc('current_legal_document_versions')
    if (!error && data) {
      return parseLegalVersions(data)
    }
    if (error && isConsentPolicyConfiguredError(error.message)) {
      throw new HttpError(
        503,
        'consent_policy_not_configured',
        'Consent policy versions are not configured.',
      )
    }
  }
  return loadConsentVersionsFromEnv()
}

export async function assertCurrentConsents(
  profile: ConsentProfile,
  admin?: ConsentAdminClient | null,
): Promise<void> {
  const required = await loadRequiredConsentVersions(admin)
  if (
    !profile.terms_accepted_at ||
    profile.terms_version !== required.terms ||
    !profile.privacy_accepted_at ||
    profile.privacy_version !== required.privacy ||
    !profile.health_data_consent_at ||
    profile.health_consent_version !== required.health
  ) {
    throw new HttpError(
      409,
      'consent_update_required',
      'Current terms, privacy policy, and health-data consent must be accepted.',
    )
  }
}
