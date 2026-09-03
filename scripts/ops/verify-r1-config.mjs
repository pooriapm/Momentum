import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const environment = JSON.parse(read('supabase/environments.json'))
const expectedRef = 'osyvvzglvyonevkhdzpu'
const expectedOrigin = 'https://momentum.pooria-pm.workers.dev'
const expectedFunctions = [
  'account-data',
  'account-settings',
  'checkins',
  'generate-monthly-plan',
  'geo-context',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(environment.production.project_ref === expectedRef, 'Production project ref drifted.')
assert(environment.production.web_origin === expectedOrigin, 'Production web origin drifted.')
if (environment.staging.status === 'not_provisioned') {
  assert(environment.staging.project_ref == null, 'Unprovisioned staging must not set project_ref.')
  assert(environment.staging.api_origin == null, 'Unprovisioned staging must not set api_origin.')
} else if (environment.staging.status === 'active') {
  assert(typeof environment.staging.project_ref === 'string' && environment.staging.project_ref.length >= 8, 'Active staging requires project_ref.')
  assert(typeof environment.staging.api_origin === 'string' && environment.staging.api_origin.startsWith('https://'), 'Active staging requires api_origin.')
  assert(typeof environment.staging.web_origin === 'string' && environment.staging.web_origin.startsWith('https://'), 'Active staging requires web_origin.')
} else {
  throw new Error(`Unknown staging status: ${environment.staging.status}`)
}
assert(environment.promotion?.same_sha_required === true, 'Promotion must require the same commit SHA.')
assert(JSON.stringify(environment.edge_functions) === JSON.stringify(expectedFunctions), 'Edge allowlist drifted.')

const functionDirs = fs.readdirSync(path.join(root, 'supabase/functions'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort()
assert(JSON.stringify(functionDirs) === JSON.stringify(expectedFunctions), 'Local Edge function surface drifted.')

const linkedRefPath = path.join(root, 'supabase/.temp/project-ref')
if (fs.existsSync(linkedRefPath)) {
  assert(fs.readFileSync(linkedRefPath, 'utf8').trim() === expectedRef, 'Supabase link targets the wrong project.')
}

function tomlSection(source, header) {
  const marker = `[${header}]`
  const start = source.indexOf(marker)
  assert(start >= 0, `Missing [${header}].`)
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n\[/)
  return (next < 0 ? rest : rest.slice(0, next)).trim()
}

function requireLine(section, line, message) {
  const found = section.split('\n').some((row) => row.trim() === line)
  assert(found, message)
}

function requireAuthHardening(section, label) {
  requireLine(section, 'enable_confirmations = true', `${label} must keep email confirmations required.`)
  assert(!section.includes('enable_confirmations = false'), `${label} must not disable email confirmations.`)
  requireLine(section, 'double_confirm_changes = true', `${label} must double-confirm email changes.`)
  requireLine(section, 'secure_password_change = true', `${label} must require a recent login to change passwords.`)
  requireLine(section, 'otp_length = 8', `${label} OTP length drifted.`)
  requireLine(section, 'otp_expiry = 3600', `${label} OTP expiry drifted.`)
}

function requireRateLimits(section, label) {
  requireLine(section, 'email_sent = 30', `${label} email_sent rate limit is missing.`)
  requireLine(section, 'sign_in_sign_ups = 15', `${label} sign_in_sign_ups rate limit is missing.`)
  requireLine(section, 'token_verifications = 15', `${label} token_verifications rate limit is missing.`)
  requireLine(section, 'token_refresh = 150', `${label} token_refresh rate limit is missing.`)
}

const config = read('supabase/config.toml')
assert(config.includes(`site_url = "${expectedOrigin}"`), 'Production Auth site URL is missing.')
assert(config.includes(`"${expectedOrigin}/**"`), 'Production auth redirect is missing.')
assert(config.includes(`[remotes.production]`), 'Production remote configuration is missing.')
assert(config.includes(`project_id = "${expectedRef}"`), 'Production remote project ref drifted.')
assert(config.includes('[remotes.production.auth.mfa.totp]'), 'Production TOTP controls are missing.')
assert(config.includes('[remotes.production.storage.vector]'), 'Free-tier vector override is missing.')

const localAuth = tomlSection(config, 'auth')
const localEmail = tomlSection(config, 'auth.email')
const localRateLimit = tomlSection(config, 'auth.rate_limit')
const productionAuth = tomlSection(config, 'remotes.production.auth')
const productionEmail = tomlSection(config, 'remotes.production.auth.email')
const productionRateLimit = tomlSection(config, 'remotes.production.auth.rate_limit')

requireLine(localAuth, 'minimum_password_length = 8', 'Local minimum password length drifted.')
requireLine(productionAuth, 'minimum_password_length = 8', 'Production minimum password length drifted.')
requireAuthHardening(localEmail, 'Local auth.email')
requireAuthHardening(productionEmail, 'Production auth.email')
requireLine(localEmail, 'max_frequency = "1s"', 'Local confirmation/recovery email spacing drifted.')
requireLine(productionEmail, 'max_frequency = "1m"', 'Production confirmation/recovery email spacing drifted.')
requireRateLimits(localRateLimit, 'Local auth.rate_limit')
requireRateLimits(productionRateLimit, 'Production auth.rate_limit')
const envExample = read('supabase/.env.example')
for (const line of [
  'AI_MASTER_ENABLED=false',
  'AI_PLAN_ENABLED=false',
  'AI_PLAN_PROVIDER=stub',
  'AI_PLAN_LIVE_OPENAI=false',
  'AI_COACH_ENABLED=false',
  'AI_BODY_COMPOSITION_ENABLED=false',
]) {
  assert(envExample.includes(line), `Fail-closed default missing: ${line}`)
}
assert(!envExample.includes('ALLOWED_ORIGINS=*'), 'Wildcard CORS is forbidden.')

console.log(`R1 configuration contract passed (staging status: ${environment.staging.status}).`)
process.exitCode = 0
