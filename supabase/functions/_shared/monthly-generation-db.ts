import type { SupabaseClient } from '@supabase/supabase-js'
import { mapGiftReservationError } from './gift-campaign.ts'
import { HttpError } from './http.ts'
import { finalizeAiUsage, reserveAiUsage } from './limits.ts'
import {
  cycleDateWindow,
  type EntitlementRecord,
  type GenerationJobRecord,
  type GenerationJobStatus,
  type GenerationProfile,
  type GenerationStore,
  type ImportedPlan,
  type PeriodRecord,
  PLAN_SCHEMA_VERSION,
} from './monthly-generation.ts'
import { loadPlanCatalog } from './plan-catalog.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function mapJobStatus(value: unknown): GenerationJobStatus {
  const status = String(value)
  if (status === 'completed') return 'ready'
  if (status === 'in_progress') return 'validating'
  if (
    status === 'queued' ||
    status === 'validating' ||
    status === 'importing' ||
    status === 'ready' ||
    status === 'failed'
  ) {
    return status
  }
  return 'queued'
}

function mapJob(row: Record<string, unknown>): GenerationJobRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    periodId: String(row.period_id ?? ''),
    usageLedgerId: String(row.usage_ledger_id),
    idempotencyKey: String(row.idempotency_key),
    status: mapJobStatus(row.status),
    productRegion: row.product_region === 'ir' ? 'ir' : 'intl',
    requestedLocale: row.requested_locale === 'fa-IR' ? 'fa-IR' : 'en-US',
    requestedDays: Number(row.requested_days ?? 7),
    requestFingerprint: String(row.request_fingerprint),
    promptVersion: String(row.prompt_version),
    model: String(row.model),
    attemptCount: Number(row.attempt_count ?? 0),
    errorCode: text(row.error_code),
    openaiResponseId: text(row.openai_response_id),
  }
}

function mapPeriod(row: Record<string, unknown>, planId: string | null = null): PeriodRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    cycleIndex: Number(row.cycle_index),
    entitlementId: text(row.entitlement_id),
    generationJobId: text(row.generation_job_id),
    importedPlanVersionId: text(row.imported_plan_version_id),
    importedPlanId: planId,
    status: String(row.status),
    readyAt: text(row.ready_at),
    endsAt: text(row.ends_at),
  }
}

export function createSupabaseGenerationStore(admin: SupabaseClient): GenerationStore {
  return {
    async loadProfile(userId) {
      const [profileResult, prefsResult, goalResult] = await Promise.all([
        admin.from('profiles').select(
          'user_id,locale,timezone,product_region,onboarding_status,automation_block_reason,terms_accepted_at,terms_version,privacy_accepted_at,privacy_version,health_data_consent_at,health_consent_version',
        ).eq('user_id', userId).single(),
        admin.from('dietary_preferences').select('allergies').eq('user_id', userId).maybeSingle(),
        admin.from('goals').select('id').eq('user_id', userId).eq('status', 'active').limit(1)
          .maybeSingle(),
      ])
      if (profileResult.error || !profileResult.data) {
        throw new HttpError(
          409,
          'CONSENT_REQUIRED',
          'Complete onboarding before generating a plan.',
        )
      }
      const row = profileResult.data
      const allergies = Array.isArray(prefsResult.data?.allergies)
        ? prefsResult.data.allergies.filter((item: unknown): item is string =>
          typeof item === 'string'
        )
        : []
      return {
        userId,
        locale: row.locale === 'fa-IR' ? 'fa-IR' : 'en-US',
        timezone: typeof row.timezone === 'string' && row.timezone ? row.timezone : 'UTC',
        productRegion: row.product_region === 'ir' ? 'ir' : 'intl',
        onboardingStatus: String(row.onboarding_status ?? ''),
        automationBlockReason: text(row.automation_block_reason),
        termsAcceptedAt: row.terms_accepted_at,
        termsVersion: row.terms_version,
        privacyAcceptedAt: row.privacy_accepted_at,
        privacyVersion: row.privacy_version,
        healthDataConsentAt: row.health_data_consent_at,
        healthConsentVersion: row.health_consent_version,
        allergies,
        goalId: text(goalResult.data?.id),
      } satisfies GenerationProfile
    },

    loadCatalog: () => loadPlanCatalog(admin),

    async loadActiveEntitlement(userId) {
      const now = new Date().toISOString()
      const { data, error } = await admin.from('entitlements').select(
        'id,source,status,period_start,period_end',
      ).eq('user_id', userId).eq('status', 'active').lte('period_start', now).gt('period_end', now)
        .order('period_end', { ascending: false }).limit(1).maybeSingle()
      if (error) {
        throw new HttpError(503, 'entitlement_lookup_failed', 'Entitlement status is unavailable.')
      }
      if (!data) return null
      if (data.source !== 'gift' && data.source !== 'subscription' && data.source !== 'admin') {
        return null
      }
      return {
        id: data.id,
        source: data.source,
        status: 'active',
        periodStart: String(data.period_start),
        periodEnd: String(data.period_end),
      } satisfies EntitlementRecord
    },

    async reserveGift(userId, productRegion) {
      void productRegion
      const { data, error } = await admin.rpc('reserve_first_plan_gift', { p_user_id: userId })
      if (error) throw mapGiftReservationError(error.message)
      if (!isRecord(data) || typeof data.entitlement_id !== 'string') {
        throw new HttpError(503, 'GIFT_RESERVATION_FAILED', 'Gift reservation is unavailable.')
      }
      return { entitlementId: data.entitlement_id }
    },

    async findJobByIdempotency(userId, key) {
      const { data, error } = await admin.from('ai_generation_jobs').select('*')
        .eq('user_id', userId).eq('idempotency_key', key).maybeSingle()
      if (error) {
        throw new HttpError(503, 'generation_job_unavailable', 'Generation jobs are unavailable.')
      }
      return data ? mapJob(data) : null
    },

    async findInFlightJob(userId, exceptJobId) {
      let query = admin.from('ai_generation_jobs').select('*').eq('user_id', userId)
        .in('status', ['queued', 'validating', 'importing', 'in_progress'])
        .order('created_at', { ascending: false }).limit(1)
      if (exceptJobId) query = query.neq('id', exceptJobId)
      const { data, error } = await query.maybeSingle()
      if (error) {
        throw new HttpError(503, 'generation_job_unavailable', 'Generation jobs are unavailable.')
      }
      return data ? mapJob(data) : null
    },

    async listPeriods(userId) {
      const { data, error } = await admin.from('monthly_plan_periods').select('*')
        .eq('user_id', userId).order('cycle_index', { ascending: false })
      if (error) throw new HttpError(503, 'period_unavailable', 'Plan periods are unavailable.')
      const rows = data ?? []
      const versionIds = rows.map((row) => row.imported_plan_version_id).filter(
        (id): id is string => typeof id === 'string',
      )
      const versions = versionIds.length
        ? await admin.from('plan_versions').select('id,plan_id').in('id', versionIds).eq(
          'user_id',
          userId,
        )
        : { data: [], error: null }
      if (versions.error) {
        throw new HttpError(503, 'period_unavailable', 'Plan periods are unavailable.')
      }
      const planByVersion = new Map(
        (versions.data ?? []).map((row) => [String(row.id), String(row.plan_id)]),
      )
      return rows.map((row) =>
        mapPeriod(
          row,
          row.imported_plan_version_id
            ? planByVersion.get(String(row.imported_plan_version_id)) ?? null
            : null,
        )
      )
    },

    async upsertPeriod(input) {
      const { data: existing, error: existingError } = await admin.from('monthly_plan_periods')
        .select('*').eq('user_id', input.userId).eq('cycle_index', input.cycleIndex).maybeSingle()
      if (existingError) {
        throw new HttpError(503, 'period_unavailable', 'Plan periods are unavailable.')
      }
      if (existing) return mapPeriod(existing)
      const { data, error } = await admin.from('monthly_plan_periods').insert({
        user_id: input.userId,
        cycle_index: input.cycleIndex,
        entitlement_id: input.entitlementId,
        status: 'reserved',
      }).select('*').single()
      if (error || !data) {
        throw new HttpError(503, 'period_unavailable', 'Plan periods are unavailable.')
      }
      return mapPeriod(data)
    },

    async createJob(input) {
      const { data, error } = await admin.from('ai_generation_jobs').insert({
        id: input.id,
        user_id: input.userId,
        period_id: input.periodId,
        usage_ledger_id: input.usageLedgerId,
        idempotency_key: input.idempotencyKey,
        status: 'queued',
        requested_locale: input.requestedLocale,
        requested_days: input.requestedDays,
        request_fingerprint: input.requestFingerprint,
        request_metadata: { product_region: input.productRegion },
        prompt_version: input.promptVersion,
        model: input.model,
        product_region: input.productRegion,
        attempt_count: 0,
      }).select('*').single()
      if (error || !data) {
        const replay = await admin.from('ai_generation_jobs').select('*')
          .eq('user_id', input.userId).eq('idempotency_key', input.idempotencyKey).maybeSingle()
        if (replay.data) return mapJob(replay.data)
        throw new HttpError(503, 'generation_job_unavailable', 'Generation jobs are unavailable.')
      }
      await admin.from('monthly_plan_periods').update({
        generation_job_id: data.id,
        status: 'provider_started',
      }).eq('id', input.periodId).eq('user_id', input.userId)
      return mapJob(data)
    },

    reserveUsage: (userId, idempotencyKey, requestSha256) =>
      reserveAiUsage(admin, userId, 'plan_generation', idempotencyKey, requestSha256),

    async claimJob(userId, jobId) {
      const { data, error } = await admin.rpc('claim_generation_job', {
        p_user_id: userId,
        p_job_id: jobId,
      })
      if (error || !isRecord(data) || !isRecord(data.job)) {
        throw new HttpError(503, 'generation_job_unavailable', 'Generation jobs are unavailable.')
      }
      return { claimed: data.claimed === true, job: mapJob(data.job) }
    },

    async setJobStatus(jobId, status, patch = {}) {
      const mapped = status === 'ready' ? 'ready' : status
      const update: Record<string, unknown> = { status: mapped }
      if (patch.errorCode !== undefined) update.error_code = patch.errorCode
      if (patch.openaiResponseId !== undefined) update.openai_response_id = patch.openaiResponseId
      if (patch.model !== undefined) update.model = patch.model
      if (patch.promptVersion !== undefined) update.prompt_version = patch.promptVersion
      if (mapped === 'ready' || mapped === 'failed') update.finished_at = new Date().toISOString()
      const { error } = await admin.from('ai_generation_jobs').update(update).eq('id', jobId)
      if (error) {
        throw new HttpError(503, 'generation_job_unavailable', 'Generation jobs are unavailable.')
      }
      if (mapped === 'failed') {
        await admin.from('monthly_plan_periods').update({
          status: patch.errorCode === 'PLAN_VALIDATION_FAILED'
            ? 'failed_validation'
            : patch.errorCode === 'PLAN_IMPORT_FAILED'
            ? 'failed_import'
            : 'failed_provider',
        }).eq('generation_job_id', jobId)
      }
    },

    async importPlan(input) {
      const window = cycleDateWindow(new Date().toISOString(), input.timezone)
      const { data, error } = await admin.rpc('persist_generated_plan_and_finalize', {
        p_user_id: input.userId,
        p_job_id: input.jobId,
        p_goal_id: input.goalId,
        p_plan_name: input.planName,
        p_valid_from: window.validFrom,
        p_valid_to: window.validTo,
        p_locale: input.locale,
        p_schema_version: PLAN_SCHEMA_VERSION,
        p_prompt_version: input.promptVersion,
        p_model: input.model,
        p_openai_response_id: input.providerResponseId,
        p_content: input.content,
        p_content_sha256: input.contentSha256,
        p_reservation_id: input.reservation.id,
        p_attempt_token: input.reservation.attemptToken,
        p_input_tokens: input.usage.inputTokens ?? null,
        p_output_tokens: input.usage.outputTokens ?? null,
        p_cached_input_tokens: input.usage.cachedInputTokens ?? null,
        p_reasoning_tokens: input.usage.reasoningTokens ?? null,
      })
      if (
        error || !isRecord(data) || typeof data.plan_id !== 'string' ||
        typeof data.plan_version_id !== 'string'
      ) {
        await finalizeAiUsage(admin, input.reservation, 'released').catch(() => undefined)
        throw new HttpError(500, 'PLAN_IMPORT_FAILED', 'The validated plan could not be imported.')
      }
      return {
        planId: data.plan_id,
        planVersionId: data.plan_version_id,
        importedAt: typeof data.imported_at === 'string'
          ? data.imported_at
          : new Date().toISOString(),
      } satisfies ImportedPlan
    },
  }
}
