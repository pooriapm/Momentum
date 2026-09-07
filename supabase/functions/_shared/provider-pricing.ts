/**
 * Versioned OpenAI short-context list rates for Momentum plan generation.
 * Source: https://developers.openai.com/api/docs/pricing (verified 2026-09-07).
 * Batch and Flex are half of Standard short-context rates per OpenAI docs.
 */
export const PRICING_TABLE_VERSION = 'openai-pricing/2026-09-07'

export type ServiceTier = 'standard' | 'batch' | 'flex'
export type CostCertainty = 'measured' | 'estimated' | 'unknown'

export interface ModelRateCard {
  modelId: string
  label: 'terra' | 'luna' | 'sol' | 'other'
  /** USD per 1M tokens */
  inputPerMillion: number
  cachedInputPerMillion: number
  /** Cache writes when the provider reports them; do not invent. */
  cacheWritePerMillion: number | null
  outputPerMillion: number
}

/** Short-context Standard list rates. */
export const STANDARD_RATES: Readonly<Record<string, ModelRateCard>> = {
  'gpt-5.6-terra': {
    modelId: 'gpt-5.6-terra',
    label: 'terra',
    inputPerMillion: 2.0,
    cachedInputPerMillion: 0.2,
    cacheWritePerMillion: 2.5,
    outputPerMillion: 12.0,
  },
  'gpt-5.6-luna': {
    modelId: 'gpt-5.6-luna',
    label: 'luna',
    inputPerMillion: 0.2,
    cachedInputPerMillion: 0.02,
    cacheWritePerMillion: 0.25,
    outputPerMillion: 1.2,
  },
  'gpt-5.6-sol': {
    modelId: 'gpt-5.6-sol',
    label: 'sol',
    inputPerMillion: 4.0,
    cachedInputPerMillion: 0.4,
    cacheWritePerMillion: 5.0,
    outputPerMillion: 20.0,
  },
}

export interface NormalizedTokenUsage {
  /** Uncached billable input tokens (total input − cached reads). */
  uncachedInputTokens: number | null
  cachedInputTokens: number | null
  cacheWriteTokens: number | null
  /** Total billable output tokens (includes reasoning when provider embeds them). */
  outputTokens: number | null
  /** Breakdown only; not added again when already included in output. */
  reasoningTokens: number | null
}

export interface CostCalculation {
  pricingTableVersion: typeof PRICING_TABLE_VERSION
  modelId: string
  serviceTier: ServiceTier
  usd: number | null
  microusd: number | null
  certainty: CostCertainty
  notes: string[]
}

function rateFor(modelId: string, serviceTier: ServiceTier): ModelRateCard | null {
  const base = STANDARD_RATES[modelId]
  if (!base) return null
  if (serviceTier === 'standard') return base
  // Batch and Flex are half of Standard short-context rates.
  return {
    ...base,
    inputPerMillion: base.inputPerMillion / 2,
    cachedInputPerMillion: base.cachedInputPerMillion / 2,
    cacheWritePerMillion: base.cacheWritePerMillion === null
      ? null
      : base.cacheWritePerMillion / 2,
    outputPerMillion: base.outputPerMillion / 2,
  }
}

/**
 * Normalize provider usage without double-counting.
 * - cached tokens are subtracted from total input for uncached billing
 * - reasoning is a breakdown of output, not an extra billable quantity
 * - cache-write is only set when the API provides it
 * - unknown quantities stay null (never silently zero for cost)
 */
export function normalizeProviderUsage(raw: {
  inputTokens?: number | null
  outputTokens?: number | null
  cachedInputTokens?: number | null
  cacheWriteTokens?: number | null
  reasoningTokens?: number | null
  usageKnown?: boolean
}): NormalizedTokenUsage {
  if (raw.usageKnown === false) {
    return {
      uncachedInputTokens: null,
      cachedInputTokens: null,
      cacheWriteTokens: null,
      outputTokens: null,
      reasoningTokens: null,
    }
  }

  const input = typeof raw.inputTokens === 'number' && Number.isFinite(raw.inputTokens)
    ? Math.max(0, Math.floor(raw.inputTokens))
    : null
  const cached = typeof raw.cachedInputTokens === 'number' &&
      Number.isFinite(raw.cachedInputTokens)
    ? Math.max(0, Math.floor(raw.cachedInputTokens))
    : null
  const cacheWrite = typeof raw.cacheWriteTokens === 'number' &&
      Number.isFinite(raw.cacheWriteTokens)
    ? Math.max(0, Math.floor(raw.cacheWriteTokens))
    : null
  const output = typeof raw.outputTokens === 'number' && Number.isFinite(raw.outputTokens)
    ? Math.max(0, Math.floor(raw.outputTokens))
    : null
  const reasoning = typeof raw.reasoningTokens === 'number' &&
      Number.isFinite(raw.reasoningTokens)
    ? Math.max(0, Math.floor(raw.reasoningTokens))
    : null

  let uncached: number | null = null
  if (input !== null) {
    uncached = cached !== null ? Math.max(0, input - cached) : input
  }

  return {
    uncachedInputTokens: uncached,
    cachedInputTokens: cached,
    cacheWriteTokens: cacheWrite,
    outputTokens: output,
    reasoningTokens: reasoning,
  }
}

export function calculateProviderCost(input: {
  modelId: string
  serviceTier?: ServiceTier
  usage: NormalizedTokenUsage
}): CostCalculation {
  const serviceTier = input.serviceTier ?? 'standard'
  const notes: string[] = []
  const card = rateFor(input.modelId, serviceTier)
  if (!card) {
    return {
      pricingTableVersion: PRICING_TABLE_VERSION,
      modelId: input.modelId,
      serviceTier,
      usd: null,
      microusd: null,
      certainty: 'unknown',
      notes: ['No rate card for model; cost left unknown.'],
    }
  }

  const { usage } = input
  if (
    usage.uncachedInputTokens === null ||
    usage.outputTokens === null
  ) {
    return {
      pricingTableVersion: PRICING_TABLE_VERSION,
      modelId: input.modelId,
      serviceTier,
      usd: null,
      microusd: null,
      certainty: 'unknown',
      notes: ['Required token counts missing; cost left unknown.'],
    }
  }

  const cached = usage.cachedInputTokens ?? 0
  let usd =
    (usage.uncachedInputTokens / 1_000_000) * card.inputPerMillion +
    (cached / 1_000_000) * card.cachedInputPerMillion +
    (usage.outputTokens / 1_000_000) * card.outputPerMillion

  if (usage.cacheWriteTokens !== null && usage.cacheWriteTokens > 0) {
    if (card.cacheWritePerMillion === null) {
      notes.push('Cache-write tokens present but rate card has no write rate; omitted.')
    } else {
      usd += (usage.cacheWriteTokens / 1_000_000) * card.cacheWritePerMillion
    }
  }

  if (usage.reasoningTokens !== null) {
    notes.push(
      'Reasoning tokens recorded as output breakdown only; not billed separately.',
    )
  }

  const microusd = Math.round(usd * 1_000_000)
  return {
    pricingTableVersion: PRICING_TABLE_VERSION,
    modelId: input.modelId,
    serviceTier,
    usd,
    microusd,
    certainty: 'estimated',
    notes,
  }
}

/** Primary metric helper: total spend ÷ successfully delivered quality-approved plans. */
export function costPerDeliveredPlan(
  totalProviderSpendUsd: number,
  successfullyDeliveredPlans: number,
): number | null {
  if (successfullyDeliveredPlans <= 0) return null
  return totalProviderSpendUsd / successfullyDeliveredPlans
}

export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null
  const rank = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1))
  return sortedAsc[rank] ?? null
}
