import { enumEnv, integerEnv, optionalEnv, requiredEnv } from './config.ts'
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
}): Promise<StructuredResponse<T>> {
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
    throw new HttpError(422, 'OPENAI_EMPTY_OUTPUT', 'The plan provider returned no usable output.')
  }

  let parsed: T
  try {
    parsed = JSON.parse(text) as T
  } catch {
    throw new HttpError(
      422,
      'OPENAI_MALFORMED_OUTPUT',
      'The plan provider returned malformed output.',
    )
  }
  const usage = payload.usage && typeof payload.usage === 'object'
    ? payload.usage as Record<string, unknown>
    : {}
  const inputDetails = usage.input_tokens_details && typeof usage.input_tokens_details === 'object'
    ? usage.input_tokens_details as Record<string, unknown>
    : {}
  const outputDetails =
    usage.output_tokens_details && typeof usage.output_tokens_details === 'object'
      ? usage.output_tokens_details as Record<string, unknown>
      : {}
  return {
    id: typeof payload.id === 'string' ? payload.id : 'openai:unknown',
    parsed,
    usage: {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      cachedInputTokens: Number(inputDetails.cached_tokens ?? 0),
      reasoningTokens: Number(outputDetails.reasoning_tokens ?? 0),
    },
  }
}
