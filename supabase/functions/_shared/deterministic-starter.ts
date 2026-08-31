import { deterministicSafetyDecision } from './ai-safety.ts'
import { assertCatalogGenerationGate } from './catalog-gate.ts'
import { assertCurrentConsents, type ConsentAdminClient } from './consent.ts'
import { HttpError } from './http.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import { assertGeneratedPlan } from './plan-contract.ts'
import { MONTHLY_PLAN_DAYS } from './plan-provider.ts'
import { buildStarterPlan } from './starter-plan.ts'

export const STARTER_TEMPLATE_VERSION = 'momentum-starter/1.0.0'

export interface DeterministicStarterProfile {
  dateOfBirth: string
  locale: 'fa-IR' | 'en-US'
  countryCode: string
  productRegion: 'ir' | 'intl'
  onboardingStatus: string
  automationBlockReason: string | null
  planSourcePreference: string
  termsAcceptedAt: unknown
  termsVersion: unknown
  privacyAcceptedAt: unknown
  privacyVersion: unknown
  healthDataConsentAt: unknown
  healthConsentVersion: unknown
}

function ageOn(dateOfBirth: string, today: Date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth)
  if (!match) return Number.NaN
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  let age = today.getUTCFullYear() - year
  if (
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  ) {
    age -= 1
  }
  return age
}

export async function buildValidatedDeterministicStarter(input: {
  profile: DeterministicStarterProfile
  catalog: PlanCatalogSnapshot
  declaredAllergenIds: ReadonlySet<string>
  consentAdmin?: ConsentAdminClient | null
  today?: Date
}) {
  const { profile } = input
  if (profile.onboardingStatus !== 'complete') {
    throw new HttpError(409, 'onboarding_incomplete', 'Complete onboarding before creating a plan.')
  }
  if (profile.automationBlockReason) {
    throw new HttpError(
      403,
      'starter_plan_safety_blocked',
      'Automated planning is unavailable for this profile.',
    )
  }
  if (profile.planSourcePreference !== 'momentum') {
    throw new HttpError(
      409,
      'managed_plan_path_not_selected',
      'Select the Momentum-managed plan path first.',
    )
  }
  if (!/^[A-Z]{2}$/.test(profile.countryCode)) {
    throw new HttpError(422, 'verified_country_required', 'A verified account country is required.')
  }
  const age = ageOn(profile.dateOfBirth, input.today ?? new Date())
  if (!Number.isFinite(age) || age < 18 || age > 100) {
    throw new HttpError(
      403,
      'starter_plan_age_blocked',
      'The deterministic starter plan is limited to eligible adults.',
    )
  }
  await assertCurrentConsents({
    terms_accepted_at: profile.termsAcceptedAt,
    terms_version: profile.termsVersion,
    privacy_accepted_at: profile.privacyAcceptedAt,
    privacy_version: profile.privacyVersion,
    health_data_consent_at: profile.healthDataConsentAt,
    health_consent_version: profile.healthConsentVersion,
  }, input.consentAdmin)
  assertCatalogGenerationGate(input.catalog)
  const content = buildStarterPlan(
    input.catalog,
    MONTHLY_PLAN_DAYS,
    profile.locale,
    input.declaredAllergenIds,
  )
  if (deterministicSafetyDecision(JSON.stringify(content))) {
    throw new HttpError(422, 'PLAN_VALIDATION_FAILED', 'The starter plan could not be validated.')
  }
  assertGeneratedPlan(content, MONTHLY_PLAN_DAYS, profile.locale, {
    catalog: input.catalog,
    declaredAllergenIds: input.declaredAllergenIds,
    minimumCalories: 1_200,
  })
  return content
}
