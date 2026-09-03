import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
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
export const BODY_REPORT_BUCKET = 'body-composition'
export const BODY_REPORT_RETENTION_DAYS = 30
export const BODY_REPORT_SIGNED_URL_SECONDS = 600
export const BODY_REPORT_MAX_BYTES = 10 * 1024 * 1024
export const BODY_REPORT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const hosted = process.argv.includes('--hosted') || process.env.MOMENTUM_HOSTED_BODY_REPORT_PROOF === '1'
const requireHosted = process.argv.includes('--require') || process.env.MOMENTUM_HOSTED_BODY_REPORT_PROOF === '1'
const ciSkipHosted = Boolean(process.env.CI) && process.env.MOMENTUM_HOSTED_BODY_REPORT_PROOF !== '1'
const marker = '%PDF-1.4\n% Momentum private body-report proof\n'

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
    throw new Error('Local Supabase is not running. Start it before the body-report drill.')
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

function assertDenied(result, message) {
  if (!result.error) throw new Error(message)
}

function rewriteLocalSignedUrl(signedUrl, apiUrl) {
  const url = new URL(signedUrl)
  if (url.hostname === 'kong') {
    const localGateway = new URL(apiUrl)
    url.protocol = localGateway.protocol
    url.hostname = localGateway.hostname
    url.port = localGateway.port
  }
  return url
}

async function assertDownloadable(signedUrl, apiUrl, label) {
  const response = await fetch(rewriteLocalSignedUrl(signedUrl, apiUrl))
  assert(response.ok, `${label} was not downloadable (${response.status}).`)
  assert((await response.text()).includes('Momentum private body-report proof'), `${label} returned the wrong file.`)
}

function psql(sql) {
  return execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_momentum', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim()
}

function resolveHostedCredentials() {
  step('Resolving hosted body-report credentials')
  const target = resolveHostedAuthTarget()
  let { url, anon, serviceRole } = target
  if (!anon || !serviceRole) {
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
    bodyReport: 'skipped',
    environment: 'hosted',
    reason: 'CI does not hit production Storage unless MOMENTUM_HOSTED_BODY_REPORT_PROOF=1',
  }, null, 2))
  process.exit(0)
}

let environment
try {
  environment = hosted ? resolveHostedCredentials() : localEnvironment()
} catch (error) {
  if (hosted && !requireHosted) {
    console.log(JSON.stringify({
      bodyReport: 'skipped',
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
const anonymous = client(apiUrl, anonKey)
const suffix = randomUUID()
const password = `BodyReport-${suffix}-aA1!`
const ownerEmail = hosted
  ? disposableProofEmail('momentum-body', suffix)
  : `body-report-${suffix}@example.test`
const neighborEmail = hosted
  ? disposableProofEmail('momentum-body-n', suffix)
  : `body-report-n-${suffix}@example.test`
const fileName = `body-${suffix}.pdf`
const pdf = new Blob([marker], { type: 'application/pdf' })
const startedAt = new Date().toISOString()
const created = []
let ownerId
let neighborId
let ownerPath
let neighborPath
let measurementId
let stalePath
let confirmedPath

async function cleanup() {
  const paths = [ownerPath, neighborPath, stalePath, confirmedPath].filter(Boolean)
  if (paths.length) await admin.storage.from(BODY_REPORT_BUCKET).remove(paths).catch(() => undefined)
  await Promise.all(created.map((userId) => admin.auth.admin.deleteUser(userId).catch(() => undefined)))
}

try {
  step('Creating owner and neighbor identities')
  const owner = success(await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: signupMetadata(),
  }), 'Could not create the body-report owner')
  ownerId = owner.user.id
  created.push(ownerId)
  ownerPath = `${ownerId}/${fileName}`

  const neighbor = success(await admin.auth.admin.createUser({
    email: neighborEmail,
    password,
    email_confirm: true,
    user_metadata: signupMetadata(),
  }), 'Could not create the body-report neighbor')
  neighborId = neighbor.user.id
  created.push(neighborId)
  neighborPath = `${neighborId}/${fileName}`

  const ownerClient = client(apiUrl, anonKey)
  const neighborClient = client(apiUrl, anonKey)
  success(await ownerClient.auth.signInWithPassword({ email: ownerEmail, password }), 'Owner sign-in failed')
  success(await neighborClient.auth.signInWithPassword({ email: neighborEmail, password }), 'Neighbor sign-in failed')

  step('Uploading a private body report')
  const forbidden = await ownerClient.storage.from(BODY_REPORT_BUCKET).upload(
    `${ownerId}/forbidden-${suffix}.txt`,
    new Blob(['not a body report'], { type: 'text/plain' }),
    { contentType: 'text/plain', upsert: false },
  )
  assert(forbidden.error, 'Storage accepted a disallowed body-report MIME type.')

  success(await ownerClient.storage.from(BODY_REPORT_BUCKET).upload(ownerPath, pdf, {
    cacheControl: 'private, max-age=0',
    contentType: 'application/pdf',
    upsert: false,
  }), 'Owner could not upload a private body report')
  success(await neighborClient.storage.from(BODY_REPORT_BUCKET).upload(neighborPath, pdf, {
    cacheControl: 'private, max-age=0',
    contentType: 'application/pdf',
    upsert: false,
  }), 'Neighbor could not upload a private body report')

  const stolenUpload = await ownerClient.storage.from(BODY_REPORT_BUCKET).upload(
    neighborPath.replace(fileName, `stolen-${suffix}.pdf`),
    pdf,
    { contentType: 'application/pdf', upsert: false },
  )
  assert(stolenUpload.error, 'Owner uploaded into the neighbor prefix.')

  const measurement = success(await ownerClient.from('body_composition_measurements').insert({
    user_id: ownerId,
    report_object_path: ownerPath,
    source_type: 'pdf',
    extraction_status: 'pending',
    measured_at: new Date().toISOString(),
  }).select('id').single(), 'Owner could not record the pending measurement')
  measurementId = measurement.id

  step('Downloading the private body report')
  const downloaded = success(
    await ownerClient.storage.from(BODY_REPORT_BUCKET).download(ownerPath),
    'Owner could not download their private body report',
  )
  assert((await downloaded.text()).includes('Momentum private body-report proof'), 'Owner download returned the wrong file.')
  assertDenied(
    await neighborClient.storage.from(BODY_REPORT_BUCKET).download(ownerPath),
    'Neighbor downloaded the owner private body report.',
  )
  assertDenied(
    await anonymous.storage.from(BODY_REPORT_BUCKET).download(ownerPath),
    'Anonymous client downloaded a private body report.',
  )

  const signed = success(
    await ownerClient.storage.from(BODY_REPORT_BUCKET).createSignedUrl(ownerPath, BODY_REPORT_SIGNED_URL_SECONDS),
    'Owner could not create a private download link',
  )
  await assertDownloadable(signed.signedUrl, apiUrl, 'Owner signed URL')
  assertDenied(
    await neighborClient.storage.from(BODY_REPORT_BUCKET).createSignedUrl(ownerPath, BODY_REPORT_SIGNED_URL_SECONDS),
    'Neighbor created a signed URL for the owner object.',
  )

  const shortLived = success(
    await ownerClient.storage.from(BODY_REPORT_BUCKET).createSignedUrl(ownerPath, 1),
    'Owner could not create a one-second download link',
  )
  await new Promise((resolve) => setTimeout(resolve, 1_500))
  const expired = await fetch(rewriteLocalSignedUrl(shortLived.signedUrl, apiUrl))
  assert(!expired.ok, 'Expired signed URL still returned the private body report.')

  step('Deleting the private body report')
  await neighborClient.storage.from(BODY_REPORT_BUCKET).remove([ownerPath])
  assert(
    success(
      await admin.storage.from(BODY_REPORT_BUCKET).list(ownerId, { search: fileName }),
      'Could not list the owner prefix after the neighbor delete attempt',
    ).filter((item) => item.name === fileName).length === 1,
    'Neighbor deleted the owner private body report.',
  )
  success(
    await ownerClient.storage.from(BODY_REPORT_BUCKET).remove([ownerPath]),
    'Owner could not delete the private object',
  )
  const deletedRows = success(
    await ownerClient.from('body_composition_measurements').delete().eq('id', measurementId).eq('user_id', ownerId).select('id'),
    'Owner could not delete the measurement row',
  )
  assert(deletedRows.length === 1, 'Owned measurement row was not deleted.')
  const leftover = success(
    await admin.storage.from(BODY_REPORT_BUCKET).list(ownerId, { search: fileName }),
    'Could not list the owner prefix after deletion',
  ).filter((item) => item.name === fileName)
  assert(leftover.length === 0, 'Owner private object remained after deletion.')
  const neighborKept = success(
    await admin.storage.from(BODY_REPORT_BUCKET).list(neighborId, { search: fileName }),
    'Could not list the neighbor prefix',
  ).filter((item) => item.name === fileName)
  assert(neighborKept.length === 1, 'Neighbor private object was removed by the owner deletion.')

  let retention = 'hosted-skipped'
  if (!hosted) {
    step('Proving 30-day unconfirmed retention')
    stalePath = `${ownerId}/stale-${suffix}.pdf`
    confirmedPath = `${ownerId}/confirmed-${suffix}.pdf`
    success(await admin.storage.from(BODY_REPORT_BUCKET).upload(stalePath, pdf, {
      contentType: 'application/pdf',
    }), 'Could not upload the stale retention object')
    success(await admin.storage.from(BODY_REPORT_BUCKET).upload(confirmedPath, pdf, {
      contentType: 'application/pdf',
    }), 'Could not upload the confirmed retention object')
    psql(`
      insert into public.body_composition_measurements(
        user_id, measured_at, source_type, report_object_path, extraction_status, created_at
      ) values (
        '${ownerId}',
        statement_timestamp() - interval '40 days',
        'pdf',
        '${stalePath}',
        'pending',
        statement_timestamp() - interval '40 days'
      );
      insert into public.body_composition_measurements(
        user_id, measured_at, source_type, weight_kg, report_object_path,
        extraction_status, extraction_result, created_at
      ) values (
        '${ownerId}',
        statement_timestamp() - interval '40 days',
        'pdf',
        70,
        '${confirmedPath}',
        'confirmed',
        '{"source":"manual"}'::jsonb,
        statement_timestamp() - interval '40 days'
      );
    `)
    const purged = success(
      await admin.rpc('purge_expired_body_reports'),
      'Could not run body-report retention',
    )
    assert(purged.retention_days === BODY_REPORT_RETENTION_DAYS, 'Retention window drifted from 30 days.')
    assert(Array.isArray(purged.paths) && purged.paths.includes(stalePath), 'Retention did not return the stale object path.')
    assert(!purged.paths.includes(confirmedPath), 'Retention listed a confirmed body report.')
    if (purged.paths.length) {
      success(
        await admin.storage.from(BODY_REPORT_BUCKET).remove(purged.paths),
        'Could not remove expired body-report objects',
      )
    }
    const staleGone = success(
      await admin.storage.from(BODY_REPORT_BUCKET).list(ownerId, { search: path.basename(stalePath) }),
      'Could not list stale prefix',
    ).filter((item) => item.name === path.basename(stalePath))
    assert(staleGone.length === 0, 'Expired body-report object remained after retention.')
    const confirmedKept = success(
      await admin.from('body_composition_measurements').select('id').eq('user_id', ownerId).eq('report_object_path', confirmedPath),
      'Could not inspect confirmed retention',
    )
    assert(confirmedKept.length === 1, 'Confirmed body measurement was pruned by short retention.')
    retention = 'unconfirmed-30d-purged-confirmed-kept'
  }

  const evidence = {
    environment: hosted ? 'hosted' : 'local',
    projectRef: hosted ? HOSTED_PROJECT_REF : 'momentum',
    startedAt,
    finishedAt: new Date().toISOString(),
    bucket: BODY_REPORT_BUCKET,
    private: true,
    maxBytes: BODY_REPORT_MAX_BYTES,
    mimeTypes: BODY_REPORT_MIME_TYPES,
    signedUrlSeconds: BODY_REPORT_SIGNED_URL_SECONDS,
    upload: 'owner-only-prefix',
    download: 'owner-only-and-signed-url-expires',
    deletion: 'owner-object-and-row-removed-neighbor-preserved',
    retention,
  }
  const evidencePath = writeProof(
    `body-report-${hosted ? 'hosted' : 'local'}-${startedAt.replaceAll(':', '')}.json`,
    evidence,
    'privacy-proofs',
  )
  console.log(JSON.stringify({ bodyReport: 'passed', evidencePath, ...evidence }, null, 2))
} catch (error) {
  await cleanup()
  throw error
}

await cleanup()
