import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertMemberFeatureAccess, hasMemberAccess } from '../supabase/functions/_shared/membership'
import { hasMemberFeatures } from '../src/v2/entitlement'

function fakeAdmin(rows: unknown[], error: unknown = null) {
  const calls: Array<[string, unknown]> = []
  const chain = {
    select: (columns: string) => { calls.push(['select', columns]); return chain },
    eq: (column: string, value: unknown) => { calls.push([`eq:${column}`, value]); return chain },
    in: (column: string, value: unknown) => { calls.push([`in:${column}`, value]); return chain },
    lte: (column: string, value: unknown) => { calls.push([`lte:${column}`, value]); return chain },
    gt: (column: string, value: unknown) => { calls.push([`gt:${column}`, value]); return chain },
    limit: async () => ({ data: rows, error }),
  }
  const admin = { from: (table: string) => { calls.push(['from', table]); return chain } }
  return { admin: admin as unknown as SupabaseClient, calls }
}

describe('member-only features', () => {
  it('grants gift, active, and pending-payment members on the client, and the sample preview', () => {
    expect(hasMemberFeatures('gift')).toBe(true)
    expect(hasMemberFeatures('active')).toBe(true)
    expect(hasMemberFeatures('pending')).toBe(true)
    expect(hasMemberFeatures('none')).toBe(false)
    expect(hasMemberFeatures('expired')).toBe(false)
    expect(hasMemberFeatures('cancelled')).toBe(false)
    expect(hasMemberFeatures('none', true)).toBe(true)
  })

  it('checks only current entitlements with an access-granting status on the server', async () => {
    const { admin, calls } = fakeAdmin([{ id: 'e1' }])
    expect(await hasMemberAccess(admin, 'user-1', new Date('2026-10-12T08:00:00Z'))).toBe(true)
    expect(calls).toContainEqual(['from', 'entitlements'])
    expect(calls).toContainEqual(['eq:user_id', 'user-1'])
    expect(calls).toContainEqual(['in:status', ['active', 'grace', 'payment_pending']])
    expect(calls).toContainEqual(['lte:period_start', '2026-10-12T08:00:00.000Z'])
    expect(calls).toContainEqual(['gt:period_end', '2026-10-12T08:00:00.000Z'])
  })

  it('refuses free users with a 402 and fails closed when membership cannot be read', async () => {
    await expect(assertMemberFeatureAccess(fakeAdmin([]).admin, 'user-1', 'Meal swaps'))
      .rejects.toMatchObject({ status: 402, code: 'MEMBERSHIP_REQUIRED' })
    await expect(assertMemberFeatureAccess(fakeAdmin([], new Error('down')).admin, 'user-1', 'Meal swaps'))
      .rejects.toMatchObject({ status: 503 })
  })
})
