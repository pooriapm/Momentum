import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const requiredDefaults = [
  'AI_PLAN_PROVIDER=stub', 'AI_PLAN_LIVE_OPENAI=false',
  'PAYMENTS_MASTER_ENABLED=false', 'IR_PAYMENT_PROVIDER=zarinpal',
  'INTERNATIONAL_PAYMENT_PROVIDER=stripe',
  'ALPHA_ENROLLMENT_ENABLED=false', 'ALPHA_COHORT_IDS=',
  'PUBLIC_BETA_ENABLED=false',
]
const env = read('supabase/.env.example')
for (const line of requiredDefaults) {
  assert(env.split('\n').some((row) => row.trim() === line), `Missing fail-closed default: ${line}`)
}

const openai = read('supabase/functions/_shared/openai.ts')
assert(openai.includes('store: false'), 'R4 provider requests must disable storage.')
assert(openai.includes("type: 'json_schema'"), 'R4 provider requests must use strict JSON schema.')
const planProvider = read('supabase/functions/_shared/plan-provider.ts')
assert(planProvider.includes('assertLiveOpenAiEnabled()'), 'R4 live-provider switch must fail closed.')
assert(!planProvider.includes('AI_PLAN_FALLBACK_TO_STUB'), 'R4 live-provider failure must not publish a stub plan.')
assert.equal(read('supabase/functions/_shared/plan-period.ts').trim(), 'export const MONTHLY_PLAN_DAYS = 30', 'Monthly plan duration must be exactly 30 days.')
const planContract = read('supabase/functions/_shared/plan-contract.ts')
assert(planContract.includes('minItems: MONTHLY_PLAN_DAYS') && planContract.includes('maxItems: MONTHLY_PLAN_DAYS'), 'Monthly provider schema must require exactly 30 days.')
assert(!read('supabase/functions/account-data/index.ts').includes('% content.days.length'), 'Account projection must not repeat a short plan across a monthly period.')
const billing = read('supabase/functions/_shared/billing.ts')
assert(billing.includes("IR_PAYMENT_PROVIDER") && billing.includes("?? 'zarinpal'"), 'R5 Iran payment route is missing.')
assert(
  billing.includes('INTERNATIONAL_PAYMENT_PROVIDER') && /(?:\?\?\s*\n\s*)?'stripe'/.test(billing),
  'R5 international payment route is missing.',
)
const releaseGates = read('supabase/functions/_shared/release-gates.ts')
assert(releaseGates.includes('PUBLIC_BETA_ENABLED'), 'R8 server gate missing.')
assert(releaseGates.includes('assertProductEnrollmentAccess'), 'Composed enrollment assert missing.')
assert(
  read('supabase/functions/account-data/index.ts').includes('assertAccountDataEnrollmentAccess'),
  'account-data must enforce enrollment gates.',
)
assert(
  read('supabase/functions/generate-monthly-plan/index.ts').includes('assertProductEnrollmentAccess'),
  'generate-monthly-plan must enforce enrollment gates.',
)
assert(
  read('supabase/functions/checkins/index.ts').includes('assertProductEnrollmentAccess'),
  'checkins must enforce enrollment gates.',
)
assert(
  read('supabase/functions/account-settings/index.ts').includes('assertAccountSettingsEnrollmentAccess'),
  'account-settings must enforce enrollment gates.',
)

const schema = JSON.parse(read('release-evidence/schema.json'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validateRecord = ajv.compile(schema)

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function assertSchemaValid(label, record) {
  const ok = validateRecord(record)
  if (!ok) {
    const details = (validateRecord.errors ?? [])
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ')
    assert.fail(`${label} failed schema validation: ${details}`)
  }
}

function collectHistoryRecords() {
  const historyDir = path.join(root, 'release-evidence', 'history')
  if (!fs.existsSync(historyDir)) return []
  return fs.readdirSync(historyDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      name,
      record: loadJson(path.join(historyDir, name)),
    }))
}

if (process.argv.includes('--release')) {
  const seenReleaseIds = new Set()
  const history = collectHistoryRecords()
  for (const entry of history) {
    assertSchemaValid(`history/${entry.name}`, entry.record)
    assert(
      !seenReleaseIds.has(entry.record.releaseId),
      `Duplicate releaseId in history: ${entry.record.releaseId}`,
    )
    seenReleaseIds.add(entry.record.releaseId)
  }

  const promotionReady = []
  for (const stage of ['R4', 'R5', 'R6', 'R7', 'R8']) {
    const filename = path.join(root, 'release-evidence', `${stage}.json`)
    assert(fs.existsSync(filename), `${stage} release evidence is missing.`)
    const record = loadJson(filename)
    assertSchemaValid(stage, record)
    assert.equal(record.stage, stage, `${stage} record stage mismatch.`)

    if (seenReleaseIds.has(record.releaseId)) {
      const prior = history.find((entry) => entry.record.releaseId === record.releaseId)
      if (prior) {
        assert.deepEqual(
          prior.record,
          record,
          `${stage} reuses releaseId ${record.releaseId} with changed content; append a new releaseId instead.`,
        )
      }
    } else {
      seenReleaseIds.add(record.releaseId)
    }

    if (record.decision === 'go') {
      promotionReady.push(stage)
      continue
    }
    assert.fail(
      `${stage} is structurally valid but decision is '${record.decision}'; promotion requires 'go'.`,
    )
  }

  assert.equal(promotionReady.length, 5, 'All five stages must be approved for promotion.')
  console.log('R4-R8 release evidence passed schema, uniqueness, and promotion checks.')
} else {
  console.log('R4-R8 fail-closed implementation contracts passed; external release evidence was not asserted.')
}
