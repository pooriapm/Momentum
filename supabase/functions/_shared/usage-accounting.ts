import {
  calculateProviderCost,
  normalizeProviderUsage,
  type CostCertainty,
  type CostCalculation,
  type ServiceTier,
  PRICING_TABLE_VERSION,
} from './provider-pricing.ts'
import { PROFILE_SNAPSHOT_VERSION } from './generation-profile-snapshot.ts'

export type AttemptOutcome =
  | 'accepted'
  | 'validation_failed'
  | 'persistence_failed'
  | 'provider_failed'
  | 'repair_applied'
  | 'canceled'

export type ValidationFailureCategory =
  | 'schema'
  | 'catalog_reference'
  | 'allergen'
  | 'equipment'
  | 'nutrition_arithmetic'
  | 'day_coverage'
  | 'safety'
  | 'other'
  | null

/**
 * Per-provider-attempt ledger row. Chargeable even when delivery fails.
 * Keeps budget reservation, provider spend, entitlement, and delivery separate.
 */
export interface ProviderAttemptLedger {
  ledger_version: 'momentum-usage-attempt/1.0.0'
  generation_job_id: string
  cycle_index: number
  attempt_id: string
  attempt_number: number
  model: string
  service_tier: ServiceTier
  prompt_version: string
  schema_version: string
  catalog_release_id: string
  pricing_table_version: typeof PRICING_TABLE_VERSION
  profile_snapshot_version: typeof PROFILE_SNAPSHOT_VERSION
  input_tokens: number | null
  cached_input_tokens: number | null
  cache_write_tokens: number | null
  output_tokens: number | null
  reasoning_tokens: number | null
  provider_response_id: string | null
  latency_ms: number | null
  outcome: AttemptOutcome
  validation_failure_category: ValidationFailureCategory
  cost_usd: number | null
  cost_microusd: number | null
  cost_certainty: CostCertainty
  cost_notes: string[]
  /** True when this attempt consumed entitlement budget reservation capacity. */
  reservation_consumed: boolean
  /** True only after quality-approved plan was persisted for the user. */
  delivery_succeeded: boolean
}

export function buildAttemptLedger(input: {
  generationJobId: string
  cycleIndex: number
  attemptId: string
  attemptNumber: number
  model: string
  serviceTier?: ServiceTier
  promptVersion: string
  schemaVersion: string
  catalogReleaseId: string
  usage: {
    inputTokens?: number | null
    outputTokens?: number | null
    cachedInputTokens?: number | null
    cacheWriteTokens?: number | null
    reasoningTokens?: number | null
    usageKnown?: boolean
  }
  providerResponseId: string | null
  latencyMs: number | null
  outcome: AttemptOutcome
  validationFailureCategory?: ValidationFailureCategory
  reservationConsumed: boolean
  deliverySucceeded: boolean
}): ProviderAttemptLedger {
  const serviceTier = input.serviceTier ?? 'standard'
  const normalized = normalizeProviderUsage(input.usage)
  const cost: CostCalculation = calculateProviderCost({
    modelId: input.model,
    serviceTier,
    usage: normalized,
  })

  return {
    ledger_version: 'momentum-usage-attempt/1.0.0',
    generation_job_id: input.generationJobId,
    cycle_index: input.cycleIndex,
    attempt_id: input.attemptId,
    attempt_number: input.attemptNumber,
    model: input.model,
    service_tier: serviceTier,
    prompt_version: input.promptVersion,
    schema_version: input.schemaVersion,
    catalog_release_id: input.catalogReleaseId,
    pricing_table_version: PRICING_TABLE_VERSION,
    profile_snapshot_version: PROFILE_SNAPSHOT_VERSION,
    input_tokens: typeof input.usage.inputTokens === 'number'
      ? input.usage.inputTokens
      : null,
    cached_input_tokens: normalized.cachedInputTokens,
    cache_write_tokens: normalized.cacheWriteTokens,
    output_tokens: normalized.outputTokens,
    reasoning_tokens: normalized.reasoningTokens,
    provider_response_id: input.providerResponseId,
    latency_ms: input.latencyMs,
    outcome: input.outcome,
    validation_failure_category: input.validationFailureCategory ?? null,
    cost_usd: cost.usd,
    cost_microusd: cost.microusd,
    cost_certainty: cost.certainty,
    cost_notes: cost.notes,
    reservation_consumed: input.reservationConsumed,
    delivery_succeeded: input.deliverySucceeded,
  }
}

export function classifyValidationFailure(code: string): ValidationFailureCategory {
  if (
    code === 'allergen_in_generated_plan' ||
    code === 'unmapped_declared_allergen'
  ) return 'allergen'
  if (
    code === 'unknown_catalog_id' ||
    code === 'catalog_food_modified' ||
    code === 'invalid_food_meal_type'
  ) return 'catalog_reference'
  if (
    code === 'invalid_exercise_equipment' ||
    code === 'invalid_exercise_substitution'
  ) return 'equipment'
  if (code === 'PLAN_VALIDATION_FAILED' || code === 'invalid_plan_output') {
    return 'schema'
  }
  if (code.includes('nutrition') || code.includes('calorie')) return 'nutrition_arithmetic'
  if (code.includes('day') || code.includes('duplicate')) return 'day_coverage'
  if (code.includes('SAFETY') || code.includes('safety')) return 'safety'
  return 'other'
}
