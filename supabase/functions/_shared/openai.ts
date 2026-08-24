import { requiredEnv } from './config.ts'
import { sha256 } from './crypto.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'

export interface StructuredResponse<T> {
  id: string
  parsed: T
  usage: ProviderUsage
}

export function hashedSafetyIdentifier(userId: string): Promise<string> {
  return sha256(`${requiredEnv('OPENAI_SAFETY_PEPPER')}:${userId}`)
}

export function assertLiveOpenAiHardDisabled(): never {
  throw new HttpError(
    503,
    'LIVE_OPENAI_DISABLED',
    'Live OpenAI is hard-disabled. Monthly generation uses the stub provider.',
  )
}

// deno-lint-ignore require-await -- preserve the async provider contract while live OpenAI is disabled
export async function createStructuredResponse<T>(_options: {
  model: string
  reasoningEffortEnv: string
  instructions: string
  input: unknown
  schemaName: string
  schema: Record<string, unknown>
  safetyIdentifier: string
  promptCacheKey: string
  maxOutputTokens: number
}): Promise<StructuredResponse<T>> {
  void _options
  // Later enablement (still unimplemented): AI_PLAN_PROVIDER=openai AND
  // AI_PLAN_LIVE_OPENAI=true AND OPENAI_API_KEY. Do not fetch until that slice.
  assertLiveOpenAiHardDisabled()
}
