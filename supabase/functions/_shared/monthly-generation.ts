import { assertAiFeatureEnabled } from './ai-gate.ts'
import { deterministicSafetyDecision } from './ai-safety.ts'
import { assertCatalogGenerationGate } from './catalog-gate.ts'
import { assertCurrentConsents, type ConsentAdminClient } from './consent.ts'
import { canonicalJson, sha256 } from './crypto.ts'
import { HttpError } from './http.ts'
import type { AiReservation, ProviderUsage } from './limits.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import { resolveDeclaredAllergenIds } from './plan-catalog.ts'
import { assertGeneratedPlan } from './plan-contract.ts'
import {
  generateMonthlyPlanFromProvider,
  MONTHLY_PLAN_DAYS,
  PLAN_SCHEMA_VERSION,
  STUB_PLAN_MODEL,
  STUB_PROMPT_VERSION,
} from './plan-provider.ts'

export type GenerationJobStatus =
  | 'queued'
  | 'validating'
  | 'importing'
  | 'ready'
  | 'failed'

export interface GenerationProfile {
  userId: string
  countryCode: string | null
  locale: 'fa-IR' | 'en-US'
  timezone: string
  productRegion: 'ir' | 'intl'
  onboardingStatus: string
  automationBlockReason: string | null
  termsAcceptedAt: unknown
  termsVersion: unknown
  privacyAcceptedAt: unknown
  privacyVersion: unknown
  healthDataConsentAt: unknown
  healthConsentVersion: unknown
  allergies: string[]
  goalId: string | null
}

export interface EntitlementRecord {
  id: string
  source: 'gift' | 'subscription' | 'admin'
  status: 'active'
  periodStart: string
  periodEnd: string
}

export interface GenerationJobRecord {
  id: string
  userId: string
  periodId: string
  usageLedgerId: string
  idempotencyKey: string
  status: GenerationJobStatus
  productRegion: 'ir' | 'intl'
  requestedLocale: 'fa-IR' | 'en-US'
  requestedDays: number
  requestFingerprint: string
  promptVersion: string
  model: string
  attemptCount: number
  errorCode: string | null
  openaiResponseId: string | null
}

export interface PeriodRecord {
  id: string
  userId: string
  cycleIndex: number
  entitlementId: string | null
  generationJobId: string | null
  importedPlanVersionId: string | null
  importedPlanId: string | null
  status: string
  readyAt: string | null
  endsAt: string | null
}

export interface ImportedPlan {
  planId: string
  planVersionId: string
  importedAt: string
}

export interface GenerationStore {
  loadProfile(userId: string): Promise<GenerationProfile>
  loadCatalog(): Promise<PlanCatalogSnapshot>
  loadActiveEntitlement(userId: string): Promise<EntitlementRecord | null>
  reserveGift(userId: string, productRegion: 'ir' | 'intl'): Promise<{ entitlementId: string }>
  findJobByIdempotency(userId: string, key: string): Promise<GenerationJobRecord | null>
  findJobByPeriod(userId: string, periodId: string): Promise<GenerationJobRecord | null>
  findInFlightJob(userId: string, exceptJobId?: string): Promise<GenerationJobRecord | null>
  listPeriods(userId: string): Promise<PeriodRecord[]>
  upsertPeriod(input: {
    userId: string
    cycleIndex: number
    entitlementId: string
  }): Promise<PeriodRecord>
  createJob(
    input: Omit<GenerationJobRecord, 'attemptCount' | 'errorCode' | 'openaiResponseId'>,
  ): Promise<GenerationJobRecord>
  reserveUsage(
    userId: string,
    idempotencyKey: string,
    requestSha256: string,
  ): Promise<AiReservation>
  claimJob(userId: string, jobId: string): Promise<{ claimed: boolean; job: GenerationJobRecord }>
  setJobStatus(
    jobId: string,
    status: GenerationJobStatus,
    patch?: {
      errorCode?: string | null
      openaiResponseId?: string | null
      model?: string
      promptVersion?: string
    },
  ): Promise<void>
  importPlan(input: {
    userId: string
    jobId: string
    periodId: string
    goalId: string | null
    planName: string
    locale: 'fa-IR' | 'en-US'
    timezone: string
    content: Record<string, unknown>
    contentSha256: string
    promptVersion: string
    model: string
    providerResponseId: string
    reservation: AiReservation
    usage: ProviderUsage
  }): Promise<ImportedPlan>
}

export interface GenerationSuccess {
  httpStatus: 200 | 201 | 202
  body: {
    job: { id: string; status: GenerationJobStatus; period_id: string }
    plan?: { plan_id: string; plan_version_id: string; imported_at: string }
    idempotent_replay?: true
  }
}

const IN_FLIGHT: ReadonlySet<string> = new Set(['queued', 'validating', 'importing'])
const MAX_ATTEMPTS = 3

function planNameOf(content: Record<string, unknown>): string {
  return typeof content.plan_name === 'string' ? content.plan_name : 'Monthly plan'
}

function safetyCorpus(content: Record<string, unknown>): string {
  return JSON.stringify(content)
}

export async function runMonthlyGeneration(input: {
  userId: string
  emailConfirmed: boolean
  idempotencyKey: string
  locale?: 'fa-IR' | 'en-US'
  store: GenerationStore
  admin?: ConsentAdminClient | null
  enforceCapacity?: () => Promise<void>
  invalidStub?: boolean
  now?: Date
}): Promise<GenerationSuccess> {
  assertAiFeatureEnabled('AI_PLAN_ENABLED')
  if (!input.emailConfirmed) {
    throw new HttpError(403, 'EMAIL_UNVERIFIED', 'Confirm your email before generating a plan.')
  }
  if (input.enforceCapacity) await input.enforceCapacity()

  const profile = await input.store.loadProfile(input.userId)
  if (
    profile.onboardingStatus === 'automation_blocked' ||
    Boolean(profile.automationBlockReason)
  ) {
    throw new HttpError(403, 'SAFETY_BLOCKED', 'Generation is blocked for safety review.')
  }
  if (profile.onboardingStatus !== 'complete') {
    throw new HttpError(409, 'CONSENT_REQUIRED', 'Complete onboarding before generating a plan.')
  }
  await assertCurrentConsents({
    terms_accepted_at: profile.termsAcceptedAt,
    terms_version: profile.termsVersion,
    privacy_accepted_at: profile.privacyAcceptedAt,
    privacy_version: profile.privacyVersion,
    health_data_consent_at: profile.healthDataConsentAt,
    health_consent_version: profile.healthConsentVersion,
  }, input.admin)

  const locale = input.locale ?? profile.locale
  if (locale !== 'fa-IR' && locale !== 'en-US') {
    throw new HttpError(400, 'invalid_locale', 'Locale must be fa-IR or en-US.')
  }

  const catalog = await input.store.loadCatalog()
  assertCatalogGenerationGate(catalog)

  const fingerprint = await sha256(canonicalJson({ locale }))
  const existingJob = await input.store.findJobByIdempotency(input.userId, input.idempotencyKey)
  if (existingJob && existingJob.requestFingerprint !== fingerprint) {
    throw new HttpError(
      409,
      'idempotency_key_reused',
      'Idempotency key was used for different input.',
    )
  }
  if (existingJob?.status === 'ready') {
    return replayReady(existingJob, await importedFromJob(input.store, existingJob), true)
  }

  const now = input.now ?? new Date()
  const entitlement = await resolveEntitlement(input.store, profile, now)
  const period = await resolvePeriod(input.store, profile, entitlement, existingJob, now)

  if (period.status === 'ready' && period.importedPlanVersionId) {
    throw new HttpError(
      409,
      'PERIOD_ALREADY_CONSUMED',
      'This monthly plan cycle already has an imported plan.',
    )
  }

  if (period.cycleIndex >= 2 && entitlement.source === 'gift') {
    throw new HttpError(
      402,
      'SUBSCRIPTION_INACTIVE',
      'An active membership is required for the next monthly plan.',
    )
  }

  // A cycle owns one durable job regardless of the caller's idempotency key.
  // This check happens before usage reservation so a varied key cannot consume
  // capacity or create a second provider execution for the same period.
  const periodJob = existingJob ?? await input.store.findJobByPeriod(input.userId, period.id)
  if (periodJob && periodJob.idempotencyKey !== input.idempotencyKey) {
    if (periodJob.status === 'ready') {
      return replayReady(periodJob, await importedFromJob(input.store, periodJob), true)
    }
    return {
      httpStatus: 202,
      body: {
        job: { id: periodJob.id, status: periodJob.status, period_id: periodJob.periodId },
        idempotent_replay: true,
      },
    }
  }

  const otherInFlight = await input.store.findInFlightJob(input.userId, existingJob?.id)
  if (otherInFlight && otherInFlight.idempotencyKey !== input.idempotencyKey) {
    throw new HttpError(
      409,
      'JOB_IN_PROGRESS',
      'A monthly generation job is already in progress.',
    )
  }

  let job = existingJob
  let reservation: AiReservation
  try {
    reservation = await input.store.reserveUsage(input.userId, input.idempotencyKey, fingerprint)
  } catch (error) {
    if (error instanceof HttpError && error.code === 'quota_exceeded') {
      throw new HttpError(
        409,
        'PERIOD_ALREADY_CONSUMED',
        'This monthly plan cycle already has an imported plan.',
      )
    }
    if (error instanceof HttpError && error.code === 'entitlement_required') {
      throw new HttpError(
        402,
        'ENTITLEMENT_REQUIRED',
        'A reserved gift or active membership is required.',
      )
    }
    if (error instanceof HttpError && error.code === 'PAYMENT_METHOD_REQUIRED') {
      throw new HttpError(
        402,
        'PAYMENT_METHOD_REQUIRED',
        'Add a payment method before generating a plan.',
      )
    }
    throw error
  }

  if (reservation.state === 'completed' && job) {
    await input.store.setJobStatus(job.id, 'ready')
    return replayReady({ ...job, status: 'ready' }, await importedFromJob(input.store, job), true)
  }

  if (!job) {
    job = await input.store.createJob({
      id: crypto.randomUUID(),
      userId: profile.userId,
      periodId: period.id,
      usageLedgerId: reservation.id,
      idempotencyKey: input.idempotencyKey,
      status: 'queued',
      productRegion: profile.productRegion,
      requestedLocale: locale,
      requestedDays: MONTHLY_PLAN_DAYS,
      requestFingerprint: fingerprint,
      promptVersion: STUB_PROMPT_VERSION,
      model: STUB_PLAN_MODEL,
    })
  }

  if (reservation.state === 'in_progress' && IN_FLIGHT.has(job.status) && job.attemptCount > 0) {
    return {
      httpStatus: 202,
      body: {
        job: { id: job.id, status: job.status, period_id: job.periodId },
        idempotent_replay: true,
      },
    }
  }

  const claimed = await input.store.claimJob(profile.userId, job.id)
  job = claimed.job
  if (!claimed.claimed) {
    if (job.status === 'ready') {
      return replayReady(job, await importedFromJob(input.store, job), true)
    }
    if (job.attemptCount >= MAX_ATTEMPTS && job.status === 'failed') {
      throw generationFailure(job)
    }
    return {
      httpStatus: 202,
      body: {
        job: { id: job.id, status: job.status, period_id: job.periodId },
        idempotent_replay: true,
      },
    }
  }

  try {
    await input.store.setJobStatus(job.id, 'validating')
    const generated = await generateMonthlyPlanFromProvider({
      catalog,
      locale,
      days: MONTHLY_PLAN_DAYS,
      invalidStub: input.invalidStub,
      userId: input.userId,
      context: {
        country_code: profile.countryCode,
        timezone: profile.timezone,
        product_region: profile.productRegion,
        goal_id: profile.goalId,
        declared_allergies: profile.allergies,
        cycle_index: period.cycleIndex,
      },
    })
    const safety = deterministicSafetyDecision(safetyCorpus(generated.content))
    if (safety) {
      throw new HttpError(
        422,
        'PLAN_VALIDATION_FAILED',
        'The generated plan could not be validated.',
      )
    }
    const declaredAllergenIds = resolveDeclaredAllergenIds(catalog, profile.allergies)
    assertGeneratedPlan(generated.content, MONTHLY_PLAN_DAYS, locale, {
      catalog,
      declaredAllergenIds,
      minimumCalories: 1_200,
    })
    await input.store.setJobStatus(job.id, 'importing', {
      openaiResponseId: generated.providerResponseId,
      model: generated.model,
      promptVersion: generated.promptVersion,
    })
    const contentSha256 = await sha256(canonicalJson(generated.content))
    const imported = await input.store.importPlan({
      userId: profile.userId,
      jobId: job.id,
      periodId: period.id,
      goalId: profile.goalId,
      planName: planNameOf(generated.content),
      locale,
      timezone: profile.timezone,
      content: generated.content,
      contentSha256,
      promptVersion: generated.promptVersion,
      model: generated.model,
      providerResponseId: generated.providerResponseId,
      reservation,
      usage: generated.usage,
    })
    await input.store.setJobStatus(job.id, 'ready', {
      openaiResponseId: generated.providerResponseId,
      model: generated.model,
      promptVersion: generated.promptVersion,
      errorCode: null,
    })
    return {
      httpStatus: 201,
      body: {
        job: { id: job.id, status: 'ready', period_id: period.id },
        plan: {
          plan_id: imported.planId,
          plan_version_id: imported.planVersionId,
          imported_at: imported.importedAt,
        },
      },
    }
  } catch (error) {
    const code = error instanceof HttpError ? mapValidationCode(error.code) : 'PROVIDER_FAILED'
    await input.store.setJobStatus(job.id, 'failed', { errorCode: code })
    throw error instanceof HttpError
      ? new HttpError(error.status === 502 ? 422 : error.status, code, safeFailureMessage(code))
      : new HttpError(502, 'PROVIDER_FAILED', 'The plan provider could not complete this request.')
  }
}

function mapValidationCode(code: string): string {
  if (
    code === 'PLAN_VALIDATION_FAILED' ||
    code === 'invalid_plan_output' ||
    code === 'unknown_catalog_id' ||
    code === 'allergen_in_generated_plan' ||
    code === 'catalog_food_modified' ||
    code === 'invalid_food_meal_type' ||
    code === 'invalid_exercise_equipment' ||
    code === 'invalid_exercise_substitution' ||
    code === 'unmapped_declared_allergen'
  ) {
    return 'PLAN_VALIDATION_FAILED'
  }
  if (code === 'LIVE_OPENAI_DISABLED') return 'PROVIDER_FAILED'
  if (code.startsWith('PLAN_') || code.endsWith('_FAILED')) return code
  return code
}

function safeFailureMessage(code: string): string {
  if (code === 'PLAN_VALIDATION_FAILED') return 'The generated plan could not be validated.'
  if (code === 'PLAN_IMPORT_FAILED') return 'The validated plan could not be imported.'
  return 'The plan provider could not complete this request.'
}

function generationFailure(job: GenerationJobRecord): HttpError {
  const code = job.errorCode ?? 'PROVIDER_FAILED'
  return new HttpError(422, code, safeFailureMessage(code))
}

function replayReady(
  job: GenerationJobRecord,
  imported: ImportedPlan | null,
  replay: boolean,
): GenerationSuccess {
  return {
    httpStatus: replay ? 200 : 201,
    body: {
      job: { id: job.id, status: 'ready', period_id: job.periodId },
      plan: imported
        ? {
          plan_id: imported.planId,
          plan_version_id: imported.planVersionId,
          imported_at: imported.importedAt,
        }
        : undefined,
      ...(replay ? { idempotent_replay: true as const } : {}),
    },
  }
}

async function importedFromJob(
  store: GenerationStore,
  job: GenerationJobRecord,
): Promise<ImportedPlan | null> {
  const periods = await store.listPeriods(job.userId)
  const period = periods.find((item) => item.id === job.periodId)
  if (!period?.importedPlanVersionId) return null
  return {
    planId: period.importedPlanId ?? period.id,
    planVersionId: period.importedPlanVersionId,
    importedAt: period.readyAt ?? new Date().toISOString(),
  }
}

async function resolveEntitlement(
  store: GenerationStore,
  profile: GenerationProfile,
  now: Date,
): Promise<EntitlementRecord> {
  const existing = await store.loadActiveEntitlement(profile.userId)
  if (existing) return existing
  try {
    const reserved = await store.reserveGift(profile.userId, profile.productRegion)
    const after = await store.loadActiveEntitlement(profile.userId)
    if (after) return after
    return {
      id: reserved.entitlementId,
      source: 'gift',
      status: 'active',
      periodStart: now.toISOString(),
      periodEnd: new Date(now.getTime() + 32 * 86_400_000).toISOString(),
    }
  } catch (error) {
    if (error instanceof HttpError && error.code === 'GIFT_BUDGET_UNAVAILABLE') {
      throw new HttpError(
        402,
        'ENTITLEMENT_REQUIRED',
        'A reserved gift or active membership is required.',
      )
    }
    throw error
  }
}

async function resolvePeriod(
  store: GenerationStore,
  profile: GenerationProfile,
  entitlement: EntitlementRecord,
  existingJob: GenerationJobRecord | null,
  now: Date,
): Promise<PeriodRecord> {
  if (existingJob) {
    const periods = await store.listPeriods(profile.userId)
    const match = periods.find((item) => item.id === existingJob.periodId)
    if (match) return match
  }

  const periods = await store.listPeriods(profile.userId)
  const latest = [...periods].sort((a, b) => b.cycleIndex - a.cycleIndex)[0]
  if (!latest) {
    return store.upsertPeriod({
      userId: profile.userId,
      cycleIndex: 1,
      entitlementId: entitlement.id,
    })
  }
  if (latest.status !== 'ready' || !latest.importedPlanVersionId) {
    return latest
  }
  if (latest.endsAt && Date.parse(latest.endsAt) > now.getTime()) {
    return latest
  }
  return store.upsertPeriod({
    userId: profile.userId,
    cycleIndex: latest.cycleIndex + 1,
    entitlementId: entitlement.id,
  })
}

export function cycleDateWindow(readyAtIso: string, timeZone: string): {
  validFrom: string
  validTo: string
  startsAt: string
  endsAt: string
} {
  const ready = new Date(readyAtIso)
  const validFrom = localIsoDate(ready, timeZone)
  const local = zonedParts(ready, timeZone)
  const endLocalDate = new Date(Date.UTC(
    local.year,
    local.month - 1,
    local.day + MONTHLY_PLAN_DAYS,
  ))
  const ends = zonedDateTimeToInstant({
    ...local,
    year: endLocalDate.getUTCFullYear(),
    month: endLocalDate.getUTCMonth() + 1,
    day: endLocalDate.getUTCDate(),
  }, timeZone)
  const validToDate = new Date(
    Date.UTC(local.year, local.month - 1, local.day + MONTHLY_PLAN_DAYS - 1),
  )
  const validTo = validToDate.toISOString().slice(0, 10)
  return {
    validFrom,
    validTo,
    startsAt: ready.toISOString(),
    endsAt: ends.toISOString(),
  }
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}

function zonedParts(value: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
    millisecond: value.getUTCMilliseconds(),
  }
}

function zonedDateTimeToInstant(local: ZonedParts, timeZone: string): Date {
  const wallClockUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
    local.millisecond,
  )
  let candidate = wallClockUtc
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const observed = zonedParts(new Date(candidate), timeZone)
    const observedWallClockUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      observed.millisecond,
    )
    const correction = wallClockUtc - observedWallClockUtc
    if (correction === 0) break
    candidate += correction
  }
  return new Date(candidate)
}

function localIsoDate(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${mapped.year}-${mapped.month}-${mapped.day}`
}

export { PLAN_SCHEMA_VERSION }
