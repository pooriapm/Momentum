// Plan-generation spend and quality report (stage 8 monitoring). Read-only; never sends alerts.
//
//   Local:      node scripts/ops/ai-plan-report.mjs --local [--days 7]
//   Production: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [AI_DAILY_BUDGET_TOMAN=...] \
//                 node scripts/ops/ai-plan-report.mjs [--days 7] [--json]
//
// Prints one row per Tehran day and the state of the ai_* alerts in ops/contract.json. Exit code 2
// when a paging alert fires, 1 when a notify alert fires, else 0, so a scheduler can act on it.
// Keys come only from the environment (or the local CLI) and are never printed.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const local = args.includes('--local')
const asJson = args.includes('--json')
const daysArg = args[args.indexOf('--days') + 1]
const days = args.includes('--days') ? Math.max(1, Math.min(366, Number(daysArg) || 7)) : 7
function localEnvironment() {
  const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))
  let output
  try {
    const cli = process.platform === 'win32' ? `${supabaseCli}.cmd` : supabaseCli
    output = execFileSync(cli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it with npx supabase start.')
  }
  const environment = JSON.parse(output.slice(output.indexOf('{')))
  return { url: environment.API_URL, key: environment.SERVICE_ROLE_KEY }
}

/** Alert states from the report rows (today first) and the rolling 24h spend. */
export function evaluateAlerts({ today, spent24hToman, budgetToman }) {
  const rate = (part, whole) => (whole >= 5 ? part / whole : 0)
  const alerts = []
  if (budgetToman) {
    if (spent24hToman >= budgetToman) alerts.push({ id: 'ai_budget_exhausted', page: true })
    else if (spent24hToman >= budgetToman * 0.8) alerts.push({ id: 'ai_budget_80pct', page: false })
  }
  if (today) {
    if (rate(Number(today.delivered_fallback), Number(today.plans_delivered)) > 0.2) {
      alerts.push({ id: 'ai_plan_fallback_rate_high', page: false })
    }
    if (rate(Number(today.provider_failures), Number(today.provider_calls)) > 0.2) {
      alerts.push({ id: 'ai_provider_failure_rate_high', page: true })
    }
  }
  return alerts
}

async function main() {
  const { url, key } = local
    ? localEnvironment()
    : { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --local.')
  const admin = createClient(url, key, { auth: { persistSession: false } })

  const [report, spend] = await Promise.all([
    admin.rpc('ai_plan_generation_report', { p_days: days }),
    admin.rpc('ai_spend_toman_since', {
      p_since: new Date(Date.now() - 24 * 3_600_000).toISOString(),
    }),
  ])
  if (report.error || spend.error) throw new Error('Report RPCs are unavailable (is migration 202610210100 applied?).')

  const rows = report.data ?? []
  const budgetToman = Number(process.env.AI_DAILY_BUDGET_TOMAN) || null
  const spent24hToman = Number(spend.data ?? 0)
  const today = rows[0]
  const alerts = evaluateAlerts({ today, spent24hToman, budgetToman })

  if (asJson) {
    console.log(JSON.stringify({ days: rows, spent24hToman, budgetToman, alerts }, null, 2))
  } else {
    console.table(rows.map((row) => ({
      day: row.day,
      calls: Number(row.provider_calls),
      repairs: Number(row.repair_calls),
      outages: Number(row.provider_failures),
      invalid: Number(row.validation_failures),
      plans: Number(row.plans_delivered),
      llm: Number(row.delivered_llm),
      repaired: Number(row.delivered_llm_repaired),
      fallback: Number(row.delivered_fallback),
      toman: Number(row.cost_toman),
      toman_per_plan: Number(row.plans_delivered) ? Math.round(Number(row.cost_toman) / Number(row.plans_delivered)) : null,
      cache_pct: Number(row.input_tokens) ? Math.round((100 * Number(row.cached_input_tokens)) / Number(row.input_tokens)) : null,
      p95_ms: row.p95_latency_ms,
      unpriced: Number(row.calls_without_cost),
    })))
    console.log(`Spend last 24h: ${spent24hToman} Toman${budgetToman ? ` of ${budgetToman}` : ' (no AI_DAILY_BUDGET_TOMAN given)'}`)
    console.log(alerts.length ? `Alerts: ${alerts.map((alert) => alert.id).join(', ')}` : 'Alerts: none')
  }
  process.exitCode = alerts.some((alert) => alert.page) ? 2 : alerts.length ? 1 : 0
}

// Run only when executed directly (tests import evaluateAlerts).
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Report failed.')
    process.exitCode = 3
  })
}
