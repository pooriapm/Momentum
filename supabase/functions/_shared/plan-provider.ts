import { optionalEnv } from './config.ts'
import type { ProviderUsage } from './limits.ts'
import { assertLiveOpenAiHardDisabled } from './openai.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import { buildMonthlyStubPlan } from './starter-plan.ts'

export const STUB_PLAN_MODEL = 'stub:momentum-monthly@1'
export const STUB_PROMPT_VERSION = 'momentum-monthly-stub/1.0.0'
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
    optionalEnv('AI_PLAN_LIVE_OPENAI')?.toLowerCase() === 'true' &&
    Boolean(optionalEnv('OPENAI_API_KEY'))
}

// deno-lint-ignore require-await -- keep provider implementations interchangeable at the async boundary
export async function generateMonthlyPlanFromProvider(input: {
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  days?: number
  invalidStub?: boolean
}): Promise<GeneratedPlanResult> {
  if (isLiveOpenAiRequested()) {
    assertLiveOpenAiHardDisabled()
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
