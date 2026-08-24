import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it before the auth lifecycle proof.')
  }
  const jsonStart = output.indexOf('{')
  if (jsonStart < 0) throw new Error('Could not read the local Supabase environment.')
  const environment = JSON.parse(output.slice(jsonStart))
  for (const key of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY', 'MAILPIT_URL']) {
    if (!environment[key]) throw new Error(`Local Supabase did not expose ${key}.`)
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

function stringValues(value, output = []) {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => stringValues(item, output))
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => stringValues(item, output))
  }
  return output
}

function messageRecipients(message) {
  return stringValues(message.To ?? message.to ?? []).join(' ').toLowerCase()
}

async function waitForMessage(mailpitUrl, email, excludedIds = new Set()) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`)
    assert(response.ok, 'Could not read local auth mail.')
    const payload = await response.json()
    const messages = Array.isArray(payload.messages) ? payload.messages : []
    const match = messages.find((message) => {
      const id = message.ID ?? message.Id ?? message.id
      return id && !excludedIds.has(id) && messageRecipients(message).includes(email.toLowerCase())
    })
    if (match) return match.ID ?? match.Id ?? match.id
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for auth email to ${email}.`)
}

async function authTokenFromMessage(mailpitUrl, messageId, expectedType) {
  const response = await fetch(`${mailpitUrl}/api/v1/message/${messageId}`)
  assert(response.ok, 'Could not read the local auth email body.')
  const payload = await response.json()
  const candidates = stringValues(payload)
    .flatMap((value) => value.match(/https?:\/\/[^\s"'<>]+/g) ?? [])
    .map((value) => value.replaceAll('&amp;', '&').replace(/[).,]+$/, ''))

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      const type = url.searchParams.get('type')
      const token = url.searchParams.get('token')
      if (type === expectedType && token) return token
    } catch {
      // Ignore non-URL fragments from the rendered email.
    }
  }
  throw new Error(`The ${expectedType} email did not contain a verification token.`)
}

const environment = localEnvironment()
const anonymous = client(environment.API_URL, environment.ANON_KEY)
const admin = client(environment.API_URL, environment.SERVICE_ROLE_KEY)
const suffix = randomUUID()
const email = `r1-auth-${suffix}@example.test`
const originalPassword = `R1-Original-${randomUUID()}-aA1!`
const updatedPassword = `R1-Updated-${randomUUID()}-bB2!`
const seenMessages = new Set()
let userId
let deleted = false

try {
  await fetch(`${environment.MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' }).catch(() => undefined)

  const signup = assertSuccess(
    await anonymous.auth.signUp({
      email,
      password: originalPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/en/auth/verify',
        data: {
          locale: 'en-US',
          country_code: 'US',
          product_region: 'intl',
          product_region_source: 'ip_at_signup',
        },
      },
    }),
    'Signup failed',
  )
  assert(signup.user && !signup.session, 'Signup bypassed required email verification.')
  userId = signup.user.id

  const initialMessage = await waitForMessage(environment.MAILPIT_URL, email, seenMessages)
  seenMessages.add(initialMessage)
  await new Promise((resolve) => setTimeout(resolve, 1_100))
  assertSuccess(
    await anonymous.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'http://localhost:5173/en/auth/verify' },
    }),
    'Signup confirmation resend failed',
  )
  const resentMessage = await waitForMessage(environment.MAILPIT_URL, email, seenMessages)
  seenMessages.add(resentMessage)
  const signupToken = await authTokenFromMessage(environment.MAILPIT_URL, resentMessage, 'signup')
  const verifiedClient = client(environment.API_URL, environment.ANON_KEY)
  const verified = assertSuccess(
    await verifiedClient.auth.verifyOtp({ type: 'signup', token_hash: signupToken }),
    'Email verification failed',
  )
  assert(verified.session?.user.id === userId, 'Email verification returned the wrong account.')

  const firstSession = verified.session
  assertSuccess(
    await verifiedClient.auth.signOut({ scope: 'global' }),
    'Global sign-out failed',
  )
  const revokedRefresh = await client(environment.API_URL, environment.ANON_KEY)
    .auth.refreshSession({ refresh_token: firstSession.refresh_token })
  assert(revokedRefresh.error, 'A globally signed-out refresh token remained valid.')

  const signedIn = client(environment.API_URL, environment.ANON_KEY)
  assertSuccess(
    await signedIn.auth.signInWithPassword({ email, password: originalPassword }),
    'Verified user could not sign in',
  )
  assertSuccess(
    await signedIn.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/en/auth/update-password',
    }),
    'Password recovery request failed',
  )
  const recoveryMessage = await waitForMessage(environment.MAILPIT_URL, email, seenMessages)
  seenMessages.add(recoveryMessage)
  const recoveryToken = await authTokenFromMessage(environment.MAILPIT_URL, recoveryMessage, 'recovery')
  const recoveryClient = client(environment.API_URL, environment.ANON_KEY)
  assertSuccess(
    await recoveryClient.auth.verifyOtp({ type: 'recovery', token_hash: recoveryToken }),
    'Recovery token verification failed',
  )
  assertSuccess(
    await recoveryClient.auth.updateUser({ password: updatedPassword }),
    'Password update failed',
  )
  assertSuccess(await recoveryClient.auth.signOut({ scope: 'global' }), 'Recovery sign-out failed')

  const deletionClient = client(environment.API_URL, environment.ANON_KEY)
  assertSuccess(
    await deletionClient.auth.signInWithPassword({ email, password: updatedPassword }),
    'Updated password could not sign in',
  )
  const deletion = await deletionClient.functions.invoke('account-data', {
    body: { action: 'delete-account', confirmation: 'DELETE' },
    headers: {
      'Idempotency-Key': `delete:${suffix}`,
      'X-Request-ID': `auth-delete:${suffix}`,
    },
  })
  assertSuccess(deletion, 'Account deletion failed')
  assert(deletion.data?.deleted === true, 'Account deletion did not return a completed result.')
  deleted = true

  const deletedLookup = await admin.auth.admin.getUserById(userId)
  assert(deletedLookup.error || !deletedLookup.data?.user, 'Deleted auth identity still exists.')
  const deletedProfile = assertSuccess(
    await admin.from('profiles').select('user_id').eq('user_id', userId),
    'Could not verify deleted profile cleanup',
  )
  assert(deletedProfile.length === 0, 'Deleted account still has a profile row.')

  console.log(
    'Auth lifecycle proof passed: signup, resend, verification, recovery, password update, global revocation, sign-out, and deletion.',
  )
} finally {
  if (userId && !deleted) await admin.auth.admin.deleteUser(userId)
}
