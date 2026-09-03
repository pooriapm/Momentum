import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertAccountDataEnrollmentAccess,
  assertAccountSettingsEnrollmentAccess,
  assertClosedAlphaAccess,
  assertProductEnrollmentAccess,
  assertPublicBetaAccess,
} from '../supabase/functions/_shared/release-gates.ts'

const userId = '11111111-1111-4111-8111-111111111111'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => vi.unstubAllGlobals())

describe('R6-R8 enrollment gates', () => {
  it('fails closed when alpha and beta switches are absent', () => {
    env({})
    expect(() => assertClosedAlphaAccess(userId)).toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
    expect(() => assertPublicBetaAccess()).toThrow(expect.objectContaining({ code: 'PUBLIC_BETA_DISABLED' }))
    expect(() => assertProductEnrollmentAccess(userId)).toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
  })

  it('requires an invited alpha user without country filtering', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'true',
      ALPHA_COHORT_IDS: userId,
    })
    expect(() => assertClosedAlphaAccess(userId)).not.toThrow()
    expect(() => assertProductEnrollmentAccess(userId)).not.toThrow()
    expect(() => assertClosedAlphaAccess('22222222-2222-4222-8222-222222222222'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_NOT_INVITED' }))
  })

  it('uses one global server-owned beta switch', () => {
    env({ PUBLIC_BETA_ENABLED: 'true' })
    expect(() => assertPublicBetaAccess()).not.toThrow()
    expect(() => assertProductEnrollmentAccess('22222222-2222-4222-8222-222222222222')).not.toThrow()
  })

  it('prefers public beta over closed alpha cohort checks', () => {
    env({
      PUBLIC_BETA_ENABLED: 'true',
      ALPHA_ENROLLMENT_ENABLED: 'false',
    })
    expect(() => assertProductEnrollmentAccess(userId)).not.toThrow()
  })

  it('leaves privacy and export account-data actions ungated', () => {
    env({})
    expect(() => assertAccountDataEnrollmentAccess(userId, 'export-account')).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(userId, 'legal-versions')).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(userId, 'delete-account')).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(userId, 'complete-onboarding'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
  })

  it('leaves health-consent withdrawal ungated on settings', () => {
    env({})
    expect(() => assertAccountSettingsEnrollmentAccess(userId, 'withdraw-health-consent')).not.toThrow()
    expect(() => assertAccountSettingsEnrollmentAccess(userId, 'update'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
  })
})
