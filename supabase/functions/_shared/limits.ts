import type { SupabaseClient } from '@supabase/supabase-js'
import { integerEnv } from './config.ts'
import { HttpError } from './http.ts'

export async function enforceAiCircuitBreaker(admin: SupabaseClient): Promise<void> {
  const { data, error } = await admin.rpc('consume_ai_circuit_breaker', {
    p_limit: integerEnv('AI_MAX_REQUESTS_PER_DAY', 1_000, {
      min: 1,
      max: 1_000_000,
    }),
    p_window_seconds: integerEnv('AI_CIRCUIT_WINDOW_SECONDS', 86_400, {
      min: 3_600,
      max: 604_800,
    }),
  })
  if (error) {
    throw new HttpError(
      503,
      'ai_circuit_breaker_unavailable',
      'AI request protection is unavailable.',
    )
  }
  if (data !== true) {
    throw new HttpError(503, 'ai_circuit_open', 'AI capacity is temporarily paused.')
  }
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await admin.rpc('consume_api_rate_limit', {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    throw new HttpError(503, 'rate_limit_unavailable', 'Request protection is unavailable.')
  }
  if (data !== true) {
    throw new HttpError(429, 'rate_limit_exceeded', 'Too many requests. Try again later.')
  }
}

export async function reserveAiUsage(
  admin: SupabaseClient,
  userId: string,
  feature: 'plan_generation',
  idempotencyKey: string,
  requestSha256: string,
): Promise<AiReservation> {
  const { error: reconciliationError } = await admin.rpc('release_stale_ai_reservations', {
    p_user_id: userId,
    p_max_age_seconds: integerEnv('AI_RESERVATION_MAX_AGE_SECONDS', 600, {
      min: 480,
      max: 86_400,
    }),
  })
  if (reconciliationError) {
    throw new HttpError(503, 'usage_reconciliation_failed', 'AI usage could not be reconciled.')
  }
  const { data, error } = await admin.rpc('reserve_ai_request', {
    p_user_id: userId,
    p_feature: feature,
    p_idempotency_key: idempotencyKey,
    p_request_sha256: requestSha256,
  })

  if (error) {
    if (error.message.includes('idempotency_key_reused')) {
      throw new HttpError(
        409,
        'idempotency_key_reused',
        'Idempotency key was used for different input.',
      )
    }
    if (error.message.includes('quota_exceeded')) {
      throw new HttpError(402, 'quota_exceeded', 'The AI allowance for this period is exhausted.')
    }
    if (error.message.includes('entitlement_required')) {
      throw new HttpError(402, 'entitlement_required', 'An active entitlement is required.')
    }
    throw new HttpError(503, 'usage_reservation_failed', 'AI usage could not be reserved.')
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.reservation_id !== 'string' ||
    typeof data.attempt_token !== 'string' ||
    typeof data.state !== 'string' ||
    !['new', 'in_progress', 'completed', 'failed', 'released'].includes(data.state)
  ) {
    throw new HttpError(503, 'usage_reservation_failed', 'AI usage could not be reserved.')
  }
  return {
    id: data.reservation_id,
    attemptToken: data.attempt_token,
    state: data.state as AiReservation['state'],
  }
}

export interface AiReservation {
  id: string
  attemptToken: string
  state: 'new' | 'in_progress' | 'completed' | 'failed' | 'released'
}

export interface ProviderUsage {
  inputTokens?: number
  outputTokens?: number
  cachedInputTokens?: number
  reasoningTokens?: number
}

export async function finalizeAiUsage(
  admin: SupabaseClient,
  reservation: Pick<AiReservation, 'id' | 'attemptToken'>,
  status: 'completed' | 'failed' | 'released',
  usage: ProviderUsage = {},
): Promise<void> {
  const { error } = await admin.rpc('finalize_ai_request', {
    p_reservation_id: reservation.id,
    p_attempt_token: reservation.attemptToken,
    p_status: status,
    p_input_tokens: usage.inputTokens ?? null,
    p_output_tokens: usage.outputTokens ?? null,
    p_cached_input_tokens: usage.cachedInputTokens ?? null,
    p_reasoning_tokens: usage.reasoningTokens ?? null,
    p_provider_cost_microusd: null,
  })

  if (error) {
    throw new HttpError(503, 'usage_finalization_failed', 'AI usage could not be finalized.')
  }
}
