import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))
const bucket = 'body-composition'
const expectedExportTables = [
  'profiles', 'onboarding_drafts', 'goals', 'dietary_preferences', 'health_context',
  'body_composition_measurements', 'training_schedule_items', 'subscriptions',
  'entitlements', 'usage_ledger', 'ai_generation_jobs', 'plans', 'plan_versions',
  'starter_plan_activations', 'external_plan_imports', 'gift_reservations',
  'monthly_plan_periods', 'monthly_plan_snapshots', 'next_cycle_inputs',
  'daily_checkins', 'weekly_checkins', 'daily_meal_status', 'extra_food_logs',
  'workout_sessions', 'workout_exercise_logs', 'workout_set_logs',
  'ai_safety_reports', 'export_requests', 'deletion_requests',
]

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it before the R2 portability proof.')
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
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function success(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`)
  return result.data
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
  assert((await response.text()).includes('Momentum R2 portability proof'), `${label} returned the wrong file.`)
}

const environment = localEnvironment()
const admin = client(environment.API_URL, environment.SERVICE_ROLE_KEY)
const authenticated = client(environment.API_URL, environment.ANON_KEY)
const suffix = randomUUID()
const email = `r2-portability-${suffix}@example.test`
const password = `R2-Portability-${randomUUID()}-aA1!`
const fileName = `portability-${suffix}.pdf`
let userId
let filePath
let deleted = false

try {
  const created = success(await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { locale: 'en-US', country_code: 'US', product_region: 'intl' },
  }), 'Could not create the portability user')
  userId = created.user.id
  filePath = `${userId}/${fileName}`

  success(await authenticated.auth.signInWithPassword({ email, password }), 'Portability user sign-in failed')
  success(await authenticated.from('onboarding_drafts').insert({
    user_id: userId,
    current_step: 'profile',
    payload: { proof: 'r2-portability' },
  }), 'Could not create owned export data')
  success(await authenticated.storage.from(bucket).upload(
    filePath,
    new Blob(['%PDF-1.4\n% Momentum R2 portability proof\n'], { type: 'application/pdf' }),
  ), 'Could not upload the private portability file')

  const first = success(await authenticated.functions.invoke('account-data', {
    body: { action: 'export-account' },
  }), 'Account export failed')
  assert(first.export_request?.status === 'ready', 'Account export was not finalized.')
  assert(first.export?.schema_version === 'momentum-account-export-v1', 'Export schema version is missing.')
  for (const table of expectedExportTables) {
    assert(Array.isArray(first.export?.data?.[table]), `Export omitted ${table}.`)
  }
  assert(first.export.data.profiles.length === 1, 'Export omitted the owned profile row.')
  assert(first.export.data.onboarding_drafts.length === 1, 'Export omitted the owned draft row.')
  await assertDownloadable(first.export.private_files?.[0], 'Initial export', environment.API_URL)

  const stored = success(
    await admin.rpc('get_account_export', { p_user_id: userId, p_include_artifact: true }),
    'Could not inspect the stored export artifact',
  )
  assert(stored.export?.private_files?.[0]?.path === filePath, 'Stored export omitted the stable file path.')
  assert(!stored.export?.private_files?.[0]?.signed_url, 'Stored export retained an expiring signed URL.')

  await new Promise((resolve) => setTimeout(resolve, 1_100))
  const downloaded = success(await authenticated.functions.invoke('account-data', {
    body: { action: 'export-download' },
  }), 'Export download failed')
  const refreshedFile = downloaded.export?.private_files?.[0]
  await assertDownloadable(refreshedFile, 'Downloaded export', environment.API_URL)
  assert(
    refreshedFile.signed_url !== first.export.private_files[0].signed_url,
    'Export download did not refresh the private file link.',
  )

  const deletion = success(await authenticated.functions.invoke('account-data', {
    body: { action: 'delete-account', confirmation: 'DELETE' },
    headers: {
      'Idempotency-Key': `delete:${suffix}`,
      'X-Request-ID': `r2-portability-delete:${suffix}`,
    },
  }), 'Account deletion failed')
  assert(deletion.deleted === true, 'Account deletion did not return completion.')
  deleted = true

  const identity = await admin.auth.admin.getUserById(userId)
  assert(identity.error || !identity.data?.user, 'Deleted auth identity still exists.')
  assert(success(
    await admin.from('profiles').select('user_id').eq('user_id', userId),
    'Could not verify relational cleanup',
  ).length === 0, 'Deleted account still has owned relational data.')
  assert(success(
    await admin.storage.from(bucket).list(userId, { search: fileName }),
    'Could not verify storage cleanup',
  ).filter((item) => item.name === fileName).length === 0, 'Deleted account still has a private file.')

  const receipt = psql(`
    select result || '|' || policy_version
    from private.deletion_receipts
    where account_hash = '${receiptHash(userId)}';
  `)
  assert(
    receipt === 'completed|momentum-deletion-receipt-v1',
    'An anonymized completed deletion receipt was not retained.',
  )

  console.log(JSON.stringify({
    export_tables: expectedExportTables.length,
    private_file: 'downloadable-and-refreshed',
    stored_artifact: 'path-only',
    deletion: 'identity-rows-storage-removed',
    receipt: 'anonymized-completed',
  }))
} finally {
  if (filePath && !deleted) await admin.storage.from(bucket).remove([filePath]).catch(() => undefined)
  if (userId && !deleted) await admin.auth.admin.deleteUser(userId).catch(() => undefined)
}
