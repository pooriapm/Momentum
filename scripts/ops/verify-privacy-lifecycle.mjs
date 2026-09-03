import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  HOSTED_API_URL,
  HOSTED_PROJECT_REF,
  assert,
  assertHostedAuthUrl,
  authClient,
  disposableProofEmail,
  readHostedApiKeysFromCli,
  resolveHostedAuthTarget,
  signupMetadata,
  writeProof,
} from './auth-proof-lib.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))
const bucket = 'body-composition'
const hosted = process.argv.includes('--hosted') || process.env.MOMENTUM_HOSTED_PRIVACY_PROOF === '1'
const requireHosted = process.argv.includes('--require') || process.env.MOMENTUM_HOSTED_PRIVACY_PROOF === '1'
const ciSkipHosted = Boolean(process.env.CI) && process.env.MOMENTUM_HOSTED_PRIVACY_PROOF !== '1'
const forbiddenProviderKeys = new Set(['prompt', 'instructions', 'input', 'health_text', 'healthFreeText'])

export const ACCOUNT_EXPORT_TABLES = [
  'profiles', 'onboarding_drafts', 'goals', 'dietary_preferences', 'health_context',
  'body_composition_measurements', 'training_schedule_items', 'subscriptions',
  'entitlements', 'usage_ledger', 'ai_generation_jobs', 'plans', 'plan_versions',
  'starter_plan_activations', 'external_plan_imports', 'gift_reservations',
  'monthly_plan_periods', 'monthly_plan_snapshots', 'next_cycle_inputs',
  'daily_checkins', 'weekly_checkins', 'daily_meal_status', 'extra_food_logs',
  'workout_sessions', 'workout_exercise_logs', 'workout_set_logs',
  'ai_safety_reports', 'export_requests', 'deletion_requests',
]

function step(label) {
  process.stdout.write(`${label}\n`)
}

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it before the privacy lifecycle drill.')
  }
  const jsonStart = output.indexOf('{')
  if (jsonStart < 0) throw new Error('Could not read the local Supabase environment.')
  const environment = JSON.parse(output.slice(jsonStart))
  for (const key of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
    if (!environment[key]) throw new Error(`Local Supabase did not expose ${key}.`)
  }
  return environment
}

function client(url, key) {
  return hosted
    ? authClient(url, key, 45_000)
    : createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function success(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`)
  return result.data
}

async function functionSuccess(result, message) {
  if (!result.error) return result.data
  let detail = ''
  const response = result.error.context
  if (response instanceof Response) {
    try {
      detail = await response.clone().text()
    } catch {
      // Keep the SDK error when the response body is unavailable.
    }
  }
  throw new Error(`${message}: ${detail || result.error.message}`)
}

function psql(sql) {
  return execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_momentum', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim()
}

function receiptHash(userId) {
  return createHash('sha256')
    .update(JSON.stringify({ account: userId, purpose: 'deletion-receipt' }))
    .digest('hex')
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys))
    return keys
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key)
      collectKeys(nested, keys)
    }
  }
  return keys
}

function assertNoProviderPrompt(payload) {
  const keys = collectKeys({
    usage_ledger: payload?.data?.usage_ledger,
    ai_generation_jobs: payload?.data?.ai_generation_jobs,
  })
  const leaked = keys.filter((key) => forbiddenProviderKeys.has(key))
  assert(leaked.length === 0, `Export retained provider prompt fields: ${leaked.join(', ')}`)
}

function assertProviderSourceContract() {
  const openai = fs.readFileSync(path.join(root, 'supabase/functions/_shared/openai.ts'), 'utf8')
  assert(openai.includes('store: false'), 'OpenAI helper must send store: false.')
  assert(!/\bstore:\s*true\b/.test(openai), 'OpenAI helper must not enable provider storage.')
  assert(openai.includes('safety_identifier'), 'OpenAI helper must send a hashed safety identifier, not a raw user id.')
}

async function assertDownloadable(file, label, apiUrl) {
  assert(file?.path && file?.signed_url, `${label} did not include a private file link.`)
  assert(file.expires_in_seconds === 600, `${label} exposed the wrong link lifetime.`)
  const signedUrl = new URL(file.signed_url)
  if (signedUrl.hostname === 'kong') {
    const localGateway = new URL(apiUrl)
    signedUrl.protocol = localGateway.protocol
    signedUrl.hostname = localGateway.hostname
    signedUrl.port = localGateway.port
  }
  const response = await fetch(signedUrl)
  assert(response.ok, `${label} private file link was not downloadable (${response.status}).`)
  assert((await response.text()).includes('Momentum privacy lifecycle proof'), `${label} returned the wrong file.`)
}

async function assertRefreshRejected(apiUrl, anonKey, refreshToken) {
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  assert(!response.ok, 'Refresh token still worked after account deletion.')
}

function seedProviderRows(userId) {
  const entitlementId = randomUUID()
  const usageId = randomUUID()
  const jobId = randomUUID()
  psql(`
    insert into public.entitlements(
      id, user_id, source, status, period_start, period_end, plan_generation_limit
    ) values (
      '${entitlementId}',
      '${userId}',
      'admin',
      'active',
      statement_timestamp() - interval '1 day',
      statement_timestamp() + interval '30 days',
      1
    );
    insert into public.usage_ledger(
      id, user_id, entitlement_id, feature, idempotency_key, request_sha256, status
    ) values (
      '${usageId}',
      '${userId}',
      '${entitlementId}',
      'plan_generation',
      'privacy-lifecycle-${userId.slice(0, 8)}',
      repeat('a', 64),
      'completed'
    );
    insert into public.ai_generation_jobs(
      id, user_id, usage_ledger_id, idempotency_key, status, requested_locale,
      requested_days, request_fingerprint, request_metadata, prompt_version, model, product_region
    ) values (
      '${jobId}',
      '${userId}',
      '${usageId}',
      'privacy-job-${userId.slice(0, 8)}',
      'completed',
      'en-US',
      30,
      repeat('b', 64),
      '{"locale":"en-US"}'::jsonb,
      'stub-1',
      'stub-monthly',
      'intl'
    );
  `)
}

function resolveHostedCredentials() {
  step('Resolving hosted privacy-drill credentials')
  const target = resolveHostedAuthTarget()
  let { url, anon, serviceRole } = target
  if (!anon || !serviceRole) {
    step('Reading hosted API keys from Supabase CLI')
    const fromCli = readHostedApiKeysFromCli(HOSTED_PROJECT_REF)
    anon = anon || fromCli.anon
    serviceRole = serviceRole || fromCli.serviceRole
  }
  assertHostedAuthUrl(url || HOSTED_API_URL)
  assert(anon, 'Hosted anon key is missing.')
  assert(serviceRole, 'Hosted service-role key is missing.')
  return { url: HOSTED_API_URL, anon, serviceRole }
}

if (hosted && ciSkipHosted && !requireHosted) {
  console.log(JSON.stringify({
    privacyLifecycle: 'skipped',
    environment: 'hosted',
    reason: 'CI does not hit production export/delete unless MOMENTUM_HOSTED_PRIVACY_PROOF=1',
  }, null, 2))
  process.exit(0)
}

let environment
try {
  environment = hosted ? resolveHostedCredentials() : localEnvironment()
} catch (error) {
  if (hosted && !requireHosted) {
    console.log(JSON.stringify({
      privacyLifecycle: 'skipped',
      environment: 'hosted',
      reason: 'Could not read hosted keys from env or `supabase projects api-keys`.',
    }, null, 2))
    process.exit(0)
  }
  throw error
}

const apiUrl = hosted ? HOSTED_API_URL : environment.API_URL
const admin = client(apiUrl, hosted ? environment.serviceRole : environment.SERVICE_ROLE_KEY)
const anonKey = hosted ? environment.anon : environment.ANON_KEY
const suffix = randomUUID()
const password = `Privacy-${suffix}-aA1!`
const subjectEmail = hosted
  ? disposableProofEmail('momentum-privacy', suffix)
  : `privacy-lifecycle-${suffix}@example.test`
const neighborEmail = hosted
  ? disposableProofEmail('momentum-privacy-n', suffix)
  : `privacy-neighbor-${suffix}@example.test`
const fileName = `privacy-${suffix}.pdf`
const neighborMarker = `privacy-neighbor-secret-${suffix}`
const startedAt = new Date().toISOString()
let subjectId
let neighborId
let subjectPath
let neighborPath
let deleted = false
const created = []

assertProviderSourceContract()

async function cleanup() {
  if (subjectPath && !deleted) {
    await admin.storage.from(bucket).remove([subjectPath]).catch(() => undefined)
  }
  if (neighborPath) await admin.storage.from(bucket).remove([neighborPath]).catch(() => undefined)
  await Promise.all(
    created.map((userId) => admin.auth.admin.deleteUser(userId).catch(() => undefined)),
  )
}

try {
  step('Creating subject and neighbor identities')
  const subject = success(await admin.auth.admin.createUser({
    email: subjectEmail,
    password,
    email_confirm: true,
    user_metadata: signupMetadata(),
  }), 'Could not create the privacy subject')
  subjectId = subject.user.id
  created.push(subjectId)
  subjectPath = `${subjectId}/reports/${fileName}`

  const neighbor = success(await admin.auth.admin.createUser({
    email: neighborEmail,
    password,
    email_confirm: true,
    user_metadata: signupMetadata(),
  }), 'Could not create the privacy neighbor')
  neighborId = neighbor.user.id
  created.push(neighborId)
  neighborPath = `${neighborId}/${fileName}`

  const subjectClient = client(apiUrl, anonKey)
  const neighborClient = client(apiUrl, anonKey)
  const subjectSession = success(
    await subjectClient.auth.signInWithPassword({ email: subjectEmail, password }),
    'Subject sign-in failed',
  )
  success(
    await neighborClient.auth.signInWithPassword({ email: neighborEmail, password }),
    'Neighbor sign-in failed',
  )
  const refreshToken = subjectSession.session?.refresh_token
  assert(refreshToken, 'Subject session did not include a refresh token.')

  success(await subjectClient.from('onboarding_drafts').insert({
    user_id: subjectId,
    current_step: 'profile',
    payload: { proof: 'privacy-subject' },
  }), 'Could not create the subject draft')
  success(await neighborClient.from('onboarding_drafts').insert({
    user_id: neighborId,
    current_step: 'profile',
    payload: { proof: neighborMarker },
  }), 'Could not create the neighbor draft')

  const pdf = new Blob(['%PDF-1.4\n% Momentum privacy lifecycle proof\n'], { type: 'application/pdf' })
  success(await subjectClient.storage.from(bucket).upload(subjectPath, pdf), 'Could not upload the subject private file')
  success(await neighborClient.storage.from(bucket).upload(neighborPath, pdf), 'Could not upload the neighbor private file')

  if (!hosted) {
    step('Seeding local provider usage rows')
    seedProviderRows(subjectId)
  }

  step('Exporting the subject account')
  const exported = await functionSuccess(await subjectClient.functions.invoke('account-data', {
    body: { action: 'export-account' },
  }), 'Account export failed')
  assert(exported.export_request?.status === 'ready', 'Account export was not finalized.')
  assert(exported.export?.schema_version === 'momentum-account-export-v1', 'Export schema version is missing.')
  for (const table of ACCOUNT_EXPORT_TABLES) {
    assert(Array.isArray(exported.export?.data?.[table]), `Export omitted ${table}.`)
  }
  assert(exported.export.data.profiles.length === 1, 'Export omitted the owned profile row.')
  assert(exported.export.data.onboarding_drafts.length === 1, 'Export omitted the owned draft row.')
  assert(
    !JSON.stringify(exported.export.data).includes(neighborMarker),
    'Export included another account\'s data.',
  )
  assertNoProviderPrompt(exported.export)
  if (!hosted) {
    assert(exported.export.data.usage_ledger.length === 1, 'Export omitted the provider usage row.')
    assert(exported.export.data.ai_generation_jobs.length === 1, 'Export omitted the provider job row.')
    assert(exported.export.data.ai_generation_jobs[0]?.prompt_version === 'stub-1', 'Export omitted the provider job version.')
  }
  await assertDownloadable(exported.export.private_files?.[0], 'Account export', apiUrl)

  const stored = success(
    await admin.rpc('get_account_export', { p_user_id: subjectId, p_include_artifact: true }),
    'Could not inspect the stored export artifact',
  )
  assert(stored.export?.private_files?.[0]?.path === subjectPath, 'Stored export omitted the nested file path.')
  assert(!stored.export?.private_files?.[0]?.signed_url, 'Stored export retained an expiring signed URL.')

  step('Deleting the subject through the product action')
  const deletion = await functionSuccess(await subjectClient.functions.invoke('account-data', {
    body: { action: 'delete-account', confirmation: 'DELETE' },
    headers: {
      'Idempotency-Key': `privacy-delete:${suffix}`,
      'X-Request-ID': `privacy-delete:${suffix}`,
    },
  }), 'Account deletion failed')
  assert(deletion.deleted === true, 'Account deletion did not return completion.')
  deleted = true

  const identity = await admin.auth.admin.getUserById(subjectId)
  assert(identity.error || !identity.data?.user, 'Deleted auth identity still exists.')
  await assertRefreshRejected(apiUrl, anonKey, refreshToken)

  for (const table of ACCOUNT_EXPORT_TABLES) {
    const rows = success(
      await admin.from(table).select('user_id').eq('user_id', subjectId),
      `Could not verify ${table} cleanup`,
    )
    assert(rows.length === 0, `Deleted account still has ${table} rows.`)
  }

  const leftoverFiles = success(
    await admin.storage.from(bucket).list(`${subjectId}/reports`, { search: fileName }),
    'Could not verify storage cleanup',
  ).filter((item) => item.name === fileName)
  assert(leftoverFiles.length === 0, 'Deleted account still has a private file.')

  const neighborDrafts = success(
    await admin.from('onboarding_drafts').select('user_id').eq('user_id', neighborId),
    'Could not verify neighbor isolation',
  )
  assert(neighborDrafts.length === 1, 'Neighbor relational data was removed by the subject deletion.')
  const neighborFiles = success(
    await admin.storage.from(bucket).list(neighborId, { search: fileName }),
    'Could not list neighbor storage after subject deletion',
  ).filter((item) => item.name === fileName)
  assert(neighborFiles.length === 1, 'Neighbor private file was removed by the subject deletion.')

  let receipt = 'hosted-skipped'
  if (!hosted) {
    receipt = psql(`
      select result || '|' || policy_version
      from private.deletion_receipts
      where account_hash = '${receiptHash(subjectId)}';
    `)
    assert(
      receipt === 'completed|momentum-deletion-receipt-v1',
      'An anonymized completed deletion receipt was not retained.',
    )
  }

  const evidence = {
    environment: hosted ? 'hosted' : 'local',
    projectRef: hosted ? HOSTED_PROJECT_REF : 'momentum',
    startedAt,
    finishedAt: new Date().toISOString(),
    exportTables: ACCOUNT_EXPORT_TABLES.length,
    auth: 'identity-and-refresh-revoked',
    database: 'owner-tables-empty-neighbor-preserved',
    storage: 'nested-private-file-removed-neighbor-preserved',
    provider: hosted
      ? 'store-false-and-fail-closed-no-live-provider-store'
      : 'usage-and-jobs-exported-then-removed',
    receipt,
  }
  const evidencePath = writeProof(
    `privacy-lifecycle-${hosted ? 'hosted' : 'local'}-${startedAt.replaceAll(':', '')}.json`,
    evidence,
    'privacy-proofs',
  )
  console.log(JSON.stringify({ privacyLifecycle: 'passed', evidencePath, ...evidence }, null, 2))
} catch (error) {
  await cleanup()
  throw error
}

await cleanup()
