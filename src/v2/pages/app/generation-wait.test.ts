import { afterEach, describe, expect, it } from 'vitest'
import { TODAY_GENERATION_WAIT_MS } from './today-state'
import {
  GENERATION_WAIT_STORAGE_KEY,
  clearGenerationWaitSession,
  createGenerationWaitSession,
  mapGenerationFailure,
  mapJobStatusToPhase,
  readGenerationWaitSession,
  resumeGenerationWaitClock,
  waitHasTimedOut,
  waitInventoryId,
  writeGenerationWaitSession,
} from './generation-wait'

describe('generation wait contract', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('LIFE-12 keeps one idempotency key across leave-and-return', () => {
    const first = createGenerationWaitSession({ hasPriorPlan: false, existing: null, now: 1_000 })
    writeGenerationWaitSession(first)
    const resumed = createGenerationWaitSession({
      hasPriorPlan: false,
      existing: readGenerationWaitSession(),
      now: 2_000,
    })
    expect(resumed.idempotencyKey).toBe(first.idempotencyKey)
    expect(sessionStorage.getItem(GENERATION_WAIT_STORAGE_KEY)).toContain(first.idempotencyKey)
  })

  it('LIFE-13 times out after 3 minutes and retry keeps the same job', () => {
    expect(waitHasTimedOut(1_000, 1_000 + TODAY_GENERATION_WAIT_MS - 1)).toBe(false)
    expect(waitHasTimedOut(1_000, 1_000 + TODAY_GENERATION_WAIT_MS)).toBe(true)
    const session = createGenerationWaitSession({ hasPriorPlan: true, now: 1_000 })
    const retried = resumeGenerationWaitClock(session, 1_000 + TODAY_GENERATION_WAIT_MS)
    expect(retried.idempotencyKey).toBe(session.idempotencyKey)
    expect(retried.failure).toBeNull()
    expect(retried.hasPriorPlan).toBe(true)
  })

  it('maps wait phases and terminal failures to LIFE-12–20', () => {
    expect(waitInventoryId({ phase: 'queued' })).toBe('LIFE-12')
    expect(waitInventoryId({ phase: 'generating' })).toBe('LIFE-13')
    expect(waitInventoryId({ phase: 'validating' })).toBe('LIFE-14')
    expect(waitInventoryId({ phase: 'importing' })).toBe('LIFE-15')
    expect(waitInventoryId({ phase: 'ready' })).toBe('LIFE-16')
    expect(waitInventoryId({ failure: 'timeout' })).toBe('LIFE-18')
    expect(waitInventoryId({ failure: 'provider' })).toBe('LIFE-18')
    expect(waitInventoryId({ failure: 'validation' })).toBe('LIFE-19')
    expect(waitInventoryId({ failure: 'import' })).toBe('LIFE-20')
    expect(waitInventoryId({ failure: 'offline' })).toBe('LIFE-18')
    expect(waitInventoryId({ failure: 'payment' })).toBe('LIFE-18')
    expect(mapJobStatusToPhase('queued')).toBe('queued')
    expect(mapJobStatusToPhase('validating')).toBe('validating')
    expect(mapJobStatusToPhase('importing')).toBe('importing')
    expect(mapJobStatusToPhase('completed')).toBe('ready')
  })

  it('maps provider, validation, and import errors without starting a second job', () => {
    expect(mapGenerationFailure(new Error('plan_generation_still_processing'))).toBe('still_processing')
    expect(mapGenerationFailure(new Error('offline_mutation_blocked'))).toBe('offline')
    expect(mapGenerationFailure({ code: 'PROVIDER_FAILED', message: 'upstream' })).toBe('provider')
    expect(mapGenerationFailure({ code: 'PLAN_VALIDATION_FAILED' })).toBe('validation')
    expect(mapGenerationFailure({ error: { code: 'PLAN_IMPORT_FAILED' } })).toBe('import')
    expect(mapGenerationFailure({ code: 'JOB_IN_PROGRESS' })).toBe('still_processing')
    expect(mapGenerationFailure({ code: 'PAYMENT_METHOD_REQUIRED' })).toBe('payment')
    expect(mapGenerationFailure({ error: { code: 'PAYMENT_METHOD_REQUIRED' } })).toBe('payment')
    expect(mapGenerationFailure(new Error('PAYMENT_METHOD_REQUIRED'))).toBe('payment')
    expect(mapGenerationFailure({ code: 'PAYMENT_METHOD_REQUIRED' })).not.toBe('provider')
  })

  it('drops a corrupt wait session instead of inventing a new job', () => {
    sessionStorage.setItem(GENERATION_WAIT_STORAGE_KEY, '{not-json')
    expect(readGenerationWaitSession()).toBeNull()
    clearGenerationWaitSession()
    expect(readGenerationWaitSession()).toBeNull()
  })
})
