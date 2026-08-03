import { enumEnv, integerEnv, optionalEnv, requiredEnv } from './config.ts'
import { sha256 } from './crypto.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'

type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh'

interface OpenAIContentPart {
  type?: string
  text?: string
  refusal?: string
}

interface OpenAIResponseBody {
  id?: string
  status?: string
  output?: Array<{ type?: string; content?: OpenAIContentPart[] }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
    input_tokens_details?: { cached_tokens?: number }
    output_tokens_details?: { reasoning_tokens?: number }
  }
  error?: { code?: string; message?: string }
}

export interface StructuredResponse<T> {
  id: string
  parsed: T
  usage: ProviderUsage
}

export function hashedSafetyIdentifier(userId: string): Promise<string> {
  return sha256(`${requiredEnv('OPENAI_SAFETY_PEPPER')}:${userId}`)
}

function extractOutputText(body: OpenAIResponseBody): string {
  const parts = body.output
    ?.filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? []) ?? []
  const refusal = parts.find((part) => part.type === 'refusal')?.refusal
  if (refusal) {
    throw new HttpError(422, 'model_refusal', 'The model could not complete this request safely.')
  }

  const text = parts
    .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
  if (!text) {
    throw new HttpError(502, 'empty_model_response', 'The AI provider returned no usable output.')
  }
  return text
}

export async function createStructuredResponse<T>(options: {
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
  const apiKey = requiredEnv('OPENAI_API_KEY')
  const baseUrl = optionalEnv('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'
  const timeoutMs = integerEnv('OPENAI_TIMEOUT_MS', 90_000, {
    min: 5_000,
    max: 180_000,
  })
  const reasoningEffort = enumEnv<ReasoningEffort>(
    options.reasoningEffortEnv,
    ['low', 'medium', 'high', 'xhigh'],
  )
  const requestBody: Record<string, unknown> = {
    model: options.model,
    instructions: options.instructions,
    input: options.input,
    max_output_tokens: options.maxOutputTokens,
    store: false,
    safety_identifier: options.safetyIdentifier,
    prompt_cache_key: options.promptCacheKey,
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: options.schemaName,
        schema: options.schema,
        strict: true,
      },
    },
  }
  if (reasoningEffort) {
    requestBody.reasoning = { effort: reasoningEffort }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(optionalEnv('OPENAI_ORGANIZATION')
          ? { 'OpenAI-Organization': requiredEnv('OPENAI_ORGANIZATION') }
          : {}),
        ...(optionalEnv('OPENAI_PROJECT')
          ? { 'OpenAI-Project': requiredEnv('OPENAI_PROJECT') }
          : {}),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(504, 'provider_timeout', 'The AI provider timed out.')
    }
    throw new HttpError(502, 'provider_unavailable', 'The AI provider is unavailable.')
  } finally {
    clearTimeout(timeout)
  }

  let body: OpenAIResponseBody
  try {
    body = (await response.json()) as OpenAIResponseBody
  } catch {
    throw new HttpError(
      502,
      'invalid_provider_response',
      'The AI provider returned an invalid response.',
    )
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502
    const code = response.status === 429 ? 'provider_rate_limited' : 'provider_error'
    throw new HttpError(status, code, 'The AI provider could not complete the request.')
  }
  if (body.status !== 'completed' || !body.id) {
    throw new HttpError(
      502,
      'incomplete_provider_response',
      'The AI provider response was incomplete.',
    )
  }

  let parsed: T
  try {
    parsed = JSON.parse(extractOutputText(body)) as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(502, 'invalid_structured_output', 'The AI output could not be parsed.')
  }

  return {
    id: body.id,
    parsed,
    usage: {
      inputTokens: body.usage?.input_tokens,
      outputTokens: body.usage?.output_tokens,
      cachedInputTokens: body.usage?.input_tokens_details?.cached_tokens,
      reasoningTokens: body.usage?.output_tokens_details?.reasoning_tokens,
    },
  }
}
