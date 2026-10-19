import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import { ProviderResponseError } from './openai.ts'
import { BRIEF_VERSION, buildPlanBrief, type PlanBriefResult } from './plan-brief.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import { assertGeneratedPlan } from './plan-contract.ts'
import { composeDeterministicLeanPlan, DETERMINISTIC_PLAN_VERSION } from './plan-deterministic.ts'
import type { PlanLlmClient, PlanLlmResponse } from './plan-llm.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import {
  assemblePlanPrompt,
  assembleRepairPrompt,
  type AssembledPrompt,
  LEAN_SCHEMA_VERSION,
  PLAN_PROMPT_VERSION,
} from './plan-prompt.ts'
import { TARGETS_VERSION } from './plan-targets.ts'
import {
  type PlanIssue,
  type PlanQualityReport,
  PLAN_VALIDATOR_VERSION,
  validateAndBuildPlan,
  type ValidationContext,
} from './plan-validate.ts'
import type { ServiceTier } from './provider-pricing.ts'
import { buildStarterPlan } from './starter-plan.ts'
import type { ValidationFailureCategory } from './usage-accounting.ts'

/**
 * Brief -> prompt -> model -> validate/scale -> (one repair call) -> fallback.
 *
 * Fallback order: the deterministic plan built from the same brief (still personalised targets,
 * allowlists and calendar), then the generic deterministic starter. Every fallback carries a
 * reason. Configuration errors (provider switched off, unknown provider) are not fallbacks: they
 * fail closed so a misconfiguration can't silently ship non-AI plans.
 */
export const PIPELINE_VERSION = 'momentum-plan-pipeline/1.0.0'
export const DETERMINISTIC_PLAN_MODEL = 'deterministic:momentum-personal@1'
export const STARTER_FALLBACK_MODEL = 'deterministic:momentum-starter@1'
export const STARTER_FALLBACK_VERSION = 'momentum-starter/1.0.0'
export const STARTER_SCHEMA_VERSION = '1.0.0'

export type PlanSource = 'llm' | 'llm_repaired' | 'deterministic_personal' | 'deterministic_starter'

export interface PipelineCallRecord {
  call: 'main' | 'repair'
  model: string
  providerResponseId: string | null
  usage: ProviderUsage | null
  serviceTier: ServiceTier
  latencyMs: number
  outcome: 'accepted' | 'validation_failed' | 'provider_failed'
  failureCategory: ValidationFailureCategory
  /** Issue or error codes only: never output text, never user data. */
  issueCodes: string[]
}

export interface PipelineHooks {
  /** Runs before every billable call; a durable usage row must exist before the provider is hit. */
  beforeCall?(call: 'main' | 'repair', meta: { model: string }): Promise<void>
  afterCall?(record: PipelineCallRecord): Promise<void>
}

export interface PipelineResult {
  content: Record<string, unknown>
  source: PlanSource
  model: string
  promptVersion: string
  schemaVersion: string
  providerResponseId: string
  /** Summed over every provider call made for this plan, delivered or not. */
  usage: ProviderUsage
  serviceTier: ServiceTier
  calls: PipelineCallRecord[]
  fallbackReason: string | null
  quality: PlanQualityReport | null
  meta: {
    pipeline_version: typeof PIPELINE_VERSION
    brief_version: typeof BRIEF_VERSION | null
    targets_version: typeof TARGETS_VERSION | null
    validator_version: typeof PLAN_VALIDATOR_VERSION
    targets: Record<string, number | string> | null
    relaxations: string[]
  }
}

/** Errors that mean "operator misconfiguration": never mask them with a fallback plan. */
const CONFIG_ERRORS = new Set([
  'LIVE_OPENAI_DISABLED',
  'AI_PROVIDER_INVALID',
  'AI_CONTEXT_INVALID',
  'LUNA_QUALITY_GATE_NOT_MET',
  'BATCH_NOT_IMPLEMENTED',
])

function isConfigError(error: unknown): boolean {
  if (error instanceof HttpError) return CONFIG_ERRORS.has(error.code)
  return error instanceof Error && /^(missing_env|invalid_env):/.test(error.message)
}

function addUsage(total: ProviderUsage, next: ProviderUsage | null): ProviderUsage {
  if (!next) return total
  const add = (a: number | undefined, b: number | undefined) =>
    a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0)
  return {
    inputTokens: add(total.inputTokens, next.inputTokens),
    outputTokens: add(total.outputTokens, next.outputTokens),
    cachedInputTokens: add(total.cachedInputTokens, next.cachedInputTokens),
    cacheWriteTokens: add(total.cacheWriteTokens, next.cacheWriteTokens),
    reasoningTokens: add(total.reasoningTokens, next.reasoningTokens),
    // One unknown cost makes the total unknown; never silently treat it as zero.
    providerCostMicrousd: total.providerCostMicrousd === null || next.providerCostMicrousd === null
      ? null
      : add(total.providerCostMicrousd, next.providerCostMicrousd),
    costCertainty: total.costCertainty === 'unknown' || next.costCertainty === 'unknown'
      ? 'unknown'
      : total.costCertainty ?? next.costCertainty,
  }
}

function dominantCategory(issues: readonly PlanIssue[]): ValidationFailureCategory {
  const order: Array<Exclude<ValidationFailureCategory, null>> = [
    'allergen', 'safety', 'catalog_reference', 'equipment', 'nutrition_arithmetic',
    'day_coverage', 'schema', 'other',
  ]
  return order.find((category) => issues.some((issue) => issue.category === category)) ?? 'other'
}

type Attempt =
  | { kind: 'ok'; response: PlanLlmResponse; content: Record<string, unknown>; quality: PlanQualityReport }
  | { kind: 'invalid'; response: PlanLlmResponse | null; issues: PlanIssue[] }
  | { kind: 'provider_error'; code: string }

export async function runPlanPipeline(input: {
  catalog: PlanCatalogSnapshot
  snapshot: GenerationProfileSnapshot
  locale: 'fa-IR' | 'en-US'
  declaredAllergenIds: ReadonlySet<string>
  subjectRef: string
  startsAt: Date
  llm: PlanLlmClient
  hooks?: PipelineHooks
}): Promise<PipelineResult> {
  const calls: PipelineCallRecord[] = []
  let usage: ProviderUsage = { costCertainty: 'estimated' }
  let serviceTier: ServiceTier = 'standard'

  let briefResult: PlanBriefResult
  try {
    briefResult = buildPlanBrief({
      catalog: input.catalog,
      snapshot: input.snapshot,
      declaredAllergenIds: input.declaredAllergenIds,
      locale: input.locale,
      subjectRef: input.subjectRef,
      startsAt: input.startsAt,
    })
  } catch (error) {
    const code = error instanceof HttpError ? error.code : 'brief_failed'
    return starterFallback(input, `brief_failed:${code}`, calls, usage)
  }

  const ctx: ValidationContext = {
    catalog: input.catalog,
    brief: briefResult,
    locale: input.locale,
    declaredAllergenIds: input.declaredAllergenIds,
  }

  const run = async (call: 'main' | 'repair', prompt: AssembledPrompt): Promise<Attempt> => {
    await input.hooks?.beforeCall?.(call, { model: input.llm.model })
    const startedAt = Date.now()
    let response: PlanLlmResponse | null = null
    let attempt: Attempt
    try {
      response = await input.llm.complete({
        call,
        messages: prompt.messages,
        schemaName: prompt.schemaName,
        schema: prompt.schema,
        cacheKey: prompt.cacheKey,
      })
      let parsed: unknown
      try {
        parsed = JSON.parse(response.text)
      } catch {
        parsed = undefined
      }
      const built = parsed === undefined
        ? {
          ok: false as const,
          issues: [{ code: 'malformed_json', category: 'schema' as const, detail: 'The previous answer was not valid JSON.' }],
        }
        : validateAndBuildPlan(parsed, ctx)
      attempt = built.ok
        ? { kind: 'ok', response, content: built.content, quality: built.quality }
        : { kind: 'invalid', response, issues: built.issues }
    } catch (error) {
      if (isConfigError(error)) throw error
      if (error instanceof ProviderResponseError) {
        // Billable but unusable output (malformed, empty, incomplete): worth one repair.
        response = {
          text: '',
          model: error.metadata.model,
          providerResponseId: error.metadata.providerResponseId,
          usage: error.metadata.usage,
          serviceTier: error.metadata.serviceTier,
        }
        attempt = {
          kind: 'invalid',
          response,
          issues: [{ code: error.code.toLowerCase(), category: 'schema', detail: 'The previous answer was cut off or was not valid JSON.' }],
        }
      } else {
        attempt = {
          kind: 'provider_error',
          code: error instanceof HttpError ? error.code : 'PROVIDER_FAILED',
        }
      }
    }
    if (response) {
      usage = addUsage(usage, response.usage)
      serviceTier = response.serviceTier
    }
    const record: PipelineCallRecord = {
      call,
      model: response?.model ?? input.llm.model,
      providerResponseId: response?.providerResponseId ?? null,
      usage: response?.usage ?? null,
      serviceTier: response?.serviceTier ?? 'standard',
      latencyMs: Date.now() - startedAt,
      outcome: attempt.kind === 'ok'
        ? 'accepted'
        : attempt.kind === 'invalid' && response?.text
        ? 'validation_failed'
        : 'provider_failed',
      failureCategory: attempt.kind === 'invalid' ? dominantCategory(attempt.issues) : null,
      issueCodes: attempt.kind === 'invalid'
        ? [...new Set(attempt.issues.map((issue) => issue.code))].slice(0, 20)
        : attempt.kind === 'provider_error'
        ? [attempt.code]
        : [],
    }
    calls.push(record)
    await input.hooks?.afterCall?.(record)
    return attempt
  }

  const prompt = assemblePlanPrompt(briefResult.brief)
  const main = await run('main', prompt)
  if (main.kind === 'ok') {
    return delivered(main, 'llm', briefResult, calls, usage, serviceTier)
  }
  if (main.kind === 'provider_error') {
    return personalFallback(input, ctx, `provider_error:${main.code}`, calls, usage)
  }

  const repair = await run('repair', assembleRepairPrompt({
    brief: briefResult.brief,
    previousOutput: main.response?.text ?? '',
    issues: main.issues.map((issue) => issue.detail),
  }))
  if (repair.kind === 'ok') {
    return delivered(repair, 'llm_repaired', briefResult, calls, usage, serviceTier)
  }
  const reason = repair.kind === 'provider_error'
    ? `repair_provider_error:${repair.code}`
    : `repair_failed:${[...new Set(repair.issues.map((issue) => issue.code))].slice(0, 5).join(',')}`
  return personalFallback(input, ctx, reason, calls, usage)
}

function meta(brief: PlanBriefResult | null): PipelineResult['meta'] {
  return {
    pipeline_version: PIPELINE_VERSION,
    brief_version: brief ? BRIEF_VERSION : null,
    targets_version: brief ? TARGETS_VERSION : null,
    validator_version: PLAN_VALIDATOR_VERSION,
    targets: brief
      ? {
        kcal: brief.targets.calories,
        protein_g: brief.targets.protein_g,
        carbs_g: brief.targets.carbs_g,
        fat_g: brief.targets.fat_g,
        water_ml_rest: brief.targets.water_ml_rest_day,
        water_ml_training: brief.targets.water_ml_training_day,
        activity_factor: brief.targets.activity_factor,
        climate: brief.targets.climate,
      }
      : null,
    relaxations: brief ? [...brief.relaxations, ...brief.targets.adjustments] : [],
  }
}

function delivered(
  attempt: Extract<Attempt, { kind: 'ok' }>,
  source: 'llm' | 'llm_repaired',
  brief: PlanBriefResult,
  calls: PipelineCallRecord[],
  usage: ProviderUsage,
  serviceTier: ServiceTier,
): PipelineResult {
  return {
    content: attempt.content,
    source,
    model: attempt.response.model,
    promptVersion: PLAN_PROMPT_VERSION,
    schemaVersion: LEAN_SCHEMA_VERSION,
    providerResponseId: attempt.response.providerResponseId,
    usage,
    serviceTier,
    calls,
    fallbackReason: null,
    quality: attempt.quality,
    meta: meta(brief),
  }
}

function personalFallback(
  input: Parameters<typeof runPlanPipeline>[0],
  ctx: ValidationContext,
  reason: string,
  calls: PipelineCallRecord[],
  usage: ProviderUsage,
): PipelineResult {
  const built = validateAndBuildPlan(composeDeterministicLeanPlan(ctx.brief.brief), ctx)
  if (!built.ok) {
    const codes = [...new Set(built.issues.map((issue) => issue.code))].slice(0, 3).join(',')
    return starterFallback(input, `${reason};personal_failed:${codes}`, calls, usage, ctx.brief)
  }
  return {
    content: built.content,
    source: 'deterministic_personal',
    model: DETERMINISTIC_PLAN_MODEL,
    promptVersion: DETERMINISTIC_PLAN_VERSION,
    schemaVersion: LEAN_SCHEMA_VERSION,
    providerResponseId: `deterministic:${crypto.randomUUID()}`,
    usage,
    serviceTier: 'standard',
    calls,
    fallbackReason: reason,
    quality: built.quality,
    meta: meta(ctx.brief),
  }
}

function starterFallback(
  input: Parameters<typeof runPlanPipeline>[0],
  reason: string,
  calls: PipelineCallRecord[],
  usage: ProviderUsage,
  brief: PlanBriefResult | null = null,
): PipelineResult {
  let content: Record<string, unknown>
  try {
    content = buildStarterPlan(input.catalog, MONTHLY_PLAN_DAYS, input.locale, input.declaredAllergenIds)
    assertGeneratedPlan(content, MONTHLY_PLAN_DAYS, input.locale, {
      catalog: input.catalog,
      declaredAllergenIds: input.declaredAllergenIds,
      minimumCalories: 1_200,
    })
  } catch {
    // Nothing safe can be delivered: fail closed, the job records the failure.
    throw new HttpError(422, 'PLAN_VALIDATION_FAILED', 'The generated plan could not be validated.')
  }
  return {
    content,
    source: 'deterministic_starter',
    model: STARTER_FALLBACK_MODEL,
    promptVersion: STARTER_FALLBACK_VERSION,
    schemaVersion: STARTER_SCHEMA_VERSION,
    providerResponseId: `deterministic:${crypto.randomUUID()}`,
    usage,
    serviceTier: 'standard',
    calls,
    fallbackReason: reason,
    quality: null,
    meta: meta(brief),
  }
}
