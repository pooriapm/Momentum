import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const bucket = 'body-composition'
const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it before the Storage RLS proof.')
  }

  const jsonStart = output.indexOf('{')
  if (jsonStart < 0) throw new Error('Could not read the local Supabase environment.')
  const environment = JSON.parse(output.slice(jsonStart))
  if (!environment.API_URL || !environment.ANON_KEY || !environment.SERVICE_ROLE_KEY) {
    throw new Error('Local Supabase did not expose the required test credentials.')
  }
  return environment
}

function client(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertSuccess(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`)
  return result.data
}

async function createVerifiedUser(admin, email, password, locale, countryCode) {
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { locale, country_code: countryCode },
  })
  const user = assertSuccess(result, `Could not create ${email}`)?.user
  assert(user, `Supabase did not return ${email}`)
  return user
}

async function signedInClient(url, anonKey, email, password) {
  const signedIn = client(url, anonKey)
  assertSuccess(
    await signedIn.auth.signInWithPassword({ email, password }),
    `Could not sign in ${email}`,
  )
  return signedIn
}

async function matchingObjects(storageClient, prefix, fileName) {
  const data = assertSuccess(
    await storageClient.storage.from(bucket).list(prefix, { limit: 20, search: fileName }),
    `Could not list ${prefix}`,
  )
  return data.filter((object) => object.name === fileName)
}

const environment = localEnvironment()
const admin = client(environment.API_URL, environment.SERVICE_ROLE_KEY)
const anonymous = client(environment.API_URL, environment.ANON_KEY)
const suffix = randomUUID()
const password = `R1-${randomUUID()}-aA1!`
const emailA = `r1-storage-a-${suffix}@example.test`
const emailB = `r1-storage-b-${suffix}@example.test`
const fileName = `rls-${suffix}.pdf`
const body = new Blob(['%PDF-1.4\n% Momentum R1 Storage RLS proof\n'], {
  type: 'application/pdf',
})

let userA
let userB
let pathA
let pathB

try {
  userA = await createVerifiedUser(admin, emailA, password, 'en-US', 'US')
  userB = await createVerifiedUser(admin, emailB, password, 'fa-IR', 'IR')
  pathA = `${userA.id}/${fileName}`
  pathB = `${userB.id}/${fileName}`

  const clientA = await signedInClient(environment.API_URL, environment.ANON_KEY, emailA, password)
  const clientB = await signedInClient(environment.API_URL, environment.ANON_KEY, emailB, password)

  assertSuccess(
    await clientA.storage.from(bucket).upload(pathA, body, { contentType: body.type }),
    'User A could not upload to their own prefix',
  )

  const crossPrefixUpload = await clientA.storage
    .from(bucket)
    .upload(pathB, body, { contentType: body.type })
  assert(crossPrefixUpload.error, 'User A unexpectedly uploaded to user B prefix')

  assert(
    (await matchingObjects(clientA, userA.id, fileName)).length === 1,
    'User A cannot see their own uploaded object',
  )
  assert(
    (await matchingObjects(clientB, userA.id, fileName)).length === 0,
    'User B can list user A private object',
  )
  assert(
    (await matchingObjects(anonymous, userA.id, fileName)).length === 0,
    'Anonymous clients can list a private object',
  )

  await clientB.storage.from(bucket).remove([pathA])
  assert(
    (await matchingObjects(clientA, userA.id, fileName)).length === 1,
    'User B deleted user A private object',
  )

  assertSuccess(
    await clientA.storage.from(bucket).remove([pathA]),
    'User A could not delete their own private object',
  )
  assert(
    (await matchingObjects(clientA, userA.id, fileName)).length === 0,
    'User A private object remained after deletion',
  )

  assertSuccess(
    await admin.storage.from(bucket).upload(pathA, body, { contentType: body.type }),
    'Service role could not upload to user A prefix',
  )
  assertSuccess(
    await admin.storage.from(bucket).upload(pathB, body, { contentType: body.type }),
    'Service role could not upload to user B prefix',
  )
  assertSuccess(
    await admin.storage.from(bucket).remove([pathA, pathB]),
    'Service role could not delete objects across user prefixes',
  )
  assert(
    (await matchingObjects(admin, userA.id, fileName)).length === 0 &&
      (await matchingObjects(admin, userB.id, fileName)).length === 0,
    'Service-role cleanup left private objects behind',
  )

  console.log('Storage RLS proof passed: owner, cross-user, anonymous, service-role, and deletion checks.')
} finally {
  if (pathA || pathB) {
    await admin.storage.from(bucket).remove([pathA, pathB].filter(Boolean))
  }
  if (userA) await admin.auth.admin.deleteUser(userA.id)
  if (userB) await admin.auth.admin.deleteUser(userB.id)
}
