import type { SupabaseClient } from '@supabase/supabase-js'
import { mapGiftReservationError } from './gift-campaign.ts'
import { buildGenerationProfileSnapshot } from './generation-profile-snapshot.ts'
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
  type SavedGeneration,
  PLAN_SCHEMA_VERSION,
} from './monthly-generation.ts'
import { loadPlanCatalog } from './plan-catalog.ts'
import type { ProviderAttemptLedger } from './usage-accounting.ts'

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
    requestedDays: Number(row.requested_days ?? 30),
    requestFingerprint: String(row.request_fingerprint),
    promptVersion: String(row.prompt_version),
    model: String(row.model),
    attemptCount: Number(row.attempt_count ?? 0),
    errorCode: text(row.error_code),
    openaiResponseId: text(row.openai_response_id),
    savedGeneration: isRecord(row.saved_generation) ? row.saved_generation as unknown as SavedGeneration : null,
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
      const [
        profileResult,
        prefsResult,
        goalResult,
        healthResult,
        trainingResult,
        measurementResult,
        periodResult,
      ] = await Promise.all([
        admin.from('profiles').select(
          'user_id,locale,timezone,country_code,product_region,onboarding_status,automation_block_reason,terms_accepted_at,terms_version,privacy_accepted_at,privacy_version,health_data_consent_at,health_consent_version,date_of_birth,sex,height_cm',
        ).eq('user_id', userId).single(),
        admin.from('dietary_preferences').select(
          'dietary_pattern,favorite_foods,disliked_foods,allergies,requested_meal_pattern,preferred_option_count,cooking_constraints,available_equipment,work_schedule,budget_tier,restaurant_meals_per_week,restaurant_preferences,grocery_preferences,cuisine_region,training_location,training_experience',
        ).eq('user_id', userId).maybeSingle(),
        admin.from('goals').select(
          'id,goal_type,start_weight_kg,target_weight_kg,target_date',
        ).eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle(),
        admin.from('health_context').select(
          'medical_considerations,medications,supplements',
        ).eq('user_id', userId).maybeSingle(),
        admin.from('training_schedule_items').select(
          'weekday,activity_type,local_start_time,duration_minutes,intensity,notes',
        ).eq('user_id', userId).order('weekday'),
        admin.from('body_composition_measurements').select(
          'measured_at,weight_kg,body_fat_percent,waist_cm,source_type,extraction_status',
        ).eq('user_id', userId)
          .in('extraction_status', ['confirmed', 'not_requested'])
          .order('measured_at', { ascending: false }).limit(3),
        admin.from('monthly_plan_periods').select('cycle_index')
          .eq('user_id', userId).order('cycle_index', { ascending: false }).limit(1)
          .maybeSingle(),
      ])
      if (profileResult.error || !profileResult.data) {
        throw new HttpError(
          409,
          'CONSENT_REQUIRED',
          'Complete onboarding before generating a plan.',
        )
      }
      if ([prefsResult, goalResult, healthResult, trainingResult, measurementResult, periodResult].some((result) => result.error)) {
        throw new HttpError(503, 'profile_context_unavailable', 'Your plan preferences could not be loaded.')
      }
      const row = profileResult.data
      const allergies = Array.isArray(prefsResult.data?.allergies)
        ? prefsResult.data.allergies.filter((item: unknown): item is string =>
          typeof item === 'string'
        )
        : []
      const cycleIndex = Number(periodResult.data?.cycle_index ?? 1)
      const snapshot = buildGenerationProfileSnapshot({
        profile: row,
        goal: goalResult.data,
        dietary: prefsResult.data,
        health: healthResult.data,
        training: trainingResult.data ?? [],
        measurements: (measurementResult.data ?? []).map((item) => ({
          measured_at: item.measured_at,
          weight_kg: item.weight_kg,
          body_fat_percent: item.body_fat_percent,
          waist_cm: item.waist_cm,
          source: item.source_type,
          extraction_status: item.extraction_status,
        })),
        cycleIndex,
      })
      return {
        userId,
        countryCode: typeof row.country_code === 'string' ? row.country_code : null,
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
        snapshot,
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

    async findJobByPeriod(userId, periodId) {
      const { data, error } = await admin.from('ai_generation_jobs').select('*')
        .eq('user_id', userId).eq('period_id', periodId).maybeSingle()
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
          .eq('user_id', input.userId).eq('period_id', input.periodId).maybeSingle()
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
        p_provider_cost_microusd: input.usage.providerCostMicrousd ?? null,
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

    async saveGeneration(jobId, saved) {
      const { error } = await admin.from('ai_generation_jobs').update({ saved_generation: saved }).eq('id', jobId)
      if (error) throw new HttpError(503, 'PLAN_IMPORT_FAILED', 'The generated plan could not be saved for recovery.')
    },

    async recordAttempt(attempt: ProviderAttemptLedger) {
      const { error } = await admin.from('ai_usage_attempts').upsert({
        id: attempt.attempt_id,
        generation_job_id: attempt.generation_job_id,
        cycle_index: attempt.cycle_index,
        attempt_number: attempt.attempt_number,
        model: attempt.model,
        service_tier: attempt.service_tier,
        prompt_version: attempt.prompt_version,
        schema_version: attempt.schema_version,
        catalog_release_id: attempt.catalog_release_id,
        pricing_table_version: attempt.pricing_table_version,
        profile_snapshot_version: attempt.profile_snapshot_version,
        input_tokens: attempt.input_tokens,
        cached_input_tokens: attempt.cached_input_tokens,
        cache_write_tokens: attempt.cache_write_tokens,
        output_tokens: attempt.output_tokens,
        reasoning_tokens: attempt.reasoning_tokens,
        provider_response_id: attempt.provider_response_id,
        latency_ms: attempt.latency_ms,
        outcome: attempt.outcome,
        validation_failure_category: attempt.validation_failure_category,
        cost_microusd: attempt.cost_microusd,
        cost_certainty: attempt.cost_certainty,
        cost_notes: attempt.cost_notes,
        reservation_consumed: attempt.reservation_consumed,
        delivery_succeeded: attempt.delivery_succeeded,
        ledger_payload: attempt,
      }, { onConflict: 'id' })
      if (error) {
        throw new HttpError(503, 'usage_attempt_unavailable', 'Provider usage could not be recorded.')
      }
    },
  }
}
