import { assertLiveAiMarketAllowed } from './ai-market.ts'
import { optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import { createStructuredResponse, hashedSafetyIdentifier } from './openai.ts'
import { planCatalogPromptContext, type PlanCatalogSnapshot } from './plan-catalog.ts'
import { generatedPlanJsonSchema } from './plan-contract.ts'
import { buildMonthlyStubPlan } from './starter-plan.ts'

export const STUB_PLAN_MODEL = 'stub:momentum-monthly@1'
export const STUB_PROMPT_VERSION = 'momentum-monthly-stub/1.0.0'
export const OPENAI_PROMPT_VERSION = 'momentum-monthly-openai/1.0.0'
export const PLAN_SCHEMA_VERSION = '1.0.0'
export const MONTHLY_PLAN_DAYS = 7

export interface GeneratedPlanResult {
  content: Record<string, unknown>
  model: string
  promptVersion: string
  providerResponseId: string
  usage: ProviderUsage
}

export function isLiveOpenAiRequested(): boolean {
  return optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() === 'openai' &&
    optionalEnv('AI_PLAN_LIVE_OPENAI')?.toLowerCase() === 'true'
}

export async function generateMonthlyPlanFromProvider(input: {
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  days?: number
  invalidStub?: boolean
  userId?: string
  countryCode?: string | null
  context?: Record<string, unknown>
}): Promise<GeneratedPlanResult> {
  const provider = optionalEnv('AI_PLAN_PROVIDER')?.toLowerCase() ?? 'stub'
  if (provider !== 'stub' && provider !== 'openai') {
    throw new HttpError(503, 'AI_PROVIDER_INVALID', 'The plan provider is unavailable.')
  }
  if (provider === 'openai') {
    if (!isLiveOpenAiRequested()) {
      throw new HttpError(503, 'LIVE_OPENAI_DISABLED', 'Live plan generation is disabled.')
    }
    assertLiveAiMarketAllowed(input.countryCode)
    if (!input.userId) {
      throw new HttpError(503, 'AI_CONTEXT_INVALID', 'The plan provider context is unavailable.')
    }
    const response = await createStructuredResponse<Record<string, unknown>>({
      model: requiredEnv('OPENAI_PLAN_MODEL'),
      reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT',
      instructions: [
        'Create one combined nutrition and workout plan for Momentum, a general-wellness product.',
        'Return only the requested schema. Use only catalog identifiers supplied in the input.',
        'Do not diagnose, treat, prescribe, or override safety, allergy, equipment, or eligibility constraints.',
        `Write user-facing text in ${input.locale}.`,
      ].join(' '),
      input: {
        request: {
          locale: input.locale,
          days: input.days ?? MONTHLY_PLAN_DAYS,
          prompt_version: OPENAI_PROMPT_VERSION,
          schema_version: PLAN_SCHEMA_VERSION,
        },
        context: input.context ?? {},
        catalog: planCatalogPromptContext(input.catalog),
      },
      schemaName: 'momentum_monthly_plan',
      schema: generatedPlanJsonSchema,
      safetyIdentifier: await hashedSafetyIdentifier(input.userId),
      promptCacheKey: `${OPENAI_PROMPT_VERSION}:${input.catalog.releaseId}:${input.locale}`,
      maxOutputTokens: 24_000,
    })
    return {
      content: response.parsed,
      model: requiredEnv('OPENAI_PLAN_MODEL'),
      promptVersion: OPENAI_PROMPT_VERSION,
      providerResponseId: response.id,
      usage: response.usage,
    }
  }

  const days = input.days ?? MONTHLY_PLAN_DAYS
  const invalid = input.invalidStub === true || optionalEnv('AI_PLAN_STUB_MODE') === 'invalid'
  return {
    content: buildMonthlyStubPlan(input.catalog, days, input.locale, {
      invalidCatalogId: invalid,
    }),
    model: STUB_PLAN_MODEL,
    promptVersion: STUB_PROMPT_VERSION,
    providerResponseId: `stub:${crypto.randomUUID()}`,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    },
  }
}
