import { TODAY_GENERATION_WAIT_MS } from './today-state'

export const GENERATION_WAIT_STORAGE_KEY = 'momentum.generationWait.v1'

export type GenerationWaitPhase = 'queued' | 'generating' | 'validating' | 'importing' | 'ready'
export type GenerationWaitFailure = 'timeout' | 'provider' | 'validation' | 'import' | 'offline' | 'payment'

export type GenerationWaitInventoryId =
  | 'LIFE-12'
  | 'LIFE-13'
  | 'LIFE-14'
  | 'LIFE-15'
  | 'LIFE-16'
  | 'LIFE-18'
  | 'LIFE-19'
  | 'LIFE-20'
  | 'TODAY-04'

export interface GenerationWaitSession {
  idempotencyKey: string
  startedAt: number
  phase: GenerationWaitPhase
  failure: GenerationWaitFailure | null
  hasPriorPlan: boolean
}

const waitPhases = new Set<GenerationWaitPhase>(['queued', 'generating', 'validating', 'importing', 'ready'])
const waitFailures = new Set<GenerationWaitFailure>(['timeout', 'provider', 'validation', 'import', 'offline', 'payment'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readString(value: unknown, key: string): string {
  if (!isRecord(value) || !(key in value)) return ''
  const candidate = value[key]
  return typeof candidate === 'string' ? candidate : ''
}

export function waitHasTimedOut(startedAt: number, now = Date.now()) {
  return now - startedAt >= TODAY_GENERATION_WAIT_MS
}

export function waitInventoryId(input: {
  phase?: GenerationWaitPhase
  failure?: GenerationWaitFailure | null
}): GenerationWaitInventoryId {
  if (input.failure === 'validation') return 'LIFE-19'
  if (input.failure === 'import') return 'LIFE-20'
  if (input.failure === 'timeout' || input.failure === 'provider' || input.failure === 'offline' || input.failure === 'payment') return 'LIFE-18'
  if (input.phase === 'queued') return 'LIFE-12'
  if (input.phase === 'validating') return 'LIFE-14'
  if (input.phase === 'importing') return 'LIFE-15'
  if (input.phase === 'ready') return 'LIFE-16'
  return 'LIFE-13'
}

export function mapJobStatusToPhase(status: string | undefined): GenerationWaitPhase {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'queued' || normalized === 'preparing') return 'queued'
  if (normalized === 'validating') return 'validating'
  if (normalized === 'importing') return 'importing'
  if (normalized === 'completed' || normalized === 'ready' || normalized === 'imported') return 'ready'
  return 'generating'
}

export function mapGenerationFailure(error: unknown): GenerationWaitFailure | 'still_processing' | null {
  if (error instanceof Error && error.message === 'plan_generation_still_processing') return 'still_processing'
  if (error instanceof Error && error.message === 'offline_mutation_blocked') return 'offline'

  const code = `${readString(error, 'code')} ${readString(isRecord(error) ? error.error : null, 'code')}`.toUpperCase()
  const message = [
    readString(error, 'message'),
    readString(isRecord(error) ? error.error : null, 'message'),
    error instanceof Error ? error.message : '',
  ].join(' ').toUpperCase()
  const blob = `${code} ${message}`

  if (blob.includes('JOB_IN_PROGRESS') || blob.includes('STILL_PROCESSING')) return 'still_processing'
  if (blob.includes('PAYMENT_METHOD_REQUIRED')) return 'payment'
  if (blob.includes('PLAN_VALIDATION_FAILED') || blob.includes('VALIDATION_FAILED')) return 'validation'
  if (blob.includes('PLAN_IMPORT_FAILED') || blob.includes('IMPORT_FAILED')) return 'import'
  if (blob.includes('OFFLINE')) return 'offline'
  if (blob.includes('PROVIDER_FAILED') || blob.includes('PERIOD_ALREADY_CONSUMED')) return 'provider'
  return 'provider'
}

export function readGenerationWaitSession(): GenerationWaitSession | null {
  try {
    const raw = sessionStorage.getItem(GENERATION_WAIT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GenerationWaitSession>
    if (typeof parsed.idempotencyKey !== 'string' || !parsed.idempotencyKey) return null
    if (typeof parsed.startedAt !== 'number' || !Number.isFinite(parsed.startedAt)) return null
    const phase = waitPhases.has(parsed.phase as GenerationWaitPhase) ? parsed.phase as GenerationWaitPhase : 'generating'
    const failure = parsed.failure && waitFailures.has(parsed.failure) ? parsed.failure : null
    return {
      idempotencyKey: parsed.idempotencyKey,
      startedAt: parsed.startedAt,
      phase,
      failure,
      hasPriorPlan: Boolean(parsed.hasPriorPlan),
    }
  } catch {
    return null
  }
}

export function writeGenerationWaitSession(session: GenerationWaitSession) {
  try {
    sessionStorage.setItem(GENERATION_WAIT_STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* private mode */
  }
}

export function clearGenerationWaitSession() {
  try {
    sessionStorage.removeItem(GENERATION_WAIT_STORAGE_KEY)
  } catch {
    /* private mode */
  }
}

export function createGenerationWaitSession(input: {
  hasPriorPlan: boolean
  existing?: GenerationWaitSession | null
  now?: number
}): GenerationWaitSession {
  const now = input.now ?? Date.now()
  return {
    idempotencyKey: input.existing?.idempotencyKey ?? crypto.randomUUID(),
    startedAt: now,
    phase: 'queued',
    failure: null,
    hasPriorPlan: input.hasPriorPlan || Boolean(input.existing?.hasPriorPlan),
  }
}

export function markGenerationWaitFailure(session: GenerationWaitSession, failure: GenerationWaitFailure): GenerationWaitSession {
  return { ...session, failure }
}

export function resumeGenerationWaitClock(session: GenerationWaitSession, now = Date.now()): GenerationWaitSession {
  return { ...session, startedAt: now, failure: null, phase: session.phase === 'ready' ? 'queued' : session.phase }
}
