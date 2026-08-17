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

import {
  deleteAccount,
  downloadAccountExport,
  exportAccountData,
  loadAccountExportStatus,
} from './repository'

const readyExport = {
  export_request: {
    id: '88888888-8888-4888-8888-888888888888',
    status: 'ready' as const,
    requested_at: '2026-08-09T10:00:00.000Z',
    ready_at: '2026-08-09T10:00:01.000Z',
    expires_at: '2026-08-10T10:00:01.000Z',
    error_code: null,
  },
  export: {
    schema_version: 'momentum-account-export-v1' as const,
    generated_at: '2026-08-09T10:00:00.000Z',
    account: { id: '88888888-8888-4888-8888-888888888888', email: 'user@example.com' },
    data: { profiles: [], plan_versions: [] },
    note: 'Download immediately.',
  },
}

describe('account data lifecycle client', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.signOut.mockReset()
  })

  it('requests a portable account export and keeps pending/ready server state', async () => {
    mocks.invoke.mockResolvedValue({ data: readyExport, error: null })

    const result = await exportAccountData()

    expect(result.export_request.status).toBe('ready')
    expect(result.export?.schema_version).toBe('momentum-account-export-v1')
    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: { action: 'export-account' },
    })
    expect(localStorage.length).toBe(0)
  })

  it('reads durable export status without creating a duplicate request', async () => {
    mocks.invoke.mockResolvedValue({
      data: { export_request: { ...readyExport.export_request, status: 'pending' }, export: null },
      error: null,
    })

    const result = await loadAccountExportStatus()

    expect(result.export_request?.status).toBe('pending')
    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: { action: 'export-status' },
    })
  })

  it('downloads a ready export from the stored server artifact', async () => {
    mocks.invoke.mockResolvedValue({ data: readyExport, error: null })

    const result = await downloadAccountExport()

    expect(result.export_request.status).toBe('ready')
    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: { action: 'export-download' },
    })
  })

  it('requires explicit deletion confirmation and clears the local session after success', async () => {
    mocks.invoke.mockResolvedValue({
      data: { deleted: true, deletion_request: { status: 'completed' } },
      error: null,
    })
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
