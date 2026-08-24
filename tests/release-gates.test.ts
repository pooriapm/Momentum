import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertClosedAlphaAccess, assertPublicBetaAccess } from '../supabase/functions/_shared/release-gates.ts'

const userId = '11111111-1111-4111-8111-111111111111'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => vi.unstubAllGlobals())

describe('R6-R8 enrollment gates', () => {
  it('fails closed when alpha and beta switches are absent', () => {
    env({})
    expect(() => assertClosedAlphaAccess(userId, 'US')).toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
    expect(() => assertPublicBetaAccess('US')).toThrow(expect.objectContaining({ code: 'PUBLIC_BETA_DISABLED' }))
  })

  it('requires both an invited alpha user and an approved country', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'true',
      ALPHA_COHORT_IDS: userId,
      ALPHA_COUNTRY_ALLOWLIST: 'US,CA',
    })
    expect(() => assertClosedAlphaAccess(userId, 'US')).not.toThrow()
    expect(() => assertClosedAlphaAccess('22222222-2222-4222-8222-222222222222', 'US'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_NOT_INVITED' }))
    expect(() => assertClosedAlphaAccess(userId, 'DE'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_COUNTRY_BLOCKED' }))
    expect(() => assertClosedAlphaAccess(userId, 'IR'))
      .toThrow(expect.objectContaining({ code: 'RELEASE_COUNTRY_BLOCKED' }))
  })

  it('requires an exact server-owned beta country allowlist', () => {
    env({ PUBLIC_BETA_ENABLED: 'true', BETA_COUNTRY_ALLOWLIST: 'US,CA' })
    expect(() => assertPublicBetaAccess('ca')).not.toThrow()
    expect(() => assertPublicBetaAccess('DE'))
      .toThrow(expect.objectContaining({ code: 'BETA_COUNTRY_BLOCKED' }))
    expect(() => assertPublicBetaAccess('IR'))
      .toThrow(expect.objectContaining({ code: 'RELEASE_COUNTRY_BLOCKED' }))
  })
})
