import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  assert,
  authClient,
  isRateLimitedError,
  signupAnonymous,
  writeProof,
} from './auth-proof-lib.mjs'

const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it before the signup-abuse proof.')
  }
  const jsonStart = output.indexOf('{')
  if (jsonStart < 0) throw new Error('Could not read the local Supabase environment.')
  const environment = JSON.parse(output.slice(jsonStart))
  for (const key of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
    if (!environment[key]) throw new Error(`Local Supabase did not expose ${key}.`)
  }
  return environment
}

const environment = localEnvironment()
const anonymous = authClient(environment.API_URL, environment.ANON_KEY)
const admin = authClient(environment.API_URL, environment.SERVICE_ROLE_KEY)
const batch = randomUUID()
const created = []
const password = `Abuse-${batch}-aA1!`
const maxAttempts = 20
let rateLimitedAt = null

try {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const email = `r1-abuse-${attempt}-${batch}@example.test`
    const result = await signupAnonymous(anonymous, {
      email,
      password,
      redirectTo: 'http://localhost:5173/en/auth/verify',
    })
    if (isRateLimitedError(result.error)) {
      rateLimitedAt = attempt
      break
    }
    if (result.error) throw new Error(`Signup abuse attempt ${attempt} failed: ${result.error.message}`)
    assert(result.data?.user && !result.data.session, 'Signup abuse probe received a session before email verification.')
    created.push(result.data.user.id)
  }

  assert(rateLimitedAt, `Signup abuse did not rate-limit after ${maxAttempts} public signups.`)
  assert(rateLimitedAt > 1, 'Signup rate limit fired on the first request; the control may already be exhausted.')

  const proof = writeProof(`auth-abuse-${new Date().toISOString().replaceAll(':', '')}.json`, {
    environment: 'local',
    control: 'sign_in_sign_ups',
    rateLimitedAt,
    createdUsers: created.length,
    sessionGranted: false,
  })
  console.log(`Signup abuse proof passed: public signup rate-limited at attempt ${rateLimitedAt}. Evidence: ${proof}`)
} finally {
  await Promise.all(created.map((userId) => admin.auth.admin.deleteUser(userId)))
}
