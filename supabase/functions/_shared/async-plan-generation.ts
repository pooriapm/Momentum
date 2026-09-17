import { optionalEnv } from './config.ts'
import type { ServiceTier } from './provider-pricing.ts'

export const ASYNC_GENERATION_VERSION = 'momentum-async-generation/1.0.0'

export type AsyncJobStatus =
  | 'queued'
  | 'submitted'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'canceled'
  | 'failed'
  | 'fallback_standard'

/**
 * Optional async Batch/Flex path for renewals only.
 * Disabled by default. First-plan generation stays on standard/synchronous.
 */
export interface AsyncGenerationState {
  version: typeof ASYNC_GENERATION_VERSION
  enabled: boolean
  service_tier: ServiceTier
  status: AsyncJobStatus
  provider_batch_id: string | null
  submitted_at: string | null
  expires_at: string | null
  fallback_spent_microusd: number
  fallback_budget_microusd: number
  profile_fingerprint: string
  checkin_ready: boolean
}

export function createAsyncGenerationState(input: {
  isRenewal: boolean
  serviceTier: ServiceTier
  profileFingerprint: string
  checkinReady: boolean
  fallbackBudgetMicrousd?: number
}): AsyncGenerationState | null {
  const enabled = optionalEnv('AI_PLAN_ASYNC_RENEWAL_ENABLED')?.toLowerCase() === 'true'
  if (!enabled || !input.isRenewal) return null
  if (input.serviceTier === 'standard') return null
  if (!input.checkinReady) {
    return {
      version: ASYNC_GENERATION_VERSION,
      enabled: true,
      service_tier: input.serviceTier,
      status: 'queued',
      provider_batch_id: null,
      submitted_at: null,
      expires_at: null,
      fallback_spent_microusd: 0,
      fallback_budget_microusd: input.fallbackBudgetMicrousd ?? 480_000,
      profile_fingerprint: input.profileFingerprint,
      checkin_ready: false,
    }
  }
  return {
    version: ASYNC_GENERATION_VERSION,
    enabled: true,
    service_tier: input.serviceTier,
    status: 'queued',
    provider_batch_id: null,
    submitted_at: null,
    expires_at: null,
    fallback_spent_microusd: 0,
    fallback_budget_microusd: input.fallbackBudgetMicrousd ?? 480_000,
    profile_fingerprint: input.profileFingerprint,
    checkin_ready: true,
  }
}

/**
 * Prevent double-charging when falling back from Batch/Flex to standard.
 * Returns false when fallback budget is exhausted.
 */
export function canFallbackToStandard(
  state: AsyncGenerationState,
  estimatedMicrousd: number,
): boolean {
  if (state.status === 'completed' || state.status === 'canceled') return false
  return state.fallback_spent_microusd + estimatedMicrousd <= state.fallback_budget_microusd
}

export function markAsyncFallback(
  state: AsyncGenerationState,
  spentMicrousd: number,
): AsyncGenerationState {
  return {
    ...state,
    status: 'fallback_standard',
    service_tier: 'standard',
    fallback_spent_microusd: state.fallback_spent_microusd + spentMicrousd,
  }
}

export function profileMateriallyChanged(
  previousFingerprint: string,
  currentFingerprint: string,
): boolean {
  return previousFingerprint !== currentFingerprint
}
