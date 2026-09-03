import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assert,
  authClient,
  signupMetadata,
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

function docker(args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    }).trim()
  } catch {
    // Docker inspect and the environment contain local credentials.
    throw new Error(`Local Auth fixture Docker ${args[0]} failed.`)
  }
}

const environment = localEnvironment()
assert(new URL(environment.API_URL).hostname === '127.0.0.1', 'Signup abuse must target local Supabase.')
const admin = authClient(environment.API_URL, environment.SERVICE_ROLE_KEY)
const batch = randomUUID()
const fixtureName = `momentum-auth-abuse-${batch}`
const created = []
const password = `Abuse-${batch}-aA1!`
// Auth refills at sign_in_sign_ups per five minutes, but starts with 30 tokens.
// https://supabase.com/docs/guides/auth/rate-limits
const burstCapacity = 30
const maxAttempts = burstCapacity + 10
let rateLimitedAt = null
let fixtureStarted = false

try {
  const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8')
  const projectId = config.match(/^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m)?.[1]
  assert(projectId, 'Could not read the local Supabase project ID.')
  const [source] = JSON.parse(docker(['inspect', `supabase_auth_${projectId}`]))
  const network = Object.keys(source.NetworkSettings.Networks)[0]
  assert(network && source.State.Running, 'The local Auth container must be running.')

  // Supabase CLI leaves RATE_LIMIT_HEADER unset, disabling IP limiting locally.
  // Clone its Auth configuration into a disposable process with a fresh bucket.
  // Only this loopback fixture trusts the synthetic IP header; the normal gateway
  // and its Auth container are unchanged, so other proofs keep their own quota.
  const fixtureEnv = source.Config.Env.filter((entry) => !entry.startsWith('GOTRUE_RATE_LIMIT_HEADER='))
  fixtureEnv.push('GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For')
  // Node child-process stdin is a socket on Linux; Docker cannot reopen it as
  // /dev/stdin. Use a private temporary file and remove it immediately after use.
  const envDirectory = mkdtempSync(join(tmpdir(), 'momentum-auth-abuse-'))
  try {
    const envFile = join(envDirectory, 'auth.env')
    writeFileSync(envFile, `${fixtureEnv.join('\n')}\n`, { mode: 0o600 })
    docker([
      'run', '--detach', '--rm', '--name', fixtureName,
      '--network', network, '--publish', '127.0.0.1::9999',
      '--env-file', envFile, source.Config.Image,
    ])
    fixtureStarted = true
  } finally {
    rmSync(envDirectory, { recursive: true, force: true })
  }
  const address = docker(['port', fixtureName, '9999/tcp'])
  assert(/^127\.0\.0\.1:\d+$/.test(address), 'Auth fixture must bind only to loopback.')
  const fixtureUrl = `http://${address}`
  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      ready = (await fetch(`${fixtureUrl}/health`, { signal: AbortSignal.timeout(1_000) })).ok
    } catch { /* Wait for the isolated Auth process to start. */ }
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  assert(ready, 'The isolated Auth fixture did not become healthy.')

  async function signup(email, ip) {
    const response = await fetch(`${fixtureUrl}/signup`, {
      method: 'POST',
      headers: {
        apikey: environment.ANON_KEY,
        Authorization: `Bearer ${environment.ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ email, password, data: signupMetadata() }),
      signal: AbortSignal.timeout(25_000),
    })
    const data = await response.json()
    if (response.ok && data.id) created.push(data.id)
    return { response, data }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const email = `r1-abuse-${attempt}-${batch}@example.test`
    const { response, data } = await signup(email, '192.0.2.10')
    if (response.status === 429 && data.error_code === 'over_request_rate_limit') {
      rateLimitedAt = attempt
      break
    }
    assert(response.ok, `Signup abuse attempt ${attempt} failed: ${data.error_code ?? response.status}.`)
    assert(data.id && !data.access_token && !data.session, 'Signup abuse probe received a session before email verification.')
  }

  assert(rateLimitedAt, `Signup abuse did not rate-limit after ${maxAttempts} public signups.`)
  assert(rateLimitedAt > burstCapacity, 'The isolated signup bucket was not fresh.')
  const neighbor = await signup(`r1-abuse-neighbor-${batch}@example.test`, '192.0.2.11')
  assert(neighbor.response.ok && neighbor.data.id && !neighbor.data.access_token && !neighbor.data.session,
    'Signup throttling must leave a different IP able to create an unverified account.')

  const proof = writeProof(`auth-abuse-${new Date().toISOString().replaceAll(':', '')}.json`, {
    environment: 'local',
    control: 'sign_in_sign_ups',
    fixture: 'isolated-auth-with-ip-limiter',
    burstCapacity,
    rateLimitedAt,
    errorCode: 'over_request_rate_limit',
    otherIpAllowed: true,
    createdUsers: created.length,
    sessionGranted: false,
  })
  console.log(`Signup abuse proof passed: public signup rate-limited at attempt ${rateLimitedAt}. Evidence: ${proof}`)
} finally {
  try {
    const results = await Promise.all(created.map((userId) => admin.auth.admin.deleteUser(userId)))
    assert(results.every((result) => !result.error), 'Could not delete all signup abuse fixture users.')
  } finally {
    if (fixtureStarted) docker(['rm', '--force', fixtureName])
  }
}
