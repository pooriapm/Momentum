#!/usr/bin/env node
/**
 * R4 staging AI eval runner.
 * Default (--local): FA/EN stub + fail-closed live-provider checks without network.
 * --staging: requires provisioned staging + OPENAI credentials and a spend cap; never invents Pass.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const environments = JSON.parse(fs.readFileSync(path.join(root, 'supabase/environments.json'), 'utf8'))
const stagingMode = process.argv.includes('--staging')

if (stagingMode) {
  const blockers = []
  if (environments.staging?.status !== 'active') {
    blockers.push('staging.status is not_provisioned; provision isolated staging first')
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    blockers.push('OPENAI_API_KEY missing')
  }
  if (!process.env.OPENAI_PLAN_MODEL?.trim()) {
    blockers.push('OPENAI_PLAN_MODEL missing')
  }
  if (!process.env.MOMENTUM_AI_EVAL_SPEND_CAP_USD?.trim()) {
    blockers.push('MOMENTUM_AI_EVAL_SPEND_CAP_USD missing (owner-approved spend cap)')
  }
  const payload = {
    mode: 'staging',
    passed: false,
    blockers,
    professionalReview: 'required_human_signoff',
    note: 'Do not flip AI_PLAN_LIVE_OPENAI in production until staging evidence and professional review exist.',
  }
  console.log(JSON.stringify(payload, null, 2))
  process.exit(2)
}

const local = spawnSync(
  'npx',
  ['vitest', 'run', 'tests/plan-safety-eval.test.ts'],
  { cwd: root, stdio: 'inherit', env: process.env },
)

const summary = {
  mode: 'local',
  passed: local.status === 0,
  suites: ['tests/plan-safety-eval.test.ts'],
  liveOpenAi: 'fail_closed_covered_in_suite',
  stubFallbackOnLiveFailure: false,
  stagingLiveEval: 'blocked_until_credentials',
  professionalReview: 'deferred_human',
}
console.log(JSON.stringify(summary, null, 2))
process.exit(local.status ?? 1)
