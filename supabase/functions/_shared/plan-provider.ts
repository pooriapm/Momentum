import { integerEnv, optionalEnv } from './config.ts'
import {
  catalogSubsetPromptContext,
  selectCatalogSubset,
} from './catalog-subset.ts'
import {
  COMPACT_SCHEMA_VERSION,
  compactPlanJsonSchema,
} from './compact-plan-contract.ts'
import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import {
  assertLiveOpenAiEnabled,
  createStructuredResponse,
  hashedSafetyIdentifier,
} from './openai.ts'
import { planCatalogPromptContext, type PlanCatalogSnapshot } from './plan-catalog.ts'
import { resolveDeclaredAllergenIds } from './plan-catalog.ts'
import { generatedPlanJsonSchema } from './plan-contract.ts'
import {
  isCompactSchemaEnabled,
  resolvePlanModelRoute,
} from './plan-model-routing.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import type { ServiceTier } from './provider-pricing.ts'
import { buildMonthlyStubPlan } from './starter-plan.ts'

export { MONTHLY_PLAN_DAYS } from './plan-period.ts'

export const STUB_PLAN_MODEL = 'stub:momentum-monthly@1'
export const STUB_PROMPT_VERSION = 'momentum-monthly-stub/1.0.0'
export const OPENAI_PROMPT_VERSION = 'momentum-monthly-openai/2.0.0'
export const PLAN_SCHEMA_VERSION = '1.0.0'

export interface GeneratedPlanResult {
  content: Record<string, unknown>
  model: string
  promptVersion: string
  schemaVersion: string
  providerResponseId: string
  usage: ProviderUsage
  serviceTier: ServiceTier
}

export function isLiveOpenAiRequested(): boolean {
  return optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() === 'openai' &&
    optionalEnv('AI_PLAN_LIVE_OPENAI')?.toLowerCase() === 'true'
}

function buildDeterministicResult(input: {
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  days?: number
  invalidStub?: boolean
}): GeneratedPlanResult {
  const days = input.days ?? MONTHLY_PLAN_DAYS
  const invalid = input.invalidStub === true || optionalEnv('AI_PLAN_STUB_MODE') === 'invalid'
  return {
    content: buildMonthlyStubPlan(input.catalog, days, input.locale, {
      invalidCatalogId: invalid,
    }),
    model: STUB_PLAN_MODEL,
    promptVersion: STUB_PROMPT_VERSION,
    schemaVersion: PLAN_SCHEMA_VERSION,
    providerResponseId: `stub:${crypto.randomUUID()}`,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      providerCostMicrousd: 0,
      costCertainty: 'estimated',
    },
    serviceTier: 'standard',
  }
}

/**
 * Stable instructions first (cache-friendly), then dynamic user/catalog content.
 * Explicitly requires a complete 30-day plan; internal meal/workout reuse via the
 * compact schema is allowed only when expansion yields all 30 days + progression.
 */
function buildInstructions(locale: 'fa-IR' | 'en-US', compact: boolean): string {
  return [
    `Create one complete ${MONTHLY_PLAN_DAYS}-day nutrition and workout plan for Momentum, a general-wellness product.`,
    compact
      ? `Return the compact schema (${COMPACT_SCHEMA_VERSION}): define reusable meals and workouts once, then reference them from exactly 30 day entries with progression overrides where needed.`
      : 'Return the full monthly plan schema.',
    'Use only catalog identifiers supplied in the input.',
    'Every day index from 0 through 29 must be present exactly once after expansion. Do not omit days.',
    'Internal reuse of meal/workout definitions is allowed; collapsing the delivered month into fewer than 30 day entries is not.',
    'Prefer identifiers, portions, scheduling, sets/reps/rest, and short personalized notes. Do not invent catalog names or nutrition totals that conflict with catalog data.',
    'Keep each day concise. Do not diagnose, treat, prescribe, or override safety, allergy, equipment, or eligibility constraints.',
    `Write user-facing text in ${locale}.`,
  ].join(' ')
}

export async function generateMonthlyPlanFromProvider(input: {
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  days?: number
  invalidStub?: boolean
  userId?: string
  context?: Record<string, unknown>
  snapshot?: GenerationProfileSnapshot
  cycleIndex?: number
  isRenewal?: boolean
  evalCohort?: string | null
}): Promise<GeneratedPlanResult> {
  const provider = optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() ?? 'stub'
  if (provider !== 'stub' && provider !== 'openai') {
    throw new HttpError(503, 'AI_PROVIDER_INVALID', 'The plan provider is unavailable.')
  }
  if (provider === 'openai') {
    assertLiveOpenAiEnabled()
    if (!input.userId) {
      throw new HttpError(503, 'AI_CONTEXT_INVALID', 'The plan provider context is unavailable.')
    }
    const routing = resolvePlanModelRoute({
      cycleIndex: input.cycleIndex ?? 1,
      isRenewal: input.isRenewal === true,
      evalCohort: input.evalCohort,
    })
    const compact = isCompactSchemaEnabled()
    const declaredAllergenIds = input.snapshot
      ? resolveDeclaredAllergenIds(input.catalog, input.snapshot.dietary.allergies)
      : new Set<string>()
    const subset = input.snapshot
      ? selectCatalogSubset({
        catalog: input.catalog,
        snapshot: input.snapshot,
        declaredAllergenIds,
      })
      : null
    const catalogPrompt = subset
      ? catalogSubsetPromptContext(subset, input.catalog)
      : planCatalogPromptContext(input.catalog)

    // Prompt order: stable instructions → schema/version metadata → catalog subset → user snapshot
    const response = await createStructuredResponse<Record<string, unknown>>({
      model: routing.modelId,
      reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT',
      instructions: buildInstructions(input.locale, compact),
      input: {
        request: {
          locale: input.locale,
          days: input.days ?? MONTHLY_PLAN_DAYS,
          prompt_version: OPENAI_PROMPT_VERSION,
          schema_version: compact ? COMPACT_SCHEMA_VERSION : PLAN_SCHEMA_VERSION,
          routing_version: routing.routingVersion,
          service_tier: routing.serviceTier,
        },
        catalog: catalogPrompt,
        context: input.context ?? {},
      },
      schemaName: compact ? 'momentum_monthly_plan_compact' : 'momentum_monthly_plan',
      schema: compact ? compactPlanJsonSchema : generatedPlanJsonSchema,
      safetyIdentifier: await hashedSafetyIdentifier(input.userId),
      promptCacheKey:
        `${OPENAI_PROMPT_VERSION}:${compact ? 'compact' : 'full'}:${input.catalog.releaseId}:${input.locale}`,
      maxOutputTokens: integerEnv('OPENAI_PLAN_MAX_OUTPUT_TOKENS', compact ? 24_000 : 48_000, {
        min: 8_000,
        max: 128_000,
      }),
      serviceTier: routing.serviceTier,
    })
    return {
      content: response.parsed,
      model: routing.modelId,
      promptVersion: OPENAI_PROMPT_VERSION,
      schemaVersion: compact ? COMPACT_SCHEMA_VERSION : PLAN_SCHEMA_VERSION,
      providerResponseId: response.id,
      usage: response.usage,
      serviceTier: routing.serviceTier,
    }
  }

  return buildDeterministicResult(input)
}
