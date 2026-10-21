import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import { createStructuredResponse } from './openai.ts'
import type { PlanBrief } from './plan-brief.ts'
import { composeDeterministicLeanPlan } from './plan-deterministic.ts'
import type { PromptMessage } from './plan-prompt.ts'
import type { ServiceTier } from './provider-pricing.ts'

/**
 * The narrow seam between the plan pipeline and whichever LLM provider is configured. The stage-1
 * provider adapter (domestic OpenAI-compatible API, kill switch, retries, cost in Toman) only has
 * to implement PlanLlmClient; nothing else in the pipeline knows about HTTP.
 */
export interface PlanLlmRequest {
  call: 'main' | 'repair'
  messages: PromptMessage[]
  schemaName: string
  schema: Record<string, unknown>
  /** Provider prompt-cache routing key; identical for every user. */
  cacheKey: string
  /** Epoch ms by which the call must have returned (the pipeline's time budget); optional. */
  deadlineAt?: number
}

export interface PlanLlmResponse {
  /** Raw JSON text as returned; parsed by the pipeline. */
  text: string
  model: string
  providerResponseId: string
  usage: ProviderUsage
  serviceTier: ServiceTier
  /** Provider cost in Toman when a Toman price list is configured; null when unknown. */
  costToman?: number | null
}

export interface PlanLlmClient {
  readonly kind: 'stub' | 'openai' | 'compatible'
  readonly model: string
  complete(request: PlanLlmRequest): Promise<PlanLlmResponse>
}

export const STUB_LLM_MODEL = 'stub:momentum-plan-lean@1'

export type StubMode = 'valid' | 'invalid' | 'invalid_always' | 'malformed' | 'provider_error'

const ZERO_USAGE: ProviderUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  reasoningTokens: 0,
  providerCostMicrousd: 0,
  costCertainty: 'estimated',
}

function briefFrom(messages: readonly PromptMessage[]): PlanBrief {
  const user = messages.find((message) => message.role === 'user')
  return JSON.parse(user?.content ?? '{}') as PlanBrief
}

/** One short, generic recipe per food the stub plan uses, so the recipe path runs offline. */
function stubRecipes(brief: PlanBrief, plan: Record<string, unknown>): Record<string, unknown>[] {
  const used = new Set((plan.meals as Array<{ food: string; alts: string[] }>)
    .flatMap((meal) => [meal.food, ...meal.alts]))
  const steps = brief.lang === 'fa-IR'
    ? ['مواد را بشوی و خرد کن.', 'روی حرارت ملایم بپز و با ادویه مزه‌دار کن.']
    : ['Wash and chop the ingredients.', 'Cook over gentle heat and season with spices.']
  return [...used].map((food) => ({ food, prep_min: 10, cook_min: 15, steps }))
}

/**
 * Offline stand-in for the model: answers with the deterministic plan for the brief it was sent.
 * Modes exercise the failure paths: "invalid" breaks only the first answer (repair succeeds),
 * "invalid_always" breaks both (fallback), "malformed" returns non-JSON, "provider_error" throws.
 */
export function createStubPlanLlm(mode: StubMode = 'valid'): PlanLlmClient {
  return {
    kind: 'stub',
    model: STUB_LLM_MODEL,
    complete(request) {
      if (mode === 'provider_error') {
        return Promise.reject(
          new HttpError(503, 'OPENAI_UNAVAILABLE', 'The plan provider is temporarily unavailable.'),
        )
      }
      const brief = briefFrom(request.messages)
      const plan = composeDeterministicLeanPlan(brief)
      plan.recipes = stubRecipes(brief, plan)
      const broken = mode === 'invalid_always' || (mode === 'invalid' && request.call === 'main')
      if (broken) {
        const meals = plan.meals as Record<string, unknown>[]
        if (meals[0]) meals[0].food = 'not-in-catalog'
      }
      const text = mode === 'malformed' && request.call === 'main'
        ? '{"schema_version": "momentum-plan-lean/1.0.0", "days": ['
        : JSON.stringify(plan)
      return Promise.resolve({
        text,
        model: STUB_LLM_MODEL,
        providerResponseId: `stub:${crypto.randomUUID()}`,
        usage: ZERO_USAGE,
        serviceTier: 'standard',
        costToman: 0,
      })
    },
  }
}

/** Current OpenAI Responses-API client. Replaced or wrapped by the stage-1 provider adapter. */
export function createOpenAiPlanLlm(options: {
  model: string
  safetyIdentifier: string
  maxOutputTokens: number
  serviceTier: 'standard' | 'batch' | 'flex'
}): PlanLlmClient {
  return {
    kind: 'openai',
    model: options.model,
    async complete(request) {
      const [system, ...rest] = request.messages
      const response = await createStructuredResponse<unknown>({
        model: options.model,
        reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT',
        instructions: system?.content ?? '',
        input: rest.map((message) => ({ role: message.role, content: message.content })),
        schemaName: request.schemaName,
        schema: request.schema,
        safetyIdentifier: options.safetyIdentifier,
        promptCacheKey: request.cacheKey,
        maxOutputTokens: options.maxOutputTokens,
        serviceTier: options.serviceTier,
      })
      return {
        text: response.text,
        model: options.model,
        providerResponseId: response.id,
        usage: response.usage,
        serviceTier: response.serviceTier,
      }
    },
  }
}
