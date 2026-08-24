import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStarterPlan } from './repository'

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), assertOnline: vi.fn() }))

vi.mock('../../platform/data/supabase', () => ({
  requireSupabase: () => ({ functions: { invoke: mocks.invoke } }),
}))
vi.mock('../../platform/pwa/network', () => ({ assertOnline: mocks.assertOnline }))

describe('deterministic starter-plan repository', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.assertOnline.mockReset()
  })

  it('uses the authenticated account-data action and validates immutable IDs', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        starter_plan: {
          activation_id: '11111111-1111-4111-8111-111111111111',
          plan_id: '22222222-2222-4222-8222-222222222222',
          plan_version_id: '33333333-3333-4333-8333-333333333333',
          activated_at: '2026-08-24T12:00:00.000Z',
        },
      },
      error: null,
    })

    const result = await createStarterPlan('starter-flow-key')

    expect(mocks.assertOnline).toHaveBeenCalledOnce()
    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: { action: 'create-starter-plan' },
      headers: { 'Idempotency-Key': 'starter-flow-key' },
    })
    expect(result.plan_version_id).toBe('33333333-3333-4333-8333-333333333333')
  })

  it('rejects malformed persistence responses', async () => {
    mocks.invoke.mockResolvedValue({ data: { starter_plan: { plan_id: 'bad' } }, error: null })
    await expect(createStarterPlan('starter-flow-key')).rejects.toThrow()
  })
})
