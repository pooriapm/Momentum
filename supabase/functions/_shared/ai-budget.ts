import { HttpError } from './http.ts'
import { optionalEnv } from './config.ts'

/**
 * Stage 8: spend caps in Toman.
 * - AI_DAILY_BUDGET_TOMAN: provider spend over the last 24 hours (rolling). Checked before every
 *   billable call; at or over the cap the job fails with AI_BUDGET_PAUSED (503, "try again later")
 *   and nothing is imported, so the user's quota is not used. A soft cap: calls already in flight
 *   can finish, so real spend can pass it by at most the cost of those calls.
 * - AI_PLAN_MAX_COST_TOMAN: per plan. When the first answer already cost this much, the repair call
 *   is skipped and the validated deterministic plan is delivered instead (reason recorded).
 * Unset = no cap. Spend comes from ai_usage_attempts.cost_toman, so a cap needs the Toman price
 * list (LLM_PRICE_TOMAN_PER_1M_*); compatibleLlmOptionsFromEnv refuses a cap without prices.
 */
export const BUDGET_WINDOW_MS = 24 * 3_600_000
export const BUDGET_WARNING_RATIO = 0.8

function tomanEnv(name: string): number | null {
  const raw = optionalEnv(name)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`invalid_env:${name}`)
  return value
}

export function dailyBudgetToman(): number | null {
  return tomanEnv('AI_DAILY_BUDGET_TOMAN')
}

export function planCostCapToman(): number | null {
  return tomanEnv('AI_PLAN_MAX_COST_TOMAN')
}

export type BudgetState = 'ok' | 'warning' | 'paused'

export function budgetState(spentToman: number, budgetToman: number): BudgetState {
  if (spentToman >= budgetToman) return 'paused'
  if (spentToman >= budgetToman * BUDGET_WARNING_RATIO) return 'warning'
  return 'ok'
}

/**
 * Throws AI_BUDGET_PAUSED when the rolling 24-hour spend has reached the daily budget. Logs a
 * warning (numbers only) from 80%. No-op without a configured budget.
 */
export async function assertDailyBudget(
  spentTomanSince: ((sinceIso: string) => Promise<number>) | undefined,
  now: Date = new Date(),
): Promise<void> {
  const budget = dailyBudgetToman()
  if (budget === null) return
  if (!spentTomanSince) {
    throw new HttpError(503, 'AI_BUDGET_UNAVAILABLE', 'AI spend protection is unavailable.')
  }
  const spent = await spentTomanSince(new Date(now.getTime() - BUDGET_WINDOW_MS).toISOString())
  const state = budgetState(spent, budget)
  if (state === 'ok') return
  console.warn(JSON.stringify({ event: 'ai_budget', state, spent_toman: spent, budget_toman: budget }))
  if (state === 'paused') {
    throw new HttpError(
      503,
      'AI_BUDGET_PAUSED',
      'The plan service is busy right now. Please try again in a few hours.',
    )
  }
}
