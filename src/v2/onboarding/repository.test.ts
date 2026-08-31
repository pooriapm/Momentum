import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertOnline } from '../../platform/pwa/network'
import { discardBodyReport } from './repository'

const mocks = vi.hoisted(() => {
  const select = vi.fn()
  const eq = vi.fn()
  const remove = vi.fn()
  const deleteRow = vi.fn()
  const deleteChain = { eq, select }
  eq.mockReturnValue(deleteChain)
  deleteRow.mockReturnValue(deleteChain)
  return {
    client: {
      from: vi.fn(() => ({ delete: deleteRow })),
      storage: { from: vi.fn(() => ({ remove })) },
    },
    deleteRow,
    eq,
    remove,
    select,
  }
})

vi.mock('../../platform/data/supabase', () => ({
  requireSupabase: () => mocks.client,
}))

vi.mock('../../platform/pwa/network', () => ({ assertOnline: vi.fn() }))

const userId = '2f02a069-5294-4dee-92dc-2ecfe077902b'
const measurementId = '31313131-3131-4131-8131-313131313131'
const path = `${userId}/body-report.pdf`

describe('private body-report deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.select })
    mocks.deleteRow.mockReturnValue({ eq: mocks.eq, select: mocks.select })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.select.mockResolvedValue({ data: [{ id: measurementId }], error: null })
  })

  it('confirms both private object and owned database row deletion', async () => {
    await expect(discardBodyReport(userId, measurementId, path)).resolves.toBeUndefined()
    expect(assertOnline).toHaveBeenCalledOnce()
    expect(mocks.remove).toHaveBeenCalledWith([path])
    expect(mocks.eq).toHaveBeenNthCalledWith(1, 'id', measurementId)
    expect(mocks.eq).toHaveBeenNthCalledWith(2, 'user_id', userId)
    expect(mocks.select).toHaveBeenCalledWith('id')
  })

  it('does not claim success when Storage rejects deletion', async () => {
    const error = new Error('storage unavailable')
    mocks.remove.mockResolvedValueOnce({ error })
    await expect(discardBodyReport(userId, measurementId, path)).rejects.toBe(error)
    expect(mocks.deleteRow).not.toHaveBeenCalled()
  })

  it('does not claim success when no owned measurement row was deleted', async () => {
    mocks.select.mockResolvedValueOnce({ data: [], error: null })
    await expect(discardBodyReport(userId, measurementId, path)).rejects.toThrow(
      'body_report_delete_not_confirmed',
    )
  })

  it('rejects a path outside the signed-in user folder before touching Storage', async () => {
    await expect(discardBodyReport(
      userId,
      measurementId,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/body-report.pdf',
    )).rejects.toThrow('body_report_path_not_owned')
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
