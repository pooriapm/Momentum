import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const requiredDefaults = [
  'AI_PLAN_PROVIDER=stub', 'AI_PLAN_LIVE_OPENAI=false', 'AI_ENABLED_MARKETS=',
  'PAYMENTS_MASTER_ENABLED=false', 'PAYMENTS_ENABLED_MARKETS=',
  'ALPHA_ENROLLMENT_ENABLED=false', 'ALPHA_COHORT_IDS=', 'ALPHA_COUNTRY_ALLOWLIST=',
  'PUBLIC_BETA_ENABLED=false', 'BETA_COUNTRY_ALLOWLIST=',
]
const env = read('supabase/.env.example')
for (const line of requiredDefaults) {
  assert(env.split('\n').some((row) => row.trim() === line), `Missing fail-closed default: ${line}`)
}

const openai = read('supabase/functions/_shared/openai.ts')
assert(openai.includes('store: false'), 'R4 provider requests must disable storage.')
assert(openai.includes("type: 'json_schema'"), 'R4 provider requests must use strict JSON schema.')
assert(read('supabase/functions/_shared/ai-market.ts').includes("country === 'IR'"), 'R4 must hard-block IR.')
assert(read('supabase/functions/_shared/billing.ts').includes("country === 'IR'"), 'R5 must hard-block IR.')
assert(read('supabase/functions/_shared/release-gates.ts').includes('PUBLIC_BETA_ENABLED'), 'R8 server gate missing.')
JSON.parse(read('release-evidence/schema.json'))

if (process.argv.includes('--release')) {
  for (const stage of ['R4', 'R5', 'R6', 'R7', 'R8']) {
    const filename = path.join(root, 'release-evidence', `${stage}.json`)
    assert(fs.existsSync(filename), `${stage} release evidence is missing.`)
    const record = JSON.parse(fs.readFileSync(filename, 'utf8'))
    assert.equal(record.stage, stage, `${stage} record stage mismatch.`)
    assert.equal(record.schemaVersion, '1.0.0', `${stage} record schema mismatch.`)
    assert.match(record.commit ?? '', /^[a-f0-9]{40}$/, `${stage} requires an exact commit.`)
    assert.equal(record.decision, 'go', `${stage} is not approved.`)
    assert(Array.isArray(record.evidence) && record.evidence.length > 0, `${stage} evidence is empty.`)
    assert(Array.isArray(record.signoffs) && record.signoffs.length > 0, `${stage} sign-offs are empty.`)
  }
  console.log('R4-R8 release evidence passed.')
} else {
  console.log('R4-R8 fail-closed implementation contracts passed; external release evidence was not asserted.')
}
