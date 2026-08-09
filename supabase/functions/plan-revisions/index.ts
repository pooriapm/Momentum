import { authenticate } from '../_shared/auth.ts'
import { canonicalJson, sha256 } from '../_shared/crypto.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  requireIdempotencyKey,
} from '../_shared/http.ts'
import { enforceRateLimit } from '../_shared/limits.ts'
import { loadPlanCatalog, resolveDeclaredAllergenIds } from '../_shared/plan-catalog.ts'
import { assertGeneratedPlan } from '../_shared/plan-contract.ts'
import { recalibratePlan, type RecalibrationTrend } from '../_shared/plan-recalibration.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface RevisionBody {
  action?: unknown
  revision_id?: unknown
  reason?: unknown
}

function average(values: unknown[]): number | null {
  const numbers = values.map(Number).filter(Number.isFinite)
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null
}

function parseRevisionId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(400, 'invalid_revision_id', 'Revision ID is invalid.')
  }
  return value
}

function mapRpcError(message: string): HttpError {
  const errors: Array<[string, number, string, string]> = [
    ['idempotency_key_reused', 409, 'idempotency_key_reused', 'Idempotency key was reused.'],
    [
      'active_entitlement_required',
      403,
      'active_entitlement_required',
      'An active entitlement is required.',
    ],
    ['active_plan_not_found', 404, 'active_plan_not_found', 'An active plan is required.'],
    [
      'plan_version_changed',
      409,
      'plan_version_changed',
      'The active plan changed. Refresh and retry.',
    ],
    [
      'recalibration_preview_exists',
      409,
      'recalibration_preview_exists',
      'A preview already exists.',
    ],
    ['recalibration_not_found', 404, 'recalibration_not_found', 'Recalibration was not found.'],
    [
      'recalibration_not_preview',
      409,
      'recalibration_not_preview',
      'Recalibration is not awaiting confirmation.',
    ],
    [
      'recalibration_preview_expired',
      409,
      'recalibration_preview_expired',
      'Recalibration preview expired.',
    ],
    ['recalibration_not_active', 409, 'recalibration_not_active', 'Recalibration is not active.'],
    [
      'recalibration_activity_locked',
      409,
      'recalibration_activity_locked',
      'Logged activity prevents rollback.',
    ],
  ]
  const match = errors.find(([needle]) => message.includes(needle))
  return match
    ? new HttpError(match[1], match[2], match[3])
    : new HttpError(503, 'recalibration_mutation_failed', 'Plan recalibration is unavailable.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)
  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST') {
      throw new HttpError(405, 'method_not_allowed', 'Only POST is supported.')
    }
    const auth = await authenticate(request)
    const body = await readJsonBody<RevisionBody>(request, 4_096)
    await enforceRateLimit(auth.admin, auth.user.id, 'plan-revisions', 12, 3600)

    if (body.action === 'status') {
      const { data, error } = await auth.admin
        .from('plan_recalibrations')
        .select(
          'id,status,plan_id,from_version_id,candidate_version_id,change_reason,diff,expires_at,confirmed_at,rolled_back_at,created_at',
        )
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        throw new HttpError(
          503,
          'recalibration_status_failed',
          'Recalibration status is unavailable.',
        )
      }
      const revision = data?.status === 'preview' &&
          new Date(data.expires_at).getTime() <= Date.now()
        ? { ...data, status: 'expired' }
        : data
      return jsonResponse(request, { revision: revision ?? null })
    }

    const idempotencyKey = requireIdempotencyKey(request)
    if (body.action === 'confirm' || body.action === 'rollback') {
      const revisionId = parseRevisionId(body.revision_id)
      const input = { action: body.action, revision_id: revisionId }
      const requestHash = await sha256(canonicalJson(input))
      const rpc = body.action === 'confirm'
        ? 'confirm_plan_recalibration'
        : 'rollback_plan_recalibration'
      const { data, error } = await auth.admin.rpc(rpc, {
        p_user_id: auth.user.id,
        p_revision_id: revisionId,
        p_idempotency_key: idempotencyKey,
        p_request_sha256: requestHash,
      })
      if (error) throw mapRpcError(error.message)
      return jsonResponse(request, { revision: data })
    }

    if (body.action !== 'preview') {
      throw new HttpError(400, 'unsupported_action', 'Revision action is unsupported.')
    }
    const reason = body.reason === undefined ? undefined : String(body.reason).trim()
    if (reason && reason.length > 500) {
      throw new HttpError(400, 'invalid_recalibration_reason', 'Reason is too long.')
    }

    const [planResult, dailyResult, weeklyResult, preferenceResult] = await Promise.all([
      auth.admin.from('plans')
        .select(
          'id,active_version_id,locale,plan_versions!plans_active_version_fk(id,schema_version,content)',
        )
        .eq('user_id', auth.user.id).eq('status', 'active').maybeSingle(),
      auth.admin.from('daily_checkins')
        .select('local_date,adherence_percent,recovery_score,pain_score,safety_level')
        .eq('user_id', auth.user.id).order('local_date', { ascending: false }).limit(7),
      auth.admin.from('weekly_checkins')
        .select(
          'recovery_trend,training_trend,pain_trend,circumstances_changed,condition_change,change_notes,safety_level,trend_summary',
        )
        .eq('user_id', auth.user.id).order('week_start', { ascending: false }).limit(1)
        .maybeSingle(),
      auth.admin.from('dietary_preferences').select('allergies')
        .eq('user_id', auth.user.id).maybeSingle(),
    ])
    if (
      planResult.error || dailyResult.error || weeklyResult.error || preferenceResult.error ||
      !planResult.data?.active_version_id
    ) {
      throw new HttpError(
        503,
        'recalibration_context_failed',
        'Recalibration context is unavailable.',
      )
    }
    const versionRelation = planResult.data.plan_versions
    const version = Array.isArray(versionRelation) ? versionRelation[0] : versionRelation
    if (!version || typeof version.content !== 'object' || !version.content) {
      throw new HttpError(409, 'plan_not_recalibratable', 'The active plan cannot be recalibrated.')
    }
    if (weeklyResult.data?.safety_level === 'urgent') {
      throw new HttpError(
        409,
        'clinical_review_required',
        'Urgent check-in signals require human review.',
      )
    }
    const daily = dailyResult.data ?? []
    const weekly = weeklyResult.data
    const trend: RecalibrationTrend = {
      dailyCount: daily.length,
      averageAdherence: average(daily.map((item) => item.adherence_percent)),
      averageRecovery: average(daily.map((item) => item.recovery_score)),
      averagePain: average(daily.map((item) => item.pain_score)),
      weeklyRecovery: weekly?.recovery_trend ?? null,
      weeklyTraining: weekly?.training_trend ?? null,
      weeklyPain: weekly?.pain_trend ?? null,
      circumstancesChanged: weekly?.circumstances_changed ?? false,
      conditionChange: weekly?.condition_change ?? null,
      changeNotes: weekly?.change_notes ?? null,
    }
    const locale = planResult.data.locale as 'fa-IR' | 'en-US'
    const recalibrated = recalibratePlan(
      version.content as Record<string, unknown>,
      trend,
      locale,
      reason,
    )
    const catalog = await loadPlanCatalog(auth.admin)
    const declaredAllergenIds = resolveDeclaredAllergenIds(
      catalog,
      Array.isArray(preferenceResult.data?.allergies)
        ? preferenceResult.data.allergies.map(String)
        : [],
    )
    const days = Array.isArray(recalibrated.content.days) ? recalibrated.content.days.length : 0
    assertGeneratedPlan(recalibrated.content, days, locale, { catalog, declaredAllergenIds })
    const triggerSource = daily.length >= 3 && weekly
      ? 'mixed'
      : weekly
      ? 'weekly_checkin'
      : 'daily_trend'
    const input = {
      action: 'preview',
      plan_id: planResult.data.id,
      from_version_id: version.id,
      reason: reason ?? null,
      trend,
    }
    const requestHash = await sha256(canonicalJson(input))
    const contentHash = await sha256(canonicalJson(recalibrated.content))
    const { data, error } = await auth.admin.rpc('create_plan_recalibration_preview', {
      p_user_id: auth.user.id,
      p_plan_id: planResult.data.id,
      p_from_version_id: version.id,
      p_content: recalibrated.content,
      p_content_sha256: contentHash,
      p_change_reason: recalibrated.changeReason,
      p_trend_snapshot: trend,
      p_diff: recalibrated.diff,
      p_trigger_source: triggerSource,
      p_idempotency_key: idempotencyKey,
      p_request_sha256: requestHash,
    })
    if (error) throw mapRpcError(error.message)
    return jsonResponse(request, { revision: data }, 201)
  } catch (error) {
    return errorResponse(request, error)
  }
})
