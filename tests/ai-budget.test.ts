import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertDailyBudget, budgetState } from '../supabase/functions/_shared/ai-budget.ts'
import { compatibleLlmOptionsFromEnv } from '../supabase/functions/_shared/plan-llm-compatible.ts'
import { evaluateAlerts } from '../scripts/ops/ai-plan-report.mjs'

let env: Record<string, string | undefined> = {}
beforeEach(() => {
  env = {}
  vi.stubGlobal('Deno', { env: { get: (name: string) => env[name] } })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('stage 8: Toman spend caps', () => {
  it('classifies spend against the daily budget', () => {
    expect(budgetState(0, 1_000_000)).toBe('ok')
    expect(budgetState(799_999, 1_000_000)).toBe('ok')
    expect(budgetState(800_000, 1_000_000)).toBe('warning')
    expect(budgetState(1_000_000, 1_000_000)).toBe('paused')
  })

  it('checks the rolling 24 hours before every billable call', async () => {
    const spent = vi.fn(async () => 0)
    await assertDailyBudget(spent)
    expect(spent).not.toHaveBeenCalled() // no budget configured: no lookup

    env.AI_DAILY_BUDGET_TOMAN = '2000000'
    const now = new Date('2026-10-21T10:00:00Z')
    await assertDailyBudget(spent, now)
    expect(spent).toHaveBeenCalledWith('2026-10-20T10:00:00.000Z')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await assertDailyBudget(async () => 1_700_000, now)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"state":"warning"'))
    await expect(assertDailyBudget(async () => 2_000_000, now))
      .rejects.toMatchObject({ status: 503, code: 'AI_BUDGET_PAUSED' })
    // Logs carry numbers only.
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/user|email|@/i)

    await expect(assertDailyBudget(undefined, now)).rejects.toMatchObject({ code: 'AI_BUDGET_UNAVAILABLE' })
    env.AI_DAILY_BUDGET_TOMAN = '-5'
    await expect(assertDailyBudget(spent, now)).rejects.toThrow('invalid_env:AI_DAILY_BUDGET_TOMAN')
  })

  it('refuses a Toman cap without a Toman price list', () => {
    env = {
      AI_PLAN_LIVE_LLM: 'true',
      LLM_API_BASE_URL: 'https://llm.example.ir/v1',
      LLM_API_KEY: 'k',
      LLM_PLAN_MODEL: 'm',
      AI_DAILY_BUDGET_TOMAN: '1000000',
    }
    expect(() => compatibleLlmOptionsFromEnv()).toThrow('invalid_env:LLM_PRICE_TOMAN_PER_1M_INPUT')
    env.LLM_PRICE_TOMAN_PER_1M_INPUT = '100000'
    env.LLM_PRICE_TOMAN_PER_1M_OUTPUT = '400000'
    expect(compatibleLlmOptionsFromEnv().prices).toEqual({ input: 100_000, cachedInput: 100_000, output: 400_000 })
  })
})

describe('stage 8: monitoring alerts', () => {
  const day = (overrides: Record<string, number>) => ({
    provider_calls: 20, provider_failures: 0, plans_delivered: 10, delivered_fallback: 0, ...overrides,
  })

  it('fires the budget alerts from the rolling spend', () => {
    expect(evaluateAlerts({ today: day({}), spent24hToman: 500, budgetToman: 1_000 })).toEqual([])
    expect(evaluateAlerts({ today: day({}), spent24hToman: 800, budgetToman: 1_000 }))
      .toEqual([{ id: 'ai_budget_80pct', page: false }])
    expect(evaluateAlerts({ today: day({}), spent24hToman: 1_000, budgetToman: 1_000 }))
      .toEqual([{ id: 'ai_budget_exhausted', page: true }])
    expect(evaluateAlerts({ today: day({}), spent24hToman: 9_999, budgetToman: null })).toEqual([])
  })

  it('fires the rate alerts only with enough volume', () => {
    expect(evaluateAlerts({ today: day({ delivered_fallback: 3 }), spent24hToman: 0, budgetToman: null }))
      .toEqual([{ id: 'ai_plan_fallback_rate_high', page: false }])
    expect(evaluateAlerts({ today: day({ provider_failures: 5 }), spent24hToman: 0, budgetToman: null }))
      .toEqual([{ id: 'ai_provider_failure_rate_high', page: true }])
    expect(evaluateAlerts({
      today: day({ plans_delivered: 4, delivered_fallback: 4, provider_calls: 4, provider_failures: 4 }),
      spent24hToman: 0,
      budgetToman: null,
    })).toEqual([])
  })
})
