import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))
const playwrightCli = fileURLToPath(new URL('../../node_modules/.bin/playwright', import.meta.url))
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const status = spawnSync(supabaseCli, ['status', '-o', 'json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
if (status.status !== 0) throw new Error('Local Supabase is not running.')
const environment = JSON.parse(status.stdout.slice(status.stdout.indexOf('{')))

const testEnvironment = {
  ...process.env,
  AI_MASTER_ENABLED: 'true',
  AI_PLAN_ENABLED: 'true',
  AI_PLAN_PROVIDER: 'stub',
  PLAN_RATE_LIMIT: '30',
  CURRENT_TERMS_VERSION: '2026-08-01-alpha',
  CURRENT_PRIVACY_VERSION: '2026-08-01-alpha',
  CURRENT_HEALTH_CONSENT_VERSION: '2026-08-01-alpha',
  R3_AUTHENTICATED_E2E: '1',
  VITE_SUPABASE_URL: environment.API_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: environment.ANON_KEY,
  ...(existsSync(chromePath) ? { PLAYWRIGHT_CHROME_PATH: chromePath } : {}),
}

const functions = spawn(supabaseCli, [
  'functions', 'serve', '--env-file', 'supabase/functions.r3.env', '--no-verify-jwt',
], {
  cwd: root,
  env: testEnvironment,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timed out starting local Edge Functions.')), 30_000)
  const fallback = setTimeout(() => {
    clearTimeout(timeout)
    resolve()
  }, 5_000)
  const ready = (chunk) => {
    const output = String(chunk)
    if (!output.includes('Serving functions on')) return
    clearTimeout(timeout)
    clearTimeout(fallback)
    resolve()
  }
  functions.stdout.on('data', ready)
  functions.stderr.on('data', ready)
  functions.once('exit', (code) => {
    clearTimeout(timeout)
    clearTimeout(fallback)
    reject(new Error(`Local Edge Functions stopped before the proof (exit ${code}).`))
  })
})

let exitCode = 1
try {
  const proof = spawnSync(playwrightCli, [
    'test', 'e2e/r3-monthly-lifecycle.spec.ts',
    '--config=playwright.r3.config.ts',
    '--project=chromium', '--project=mobile-chromium', '--workers=1',
  ], {
    cwd: root,
    env: testEnvironment,
    stdio: 'inherit',
  })
  exitCode = proof.status ?? 1
} finally {
  if (functions.pid) {
    try {
      process.kill(-functions.pid, 'SIGTERM')
    } catch {
      functions.kill('SIGTERM')
    }
  }
}

process.exit(exitCode)
