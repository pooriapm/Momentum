import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertOnline } from '../../platform/pwa/network'
import { discardBodyReport, saveOnboardingBodyMeasurements } from './repository'

const mocks = vi.hoisted(() => {
  const select = vi.fn()
  const eq = vi.fn()
  const remove = vi.fn()
  const deleteRow = vi.fn()
  const deleteChain = { eq, select }
  eq.mockReturnValue(deleteChain)
  deleteRow.mockReturnValue(deleteChain)
  const from = vi.fn<(table: string) => object>(() => ({ delete: deleteRow }))
  return {
    client: {
      from,
      storage: { from: vi.fn(() => ({ remove })) },
    },
    deleteRow,
    eq,
    remove,
    select,
  }
})

describe('onboarding manual body measurements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function bodyClient(existing: { id: string } | null = null) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null })
    const contains = vi.fn().mockReturnValue({ maybeSingle })
    const lookupEq = vi.fn()
    lookupEq.mockReturnValue({ eq: lookupEq, contains })
    const select = vi.fn().mockReturnValue({ eq: lookupEq })
    const insert = vi.fn().mockResolvedValue({ error: null })
    const mutationSelect = vi.fn().mockResolvedValue({ data: existing ? [{ id: existing.id }] : [], error: null })
    const finalEq = vi.fn().mockReturnValue({ select: mutationSelect })
    const firstEq = vi.fn().mockReturnValue({ eq: finalEq })
    const update = vi.fn().mockReturnValue({ eq: firstEq })
    const deleteRow = vi.fn().mockReturnValue({ eq: firstEq })
    mocks.client.from.mockReturnValue({ select, insert, update, delete: deleteRow })
    return { contains, deleteRow, finalEq, insert, lookupEq, maybeSingle, mutationSelect, update }
  }

  it('inserts one generation-readable manual row for the onboarding flow', async () => {
    const chain = bodyClient()
    await saveOnboardingBodyMeasurements(userId, 'flow-12345678', {
      bodyFatPercent: '24.5',
      waistCm: '82',
      bodyReportDate: '2026-09-10',
    })
    expect(chain.contains).toHaveBeenCalledWith('notes', ['onboarding-flow:flow-12345678'])
    expect(chain.lookupEq).toHaveBeenCalledWith('user_id', userId)
    expect(chain.lookupEq).toHaveBeenCalledWith('source_type', 'manual')
    expect(chain.lookupEq).toHaveBeenCalledWith('extraction_status', 'not_requested')
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: userId,
      source_type: 'manual',
      extraction_status: 'not_requested',
      body_fat_percent: 24.5,
      waist_cm: 82,
      measured_at: '2026-09-10T12:00:00.000Z',
      notes: ['onboarding-flow:flow-12345678'],
    }))
  })

  it('updates the existing flow row on retry instead of inserting a duplicate', async () => {
    const chain = bodyClient({ id: measurementId })
    await saveOnboardingBodyMeasurements(userId, 'flow-12345678', { waistCm: '84' })
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ waist_cm: 84, body_fat_percent: null }))
    expect(chain.finalEq).toHaveBeenCalledWith('user_id', userId)
    expect(chain.mutationSelect).toHaveBeenCalledWith('id')
    expect(chain.insert).not.toHaveBeenCalled()
  })

  it('removes only the flow-marked manual row after skip or cleared values', async () => {
    const chain = bodyClient({ id: measurementId })
    await saveOnboardingBodyMeasurements(userId, 'flow-12345678', {
      bodySkipped: 'yes',
      bodyFatPercent: '24.5',
    })
    expect(chain.deleteRow).toHaveBeenCalledOnce()
    expect(chain.finalEq).toHaveBeenCalledWith('user_id', userId)
    expect(chain.mutationSelect).toHaveBeenCalledWith('id')
    expect(chain.update).not.toHaveBeenCalled()
  })

  it('fails before writing when the flow-row lookup cannot be confirmed', async () => {
    const chain = bodyClient()
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('lookup failed') })
    await expect(saveOnboardingBodyMeasurements(userId, 'flow-12345678', { waistCm: '84' }))
      .rejects.toThrow('lookup failed')
    expect(chain.insert).not.toHaveBeenCalled()
  })

  it('does not claim an update succeeded when no owned helper row was changed', async () => {
    const chain = bodyClient({ id: measurementId })
    chain.mutationSelect.mockResolvedValueOnce({ data: [], error: null })
    await expect(saveOnboardingBodyMeasurements(userId, 'flow-12345678', { waistCm: '84' }))
      .rejects.toThrow('onboarding_body_update_not_confirmed')
  })

  it('does not claim a skipped helper row was removed when no owned row was deleted', async () => {
    const chain = bodyClient({ id: measurementId })
    chain.mutationSelect.mockResolvedValueOnce({ data: [], error: null })
    await expect(saveOnboardingBodyMeasurements(userId, 'flow-12345678', { bodySkipped: 'yes' }))
      .rejects.toThrow('onboarding_body_delete_not_confirmed')
  })
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
    mocks.client.from.mockImplementation(() => ({ delete: mocks.deleteRow }))
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
