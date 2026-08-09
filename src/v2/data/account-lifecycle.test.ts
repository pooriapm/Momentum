import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../platform/data/supabase', () => ({
  requireSupabase: () => ({
    functions: { invoke: mocks.invoke },
    auth: { signOut: mocks.signOut },
  }),
}))
vi.mock('../../platform/pwa/network', () => ({ assertOnline: vi.fn() }))

import { deleteAccount, exportAccountData } from './repository'

describe('account data lifecycle client', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.signOut.mockReset()
  })

  it('requests a portable account export without storing it locally', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        export: {
          schema_version: 'momentum-account-export-v1',
          generated_at: '2026-08-09T10:00:00.000Z',
          account: { id: '88888888-8888-4888-8888-888888888888', email: 'user@example.com' },
          data: { profiles: [], plan_versions: [], plan_recalibrations: [] },
          note: 'Download immediately.',
        },
      },
      error: null,
    })

    const result = await exportAccountData()

    expect(result.schema_version).toBe('momentum-account-export-v1')
    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: { action: 'export-account' },
    })
    expect(localStorage.length).toBe(0)
  })

  it('requires explicit deletion confirmation and clears the local session after success', async () => {
    mocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null })
    mocks.signOut.mockResolvedValue({ error: null })

    await deleteAccount()

    expect(mocks.invoke).toHaveBeenCalledWith('account-data', expect.objectContaining({
      body: { action: 'delete-account', confirmation: 'DELETE' },
      headers: { 'Idempotency-Key': expect.any(String) },
    }))
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('does not revoke the local session when server deletion fails', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('delete failed') })

    await expect(deleteAccount()).rejects.toThrow('delete failed')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })
})
