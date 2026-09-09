import { enumEnv, integerEnv, optionalEnv, requiredEnv } from './config.ts'
import { sha256 } from './crypto.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import type { ServiceTier } from './provider-pricing.ts'

export interface StructuredResponse<T> {
  id: string
  parsed: T
  serviceTier: ServiceTier
  usage: ProviderUsage
}

export interface ProviderResponseMetadata {
  providerResponseId: string
  model: string
  usage: ProviderUsage
  serviceTier: ServiceTier
}

/** Preserve billable response metadata even when its content cannot be delivered. */
export class ProviderResponseError extends HttpError {
  constructor(code: string, message: string, readonly metadata: ProviderResponseMetadata) {
    super(422, code, message)
  }
}

function reportedTier(value: unknown): ServiceTier {
  if (value === 'default') return 'standard'
  if (value === 'flex' || value === 'priority' || value === 'fast') return value
  return 'unknown'
}

function tokenCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value) : undefined
}

function reportedUsage(payload: Record<string, unknown>): ProviderUsage {
  const usage = payload.usage && typeof payload.usage === 'object'
    ? payload.usage as Record<string, unknown> : {}
  const input = usage.input_tokens_details && typeof usage.input_tokens_details === 'object'
    ? usage.input_tokens_details as Record<string, unknown> : {}
  const output = usage.output_tokens_details && typeof usage.output_tokens_details === 'object'
    ? usage.output_tokens_details as Record<string, unknown> : {}
  return {
    inputTokens: tokenCount(usage.input_tokens),
    outputTokens: tokenCount(usage.output_tokens),
    cachedInputTokens: tokenCount(input.cached_tokens),
    cacheWriteTokens: tokenCount(input.cache_write_tokens ?? input.cache_creation_tokens),
    reasoningTokens: tokenCount(output.reasoning_tokens),
  }
}

export function hashedSafetyIdentifier(userId: string): Promise<string> {
  return sha256(`${requiredEnv('OPENAI_SAFETY_PEPPER')}:${userId}`)
}

export function assertLiveOpenAiEnabled(): void {
  if (optionalEnv('AI_PLAN_LIVE_OPENAI')?.toLowerCase() !== 'true') {
    throw new HttpError(
      503,
      'LIVE_OPENAI_DISABLED',
      'Live OpenAI is disabled. Monthly generation uses the stub provider.',
    )
  }
}

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
  serviceTier?: 'standard' | 'batch' | 'flex'
}): Promise<StructuredResponse<T>> {
  if (_options.serviceTier === 'batch') {
    throw new HttpError(503, 'BATCH_NOT_IMPLEMENTED', 'Batch requires a durable Batch API worker; synchronous generation cannot use it.')
  }
  assertLiveOpenAiEnabled()
  const apiKey = requiredEnv('OPENAI_API_KEY')
  const baseUrl = optionalEnv('OPENAI_API_BASE_URL') ?? 'https://api.openai.com/v1'
  const reasoningEffort = enumEnv(
    _options.reasoningEffortEnv,
    ['none', 'minimal', 'low', 'medium', 'high'] as const,
  )
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    integerEnv('OPENAI_PLAN_TIMEOUT_MS', 120_000, {
      min: 1_000,
      max: 180_000,
    }),
  )

  const serviceTier = _options.serviceTier === 'flex' ? 'flex' : 'default'

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: _options.model,
        instructions: _options.instructions,
        input: JSON.stringify(_options.input),
        store: false,
        safety_identifier: _options.safetyIdentifier,
        prompt_cache_key: _options.promptCacheKey,
        max_output_tokens: _options.maxOutputTokens,
        service_tier: serviceTier,
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        text: {
          format: {
            type: 'json_schema',
            name: _options.schemaName,
            schema: _options.schema,
            strict: true,
          },
        },
      }),
    })
  } catch (error) {
    const code = error instanceof DOMException && error.name === 'AbortError'
      ? 'OPENAI_TIMEOUT'
      : 'OPENAI_UNAVAILABLE'
    throw new HttpError(503, code, 'The plan provider is temporarily unavailable.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 409 ||
      response.status === 429 || response.status >= 500
    throw new HttpError(
      retryable ? 503 : 422,
      retryable ? 'OPENAI_UNAVAILABLE' : 'OPENAI_RESPONSE_REJECTED',
      retryable
        ? 'The plan provider is temporarily unavailable.'
        : 'The plan provider rejected this request.',
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = await response.json() as Record<string, unknown>
  } catch {
    throw new HttpError(
      502,
      'OPENAI_MALFORMED_RESPONSE',
      'The plan provider returned an invalid response.',
    )
  }
  const metadata: ProviderResponseMetadata = {
    providerResponseId: typeof payload.id === 'string' ? payload.id : 'openai:unknown',
    model: typeof payload.model === 'string' ? payload.model : _options.model,
    usage: reportedUsage(payload),
    serviceTier: reportedTier(payload.service_tier),
  }
  if (payload.status && payload.status !== 'completed') {
    throw new ProviderResponseError('OPENAI_INCOMPLETE_OUTPUT', 'The plan provider did not complete its output.', metadata)
  }
  const output = Array.isArray(payload.output) ? payload.output : []
  const text = typeof payload.output_text === 'string'
    ? payload.output_text
    : output.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const content = Array.isArray((item as Record<string, unknown>).content)
        ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
        : []
      return content
        .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
        .map((part) => String(part.text))
    }).join('')
  if (!text) {
    throw new ProviderResponseError('OPENAI_EMPTY_OUTPUT', 'The plan provider returned no usable output.', metadata)
  }

  let parsed: T
  try {
    parsed = JSON.parse(text) as T
  } catch {
    throw new ProviderResponseError('OPENAI_MALFORMED_OUTPUT', 'The plan provider returned malformed output.', metadata)
  }
  return { id: metadata.providerResponseId, parsed, usage: metadata.usage, serviceTier: metadata.serviceTier }
}
