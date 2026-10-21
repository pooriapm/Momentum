import { enumEnv, integerEnv, optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'
import type { ProviderUsage } from './limits.ts'
import { ProviderResponseError } from './openai.ts'
import type { PlanLlmClient, PlanLlmRequest, PlanLlmResponse } from './plan-llm.ts'

/**
 * Stage 1: client for an OpenAI-compatible Chat Completions API (POST {base}/chat/completions),
 * the shape most domestic providers expose. Selected with AI_PLAN_PROVIDER=compatible.
 *
 * Secrets and switches (set by the operator with `supabase secrets set`; never logged):
 * - AI_PLAN_LIVE_LLM=true      live switch; anything else fails closed (kill switch)
 * - LLM_API_BASE_URL           e.g. https://api.example.ir/v1 (https only)
 * - LLM_API_KEY                bearer key
 * - LLM_PLAN_MODEL             model id at that provider
 * Optional:
 * - LLM_JSON_MODE              json_schema (default) | json_object | none; json_schema falls back
 *                              to json_object once if the provider rejects it
 * - LLM_TIMEOUT_MS             per attempt, default 90000
 * - LLM_MAX_RETRIES            retries on timeout / 408 / 409 / 429 / 5xx, default 2
 * - LLM_TOTAL_BUDGET_MS        all attempts of one call, default 120000
 * - LLM_MAX_OUTPUT_TOKENS      default 12000
 * - LLM_PRICE_TOMAN_PER_1M_INPUT / _CACHED_INPUT / _OUTPUT   price list for cost in Toman
 *
 * Errors: timeouts and outages become LLM_TIMEOUT / LLM_UNAVAILABLE (the pipeline fails the job so
 * the user retries later); a rejected key or model becomes a configuration error (fail closed);
 * cut-off or non-JSON output becomes a ProviderResponseError (the pipeline asks for one repair).
 * Error messages never carry the key, the request or the provider's response body.
 */
export const COMPATIBLE_LLM_VERSION = 'momentum-llm-compatible/1.0.0'

export type JsonMode = 'json_schema' | 'json_object' | 'none'

export interface CompatibleLlmOptions {
  baseUrl: string
  apiKey: string
  model: string
  jsonMode: JsonMode
  timeoutMs: number
  maxRetries: number
  totalBudgetMs: number
  maxOutputTokens: number
  prices: { input: number; cachedInput: number; output: number } | null
  retryBaseMs?: number
  /** Injected in tests. */
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

function priceEnv(name: string): number | null {
  const raw = optionalEnv(name)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) throw new Error(`invalid_env:${name}`)
  return value
}

/** Reads and validates the environment. Throws a configuration error when the switch is off. */
export function compatibleLlmOptionsFromEnv(): CompatibleLlmOptions {
  if (optionalEnv('AI_PLAN_LIVE_LLM')?.toLowerCase() !== 'true') {
    throw new HttpError(503, 'LIVE_LLM_DISABLED', 'Live plan generation is switched off.')
  }
  const baseUrl = requiredEnv('LLM_API_BASE_URL').replace(/\/+$/, '')
  if (!/^https:\/\/[^\s/]+/.test(baseUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(baseUrl)) {
    throw new Error('invalid_env:LLM_API_BASE_URL')
  }
  const input = priceEnv('LLM_PRICE_TOMAN_PER_1M_INPUT')
  const output = priceEnv('LLM_PRICE_TOMAN_PER_1M_OUTPUT')
  const cachedInput = priceEnv('LLM_PRICE_TOMAN_PER_1M_CACHED_INPUT')
  return {
    baseUrl,
    apiKey: requiredEnv('LLM_API_KEY'),
    model: requiredEnv('LLM_PLAN_MODEL'),
    jsonMode: enumEnv('LLM_JSON_MODE', ['json_schema', 'json_object', 'none'] as const) ?? 'json_schema',
    timeoutMs: integerEnv('LLM_TIMEOUT_MS', 90_000, { min: 5_000, max: 300_000 }),
    maxRetries: integerEnv('LLM_MAX_RETRIES', 2, { min: 0, max: 5 }),
    totalBudgetMs: integerEnv('LLM_TOTAL_BUDGET_MS', 120_000, { min: 10_000, max: 380_000 }),
    maxOutputTokens: integerEnv('LLM_MAX_OUTPUT_TOKENS', 12_000, { min: 2_000, max: 64_000 }),
    prices: input !== null && output !== null
      ? { input, output, cachedInput: cachedInput ?? input }
      : null,
  }
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

/** Chat Completions usage (also accepts the Responses-style field names some gateways return). */
export function chatUsage(payload: Record<string, unknown>): ProviderUsage {
  const usage = record(payload.usage)
  const inputDetails = record(usage.prompt_tokens_details ?? usage.input_tokens_details)
  const outputDetails = record(usage.completion_tokens_details ?? usage.output_tokens_details)
  return {
    inputTokens: count(usage.prompt_tokens ?? usage.input_tokens),
    outputTokens: count(usage.completion_tokens ?? usage.output_tokens),
    cachedInputTokens: count(inputDetails.cached_tokens ?? usage.prompt_cache_hit_tokens),
    reasoningTokens: count(outputDetails.reasoning_tokens),
  }
}

/** Toman for one call; null when the price list or the token counts are missing. */
export function costInToman(
  usage: ProviderUsage,
  prices: CompatibleLlmOptions['prices'],
): number | null {
  if (!prices || usage.inputTokens === undefined || usage.outputTokens === undefined) return null
  const cached = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens)
  const toman = ((usage.inputTokens - cached) * prices.input + cached * prices.cachedInput +
    usage.outputTokens * prices.output) / 1_000_000
  return Math.round(toman)
}

function responseFormat(mode: JsonMode, request: PlanLlmRequest): Record<string, unknown> | null {
  if (mode === 'json_schema') {
    return { type: 'json_schema', json_schema: { name: request.schemaName, schema: request.schema, strict: true } }
  }
  if (mode === 'json_object') return { type: 'json_object' }
  return null
}

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504])

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get('retry-after')
  if (!raw) return null
  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : null
}

export function createCompatiblePlanLlm(options: CompatibleLlmOptions): PlanLlmClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  const now = options.now ?? Date.now
  const retryBase = options.retryBaseMs ?? 1_000
  let jsonMode = options.jsonMode

  const outage = (code: 'LLM_TIMEOUT' | 'LLM_UNAVAILABLE') =>
    new HttpError(503, code, 'The plan provider is temporarily unavailable.')

  return {
    kind: 'compatible',
    model: options.model,
    async complete(request): Promise<PlanLlmResponse> {
      const deadline = now() + options.totalBudgetMs
      let downgraded = false
      for (let attempt = 0; ; attempt += 1) {
        const remaining = deadline - now()
        if (remaining < 2_000) throw outage('LLM_TIMEOUT')
        const format = responseFormat(jsonMode, request)
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), Math.min(options.timeoutMs, remaining))
        let response: Response
        try {
          response = await fetchImpl(`${options.baseUrl}/chat/completions`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              authorization: `Bearer ${options.apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: options.model,
              messages: request.messages,
              temperature: 0.4,
              max_tokens: options.maxOutputTokens,
              stream: false,
              ...(format ? { response_format: format } : {}),
            }),
          })
        } catch (error) {
          clearTimeout(timer)
          const code = error instanceof DOMException && error.name === 'AbortError'
            ? 'LLM_TIMEOUT'
            : 'LLM_UNAVAILABLE'
          if (attempt < options.maxRetries && deadline - now() > 5_000) {
            await sleep(Math.min(retryBase * 3 ** attempt, Math.max(0, deadline - now() - 5_000)))
            continue
          }
          throw outage(code)
        }
        clearTimeout(timer)

        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined)
          if (response.status === 401 || response.status === 403) {
            throw new HttpError(503, 'LLM_AUTH_FAILED', 'The plan provider rejected the credentials.')
          }
          if (response.status === 404) {
            throw new HttpError(503, 'LLM_MODEL_NOT_FOUND', 'The configured plan model was not found.')
          }
          // Some providers don't support json_schema: fall back to plain JSON mode once.
          if (response.status === 400 && jsonMode === 'json_schema' && !downgraded) {
            jsonMode = 'json_object'
            downgraded = true
            continue
          }
          if (RETRYABLE.has(response.status) && attempt < options.maxRetries) {
            const wait = Math.min(
              retryAfterMs(response) ?? retryBase * 3 ** attempt,
              10_000,
              Math.max(0, deadline - now() - 5_000),
            )
            if (deadline - now() - wait > 5_000) {
              await sleep(wait)
              continue
            }
          }
          if (RETRYABLE.has(response.status)) throw outage('LLM_UNAVAILABLE')
          throw new HttpError(422, 'LLM_REQUEST_REJECTED', 'The plan provider rejected this request.')
        }

        let payload: Record<string, unknown>
        try {
          payload = record(await response.json())
        } catch {
          throw outage('LLM_UNAVAILABLE')
        }
        const usage = chatUsage(payload)
        const metadata = {
          providerResponseId: typeof payload.id === 'string' ? payload.id : `compatible:${crypto.randomUUID()}`,
          model: typeof payload.model === 'string' ? payload.model.slice(0, 120) : options.model,
          usage,
          serviceTier: 'standard' as const,
        }
        const choice = record(Array.isArray(payload.choices) ? payload.choices[0] : null)
        const message = record(choice.message)
        const text = typeof message.content === 'string' ? message.content.trim() : ''
        const costToman = costInToman(usage, options.prices)
        // Billable but unusable: keep the cost on the error so the ledger still records it.
        if (choice.finish_reason === 'length') {
          throw Object.assign(
            new ProviderResponseError('LLM_INCOMPLETE_OUTPUT', 'The plan provider cut its answer off.', metadata),
            { costToman },
          )
        }
        if (!text) {
          throw Object.assign(
            new ProviderResponseError('LLM_EMPTY_OUTPUT', 'The plan provider returned no answer.', metadata),
            { costToman },
          )
        }
        // Tolerate a ```json fence; anything else unparseable is left for the pipeline's repair.
        const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
        return {
          text: unfenced,
          model: metadata.model,
          providerResponseId: metadata.providerResponseId,
          usage,
          serviceTier: 'standard',
          costToman,
        }
      }
    },
  }
}
