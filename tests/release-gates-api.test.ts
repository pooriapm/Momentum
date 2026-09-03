import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertAccountDataEnrollmentAccess,
  assertAccountSettingsEnrollmentAccess,
  assertProductEnrollmentAccess,
} from '../supabase/functions/_shared/release-gates.ts'

const invited = '11111111-1111-4111-8111-111111111111'
const stranger = '22222222-2222-4222-8222-222222222222'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => vi.unstubAllGlobals())

/**
 * Direct enrollment-boundary cases the Edge handlers rely on.
 * These mirror switch-off / incomplete config / uninvited / invited / UI-bypass expectations
 * without inventing a hosted environment.
 */
describe('release-gate API boundary matrix', () => {
  it('denies product enrollment when both switches are off', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'false',
      PUBLIC_BETA_ENABLED: 'false',
      ALPHA_COHORT_IDS: invited,
    })
    expect(() => assertProductEnrollmentAccess(invited))
      .toThrow(expect.objectContaining({ status: 403, code: 'ALPHA_DISABLED' }))
    expect(() => assertAccountDataEnrollmentAccess(invited, 'complete-onboarding'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
    expect(() => assertAccountDataEnrollmentAccess(invited, 'dashboard'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
    expect(() => assertAccountSettingsEnrollmentAccess(invited, 'update'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
  })

  it('treats incomplete alpha cohort config as not invited', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'true',
      ALPHA_COHORT_IDS: '',
      PUBLIC_BETA_ENABLED: 'false',
    })
    expect(() => assertProductEnrollmentAccess(invited))
      .toThrow(expect.objectContaining({ status: 403, code: 'ALPHA_NOT_INVITED' }))
  })

  it('rejects uninvited users while allowing the cohort member', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'true',
      ALPHA_COHORT_IDS: invited,
      PUBLIC_BETA_ENABLED: 'false',
    })
    expect(() => assertProductEnrollmentAccess(invited)).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(invited, 'import-external-plan')).not.toThrow()
    expect(() => assertProductEnrollmentAccess(stranger))
      .toThrow(expect.objectContaining({ code: 'ALPHA_NOT_INVITED' }))
  })

  it('opens enrollment for any authenticated user when public beta is enabled', () => {
    env({
      PUBLIC_BETA_ENABLED: 'true',
      ALPHA_ENROLLMENT_ENABLED: 'false',
      ALPHA_COHORT_IDS: '',
    })
    expect(() => assertProductEnrollmentAccess(stranger)).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(stranger, 'create-starter-plan')).not.toThrow()
  })

  it('keeps legal/export/delete and consent-withdraw reachable when enrollment is closed', () => {
    env({})
    for (const action of [
      'legal-versions',
      'export-status',
      'export-download',
      'export-account',
      'deletion-status',
      'delete-account',
    ]) {
      expect(() => assertAccountDataEnrollmentAccess(stranger, action)).not.toThrow()
    }
    expect(() => assertAccountSettingsEnrollmentAccess(stranger, 'withdraw-health-consent')).not.toThrow()
    expect(() => assertAccountDataEnrollmentAccess(stranger, 'record-product-event'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
  })
})
