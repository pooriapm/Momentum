import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertLiveAiMarketAllowed } from '../supabase/functions/_shared/ai-market.ts'
import { createStructuredResponse } from '../supabase/functions/_shared/openai.ts'

function env(values: Record<string, string | undefined>) {
  vi.stubGlobal('Deno', { env: { get: (name: string) => values[name] } })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('R4 OpenAI Responses boundary', () => {
  it('sends a non-stored strict JSON-schema request and maps structured usage', async () => {
    env({
      AI_PLAN_LIVE_OPENAI: 'true',
      OPENAI_API_KEY: 'test-key',
      OPENAI_PLAN_REASONING_EFFORT: 'low',
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'resp_test',
      output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }],
      usage: {
        input_tokens: 120,
        output_tokens: 30,
        input_tokens_details: { cached_tokens: 80 },
        output_tokens_details: { reasoning_tokens: 10 },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    await expect(createStructuredResponse<{ ok: boolean }>({
      model: 'gpt-test',
      reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT',
      instructions: 'Return the schema.',
      input: { locale: 'en-US' },
      schemaName: 'momentum_plan',
      schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
      safetyIdentifier: 'safe-hash',
      promptCacheKey: 'prompt:v1',
      maxOutputTokens: 100,
    })).resolves.toEqual({
      id: 'resp_test',
      parsed: { ok: true },
      usage: { inputTokens: 120, outputTokens: 30, cachedInputTokens: 80, reasoningTokens: 10 },
    })

    const request = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(request).toMatchObject({
      model: 'gpt-test',
      store: false,
      safety_identifier: 'safe-hash',
      prompt_cache_key: 'prompt:v1',
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', name: 'momentum_plan', strict: true } },
    })
  })

  it('fails closed on malformed output and provider errors', async () => {
    env({ AI_PLAN_LIVE_OPENAI: 'true', OPENAI_API_KEY: 'test-key' })
    const options = {
      model: 'gpt-test', reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT', instructions: 'x',
      input: {}, schemaName: 'plan', schema: { type: 'object' }, safetyIdentifier: 'hash',
      promptCacheKey: 'plan', maxOutputTokens: 100,
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'resp_bad', output_text: 'not-json', usage: {},
    }), { status: 200 }))
    await expect(createStructuredResponse(options)).rejects.toMatchObject({ code: 'OPENAI_MALFORMED_OUTPUT' })

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{', { status: 200 }))
    await expect(createStructuredResponse(options)).rejects.toMatchObject({ code: 'OPENAI_MALFORMED_RESPONSE' })

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 429 }))
    await expect(createStructuredResponse(options)).rejects.toMatchObject({ code: 'OPENAI_UNAVAILABLE' })
  })

  it('requires an explicit approved country and always blocks Iran', () => {
    env({ AI_ENABLED_MARKETS: 'US,CA' })
    expect(assertLiveAiMarketAllowed('us')).toBe('US')
    expect(() => assertLiveAiMarketAllowed('DE')).toThrow(expect.objectContaining({ code: 'AI_MARKET_NOT_APPROVED' }))
    expect(() => assertLiveAiMarketAllowed('IR')).toThrow(expect.objectContaining({ code: 'AI_MARKET_BLOCKED' }))
  })
})
