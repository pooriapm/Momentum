import { integerEnv, optionalEnv } from './config.ts'
import { catalogSubsetPromptContext, selectCatalogSubset } from './catalog-subset.ts'
import { COMPACT_SCHEMA_VERSION, compactPlanJsonSchema } from './compact-plan-contract.ts'
import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { HttpError } from './http.ts'
import { passesLunaQualityGate } from './luna-eval-set.ts'
import type { ProviderUsage } from './limits.ts'
import {
  assertLiveOpenAiEnabled,
  createStructuredResponse,
  hashedSafetyIdentifier,
} from './openai.ts'
import { planCatalogPromptContext, type PlanCatalogSnapshot } from './plan-catalog.ts'
import { resolveDeclaredAllergenIds } from './plan-catalog.ts'
import { generatedPlanJsonSchema } from './plan-contract.ts'
import { withExerciseRefs } from './exercise-selection.ts'
import { isCompactSchemaEnabled, resolvePlanModelRoute } from './plan-model-routing.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import type { ServiceTier } from './provider-pricing.ts'
import { buildMonthlyStubPlan } from './starter-plan.ts'
import {
  createOpenAiPlanLlm,
  createStubPlanLlm,
  type PlanLlmClient,
  type StubMode,
} from './plan-llm.ts'
import { LEAN_SCHEMA_VERSION, PLAN_PROMPT_VERSION } from './plan-prompt.ts'
import { compatibleLlmOptionsFromEnv, createCompatiblePlanLlm } from './plan-llm-compatible.ts'

export { MONTHLY_PLAN_DAYS } from './plan-period.ts'

export const STUB_PLAN_MODEL = 'stub:momentum-monthly@1'
export const STUB_PROMPT_VERSION = 'momentum-monthly-stub/1.0.0'
export const OPENAI_PROMPT_VERSION = 'momentum-monthly-openai/2.1.0'
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

// The model may name exercises by their short library id; the server resolves them.
const providerPlanJsonSchema = withExerciseRefs(generatedPlanJsonSchema)

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
    'Choose every workout exercise from catalog.exercises and set exercise_id to its id (for example "barbell-bench-press"); substitution_exercise_id must be one of the substitutes listed for that exercise or null. Exercise names, equipment and keys are filled in from the catalog.',
    'Every day index from 0 through 29 must be present exactly once after expansion. Do not omit days.',
    'Internal reuse of meal/workout definitions is allowed; collapsing the delivered month into fewer than 30 day entries is not.',
    'Prefer identifiers, portions, scheduling, sets/reps/rest, and short personalized notes. Do not invent catalog names or nutrition totals that conflict with catalog data.',
    'Keep each day concise. Do not diagnose, treat, prescribe, or override safety, allergy, equipment, or eligibility constraints.',
    `Write user-facing text in ${locale}.`,
  ].join(' ')
}

export interface MonthlyProviderInput {
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
}

export function generateMonthlyPlanFromProvider(
  input: MonthlyProviderInput,
): Promise<GeneratedPlanResult> {
  return generatePlan(input)
}

/** Offline tooling only: produces evaluation candidates, never imports/delivers plans. */
export function generateMonthlyPlanForEvaluation(
  input: MonthlyProviderInput,
  model: 'gpt-5.6-terra' | 'gpt-5.6-luna',
): Promise<GeneratedPlanResult> {
  return generatePlan(input, model)
}

async function generatePlan(
  input: MonthlyProviderInput,
  evaluationModel?: 'gpt-5.6-terra' | 'gpt-5.6-luna',
): Promise<GeneratedPlanResult> {
  const provider = optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() ?? 'stub'
  if (provider !== 'stub' && provider !== 'openai') {
    throw new HttpError(503, 'AI_PROVIDER_INVALID', 'The plan provider is unavailable.')
  }
  if (provider === 'openai') {
    assertLiveOpenAiEnabled()
    if (!input.userId) {
      throw new HttpError(503, 'AI_CONTEXT_INVALID', 'The plan provider context is unavailable.')
    }
    const routing = evaluationModel
      ? {
        modelId: evaluationModel,
        route: evaluationModel.endsWith('luna') ? 'luna' : 'terra',
        serviceTier: 'standard' as const,
        routingVersion: 'evaluation',
      }
      : resolvePlanModelRoute({
        cycleIndex: input.cycleIndex ?? 1,
        isRenewal: input.isRenewal === true,
        evalCohort: input.evalCohort,
      })
    const compact = isCompactSchemaEnabled()
    if (routing.route === 'luna' && !evaluationModel) {
      let evidence: unknown
      try {
        evidence = JSON.parse(optionalEnv('AI_PLAN_LUNA_QUALITY_EVIDENCE') ?? 'null')
      } catch {
        evidence = null
      }
      if (
        !passesLunaQualityGate(evidence, {
          promptVersion: OPENAI_PROMPT_VERSION,
          schemaVersion: compact ? COMPACT_SCHEMA_VERSION : PLAN_SCHEMA_VERSION,
          catalogReleaseId: input.catalog.releaseId,
        })
      ) {
        throw new HttpError(
          503,
          'LUNA_QUALITY_GATE_NOT_MET',
          'Luna requires approved live quality evidence matching this generation version.',
        )
      }
    }
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
      schema: compact ? compactPlanJsonSchema : providerPlanJsonSchema,
      safetyIdentifier: await hashedSafetyIdentifier(input.userId),
      promptCacheKey: `${OPENAI_PROMPT_VERSION}:${
        compact ? 'compact' : 'full'
      }:${input.catalog.releaseId}:${input.locale}`,
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
      serviceTier: response.serviceTier,
    }
  }

  return buildDeterministicResult(input)
}

const STUB_MODES: readonly StubMode[] = [
  'valid',
  'invalid',
  'invalid_always',
  'malformed',
  'provider_error',
]

/**
 * The model client for the brief-based pipeline (plan-pipeline.ts). AI_PLAN_PROVIDER=stub (the
 * default) answers offline; AI_PLAN_STUB_MODE picks a failure path for testing. compatible is any
 * OpenAI-compatible Chat Completions provider (plan-llm-compatible.ts, AI_PLAN_LIVE_LLM switch).
 * openai needs the live switch, the routed model and, for Luna, quality evidence for this
 * prompt/schema version.
 */
export async function resolvePlanLlmClient(input: {
  userId: string
  cycleIndex: number
  isRenewal: boolean
  catalogReleaseId: string
  evalCohort?: string | null
  invalidStub?: boolean
}): Promise<PlanLlmClient> {
  const provider = optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() ?? 'stub'
  if (provider === 'stub') {
    const configured = optionalEnv('AI_PLAN_STUB_MODE') as StubMode | undefined
    const mode = input.invalidStub
      ? 'invalid_always'
      : configured && STUB_MODES.includes(configured)
      ? configured
      : 'valid'
    return createStubPlanLlm(mode)
  }
  if (provider === 'compatible') {
    return createCompatiblePlanLlm(compatibleLlmOptionsFromEnv())
  }
  if (provider !== 'openai') {
    throw new HttpError(503, 'AI_PROVIDER_INVALID', 'The plan provider is unavailable.')
  }
  assertLiveOpenAiEnabled()
  const routing = resolvePlanModelRoute({
    cycleIndex: input.cycleIndex,
    isRenewal: input.isRenewal,
    evalCohort: input.evalCohort,
  })
  if (routing.route === 'luna') {
    let evidence: unknown
    try {
      evidence = JSON.parse(optionalEnv('AI_PLAN_LUNA_QUALITY_EVIDENCE') ?? 'null')
    } catch {
      evidence = null
    }
    if (
      !passesLunaQualityGate(evidence, {
        promptVersion: PLAN_PROMPT_VERSION,
        schemaVersion: LEAN_SCHEMA_VERSION,
        catalogReleaseId: input.catalogReleaseId,
      })
    ) {
      throw new HttpError(
        503,
        'LUNA_QUALITY_GATE_NOT_MET',
        'Luna requires approved live quality evidence matching this generation version.',
      )
    }
  }
  return createOpenAiPlanLlm({
    model: routing.modelId,
    safetyIdentifier: await hashedSafetyIdentifier(input.userId),
    maxOutputTokens: integerEnv('OPENAI_PLAN_MAX_OUTPUT_TOKENS', 16_000, {
      min: 8_000,
      max: 128_000,
    }),
    serviceTier: routing.serviceTier,
  })
}
