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
    expect(() => assertClosedAlphaAccess(userId)).toThrow(expect.objectContaining({ code: 'ALPHA_DISABLED' }))
    expect(() => assertPublicBetaAccess()).toThrow(expect.objectContaining({ code: 'PUBLIC_BETA_DISABLED' }))
  })

  it('requires an invited alpha user without country filtering', () => {
    env({
      ALPHA_ENROLLMENT_ENABLED: 'true',
      ALPHA_COHORT_IDS: userId,
    })
    expect(() => assertClosedAlphaAccess(userId)).not.toThrow()
    expect(() => assertClosedAlphaAccess('22222222-2222-4222-8222-222222222222'))
      .toThrow(expect.objectContaining({ code: 'ALPHA_NOT_INVITED' }))
  })

  it('uses one global server-owned beta switch', () => {
    env({ PUBLIC_BETA_ENABLED: 'true' })
    expect(() => assertPublicBetaAccess()).not.toThrow()
  })
})
