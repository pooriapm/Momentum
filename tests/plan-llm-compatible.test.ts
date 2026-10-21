import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../supabase/functions/_shared/http.ts'
import { ProviderResponseError } from '../supabase/functions/_shared/openai.ts'
import {
  chatUsage,
  compatibleLlmOptionsFromEnv,
  type CompatibleLlmOptions,
  costInToman,
  createCompatiblePlanLlm,
} from '../supabase/functions/_shared/plan-llm-compatible.ts'
import { resolveComplexPlanLlmClient, resolvePlanLlmClient } from '../supabase/functions/_shared/plan-provider.ts'
import type { PlanLlmRequest } from '../supabase/functions/_shared/plan-llm.ts'

const KEY = 'sk-test-secret-key-0123456789'
let env: Record<string, string | undefined> = {}
beforeEach(() => {
  env = {}
  vi.stubGlobal('Deno', { env: { get: (name: string) => env[name] } })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const request: PlanLlmRequest = {
  call: 'main',
  messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: '{"v":1}' }],
  schemaName: 'momentum_plan_lean',
  schema: { type: 'object' },
  cacheKey: 'k',
}

function ok(content: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    id: 'chatcmpl-1',
    model: 'provider-model-2026',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 4_000, completion_tokens: 3_000, prompt_tokens_details: { cached_tokens: 1_000 } },
    ...extra,
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

function client(fetchImpl: typeof fetch, overrides: Partial<CompatibleLlmOptions> = {}) {
  return createCompatiblePlanLlm({
    baseUrl: 'https://llm.example.ir/v1',
    apiKey: KEY,
    model: 'provider-model',
    jsonMode: 'json_schema',
    timeoutMs: 30_000,
    maxRetries: 2,
    totalBudgetMs: 120_000,
    maxOutputTokens: 12_000,
    prices: { input: 200_000, cachedInput: 50_000, output: 800_000 },
    retryBaseMs: 1,
    sleep: async () => undefined,
    fetchImpl,
    ...overrides,
  })
}

describe('stage 1: OpenAI-compatible provider client', () => {
  it('sends a chat completion with the JSON schema and maps usage and Toman cost', async () => {
    const fetchImpl = vi.fn(async () => ok('{"a":1}'))
    const result = await client(fetchImpl as unknown as typeof fetch).complete(request)
    expect(result).toMatchObject({
      text: '{"a":1}',
      model: 'provider-model-2026',
      providerResponseId: 'chatcmpl-1',
      usage: { inputTokens: 4_000, outputTokens: 3_000, cachedInputTokens: 1_000 },
      // (3000 * 200k + 1000 * 50k + 3000 * 800k) / 1M
      costToman: 3_050,
    })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://llm.example.ir/v1/chat/completions')
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`)
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({
      model: 'provider-model',
      messages: request.messages,
      max_tokens: 12_000,
      stream: false,
      response_format: { type: 'json_schema', json_schema: { name: 'momentum_plan_lean', strict: true } },
    })
    expect(JSON.stringify(body)).not.toContain(KEY)
    expect(body).not.toHaveProperty('reasoning_effort')
  })

  it('never runs past the pipeline deadline', async () => {
    let clock = 0
    const fetchImpl = vi.fn(async () => new Response('busy', { status: 503 }))
    const llm = client(fetchImpl as unknown as typeof fetch, {
      now: () => clock,
      sleep: async (ms: number) => { clock += ms },
      maxRetries: 5,
    })
    // Plenty of per-call budget, but the pipeline deadline is only 20 s away.
    await expect(llm.complete({ ...request, deadlineAt: 20_000 })).rejects.toMatchObject({ code: 'LLM_UNAVAILABLE' })
    expect(clock).toBeLessThanOrEqual(20_000)
  })

  it('sends reasoning_effort only when configured', async () => {
    const fetchImpl = vi.fn(async () => ok('{"a":1}'))
    await client(fetchImpl as unknown as typeof fetch, { reasoningEffort: 'low' }).complete(request)
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body)).reasoning_effort).toBe('low')
  })

  it('retries timeouts and 429/5xx, then gives up as an outage', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response('oops', { status: 502 }))
      .mockResolvedValueOnce(ok('{"a":1}'))
    await expect(client(fetchImpl as unknown as typeof fetch).complete(request)).resolves.toMatchObject({ text: '{"a":1}' })
    expect(fetchImpl).toHaveBeenCalledTimes(3)

    const down = vi.fn(async () => new Response('down', { status: 503 }))
    await expect(client(down as unknown as typeof fetch).complete(request))
      .rejects.toMatchObject({ status: 503, code: 'LLM_UNAVAILABLE' })
    expect(down).toHaveBeenCalledTimes(3)

    const timeout = vi.fn(async () => { throw new DOMException('aborted', 'AbortError') })
    await expect(client(timeout as unknown as typeof fetch).complete(request))
      .rejects.toMatchObject({ code: 'LLM_TIMEOUT' })
  })

  it('never retries a rejected key and never leaks it', async () => {
    const fetchImpl = vi.fn(async () => new Response(`{"error":"bad key ${KEY}"}`, { status: 401 }))
    const error = await client(fetchImpl as unknown as typeof fetch).complete(request).catch((e) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error.code).toBe('LLM_AUTH_FAILED')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(`${error.message} ${JSON.stringify(error)}`).not.toContain(KEY)
  })

  it('falls back from json_schema to json_object once when the provider rejects it', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('unsupported response_format', { status: 400 }))
      .mockResolvedValueOnce(ok('```json\n{"a":1}\n```'))
    const llm = client(fetchImpl as unknown as typeof fetch)
    await expect(llm.complete(request)).resolves.toMatchObject({ text: '{"a":1}' })
    const second = JSON.parse(String((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body))
    expect(second.response_format).toEqual({ type: 'json_object' })
    // Later calls on the same client stay in json_object mode.
    fetchImpl.mockResolvedValueOnce(ok('{"b":2}'))
    await llm.complete(request)
    expect(JSON.parse(String((fetchImpl.mock.calls[2] as unknown as [string, RequestInit])[1].body)).response_format)
      .toEqual({ type: 'json_object' })
  })

  it('reports cut-off or empty answers as billable output errors (repair, not outage)', async () => {
    const cut = vi.fn(async () => ok('{"a":', {
      choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }],
    }))
    const error = await client(cut as unknown as typeof fetch).complete(request).catch((e) => e)
    expect(error).toBeInstanceOf(ProviderResponseError)
    expect(error.code).toBe('LLM_INCOMPLETE_OUTPUT')
    expect(error.metadata.usage.outputTokens).toBe(3_000)
    expect(error.costToman).toBe(3_050)
  })

  it('reads the environment and fails closed while the live switch is off', () => {
    env = { LLM_API_BASE_URL: 'https://llm.example.ir/v1', LLM_API_KEY: KEY, LLM_PLAN_MODEL: 'm' }
    expect(() => compatibleLlmOptionsFromEnv()).toThrowError(expect.objectContaining({ code: 'LIVE_LLM_DISABLED' }))
    env.AI_PLAN_LIVE_LLM = 'true'
    expect(compatibleLlmOptionsFromEnv()).toMatchObject({ model: 'm', jsonMode: 'json_schema', prices: null })
    env.LLM_API_BASE_URL = 'http://llm.example.ir/v1'
    expect(() => compatibleLlmOptionsFromEnv()).toThrow('invalid_env:LLM_API_BASE_URL')
    env.LLM_API_BASE_URL = 'https://llm.example.ir/v1/'
    env.LLM_PRICE_TOMAN_PER_1M_INPUT = '150000'
    env.LLM_PRICE_TOMAN_PER_1M_OUTPUT = '600000'
    expect(compatibleLlmOptionsFromEnv()).toMatchObject({
      baseUrl: 'https://llm.example.ir/v1',
      prices: { input: 150_000, cachedInput: 150_000, output: 600_000 },
    })
  })

  it('is selected with AI_PLAN_PROVIDER=compatible', async () => {
    env = {
      AI_PLAN_PROVIDER: 'compatible',
      AI_PLAN_LIVE_LLM: 'true',
      LLM_API_BASE_URL: 'https://llm.example.ir/v1',
      LLM_API_KEY: KEY,
      LLM_PLAN_MODEL: 'm',
    }
    const llm = await resolvePlanLlmClient({
      userId: 'u', cycleIndex: 1, isRenewal: false, catalogReleaseId: 'momentum-core@v2',
    })
    expect(llm.kind).toBe('compatible')
    env.AI_PLAN_LIVE_LLM = 'false'
    await expect(resolvePlanLlmClient({
      userId: 'u', cycleIndex: 1, isRenewal: false, catalogReleaseId: 'momentum-core@v2',
    })).rejects.toMatchObject({ code: 'LIVE_LLM_DISABLED' })
  })

  it('configures an optional complex model with its own price list', () => {
    env = {
      AI_PLAN_PROVIDER: 'compatible',
      AI_PLAN_LIVE_LLM: 'true',
      LLM_API_BASE_URL: 'https://llm.example.ir/v1',
      LLM_API_KEY: KEY,
      LLM_PLAN_MODEL: 'cheap',
      LLM_PRICE_TOMAN_PER_1M_INPUT: '10000',
      LLM_PRICE_TOMAN_PER_1M_OUTPUT: '50000',
    }
    expect(compatibleLlmOptionsFromEnv('complex')).toBeNull()
    expect(resolveComplexPlanLlmClient()).toBeNull()
    env.LLM_PLAN_MODEL_COMPLEX = 'cheap' // same model: no separate route
    expect(resolveComplexPlanLlmClient()).toBeNull()
    env.LLM_PLAN_MODEL_COMPLEX = 'strong'
    env.LLM_COMPLEX_PRICE_TOMAN_PER_1M_INPUT = '20000'
    env.LLM_COMPLEX_PRICE_TOMAN_PER_1M_OUTPUT = '120000'
    env.LLM_REASONING_EFFORT = 'low'
    expect(compatibleLlmOptionsFromEnv('complex')).toMatchObject({
      model: 'strong',
      prices: { input: 20_000, cachedInput: 20_000, output: 120_000 },
      reasoningEffort: null, // the cheap tier's effort doesn't leak into the complex tier
    })
    expect(compatibleLlmOptionsFromEnv().reasoningEffort).toBe('low')
    env.LLM_COMPLEX_REASONING_EFFORT = 'extreme'
    expect(() => compatibleLlmOptionsFromEnv('complex')).toThrow('invalid_env:LLM_COMPLEX_REASONING_EFFORT')
    delete env.LLM_COMPLEX_REASONING_EFFORT
    expect(resolveComplexPlanLlmClient()?.model).toBe('strong')
    expect(compatibleLlmOptionsFromEnv().model).toBe('cheap')
    // A Toman cap needs prices for the complex model too.
    env.AI_DAILY_BUDGET_TOMAN = '1000000'
    delete env.LLM_COMPLEX_PRICE_TOMAN_PER_1M_OUTPUT
    expect(() => compatibleLlmOptionsFromEnv('complex')).toThrow('invalid_env:LLM_COMPLEX_PRICE_TOMAN_PER_1M_INPUT')
  })

  it('maps alternative usage shapes and leaves unknown cost unknown', () => {
    expect(chatUsage({ usage: { input_tokens: 10, output_tokens: 5, prompt_cache_hit_tokens: 4 } }))
      .toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 4, reasoningTokens: undefined })
    expect(costInToman({ inputTokens: 10 }, { input: 1, cachedInput: 1, output: 1 })).toBeNull()
    expect(costInToman({ inputTokens: 10, outputTokens: 5 }, null)).toBeNull()
  })
})
