import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(import.meta.dirname ?? process.cwd(), import.meta.dirname ? '../..' : '.')
const supabaseCli = path.join(root, 'node_modules/.bin/supabase')
export const HOSTED_PROJECT_REF = 'osyvvzglvyonevkhdzpu'
export const HOSTED_API_URL = `https://${HOSTED_PROJECT_REF}.supabase.co`
export const HOSTED_REDIRECT = 'https://momentum.pooria-pm.workers.dev/en/auth/verify'

export function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function authClient(url, key, timeoutMs = 25_000) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) }),
    },
  })
}

export async function readHostedAuthSettings(url, anonKey) {
  const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Hosted Auth settings returned ${response.status}.`)
  return response.json()
}

export function loadNamedEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1).trim()
  }
  return env
}

export function isRateLimitedError(error) {
  if (!error) return false
  const status = Number(error.status ?? error.statusCode ?? 0)
  const code = String(error.code ?? '').toLowerCase()
  const message = String(error.message ?? error.msg ?? '').toLowerCase()
  return status === 429 || code.includes('rate_limit') || message.includes('rate limit')
}

export function isUnverifiedError(error) {
  if (!error) return false
  const code = String(error.code ?? '').toLowerCase()
  const message = String(error.message ?? error.msg ?? '').toLowerCase()
  return code === 'email_not_confirmed' || message.includes('email not confirmed')
}

export function hashedTokenFromGenerateLink(data, expectedType) {
  const properties = data?.properties ?? data ?? {}
  const hashed = typeof properties.hashed_token === 'string' ? properties.hashed_token : ''
  if (hashed) return hashed

  const link = typeof properties.action_link === 'string' ? properties.action_link : ''
  if (!link) return ''
  try {
    const url = new URL(link)
    const type = url.searchParams.get('type')
    const token = url.searchParams.get('token') || url.searchParams.get('token_hash')
    if (token && (!expectedType || type === expectedType || !type)) return token
  } catch {
    return ''
  }
  return ''
}

export function emailOtpFromGenerateLink(data) {
  const properties = data?.properties ?? data ?? {}
  return typeof properties.email_otp === 'string' ? properties.email_otp : ''
}

export async function verifyGeneratedLink(client, { type, email, data }) {
  const hashed = hashedTokenFromGenerateLink(data, type)
  if (hashed) {
    const hashedAttempt = await client.auth.verifyOtp({ type, token_hash: hashed })
    if (!hashedAttempt.error) return hashedAttempt
  }
  const otp = emailOtpFromGenerateLink(data)
  if (otp && email) {
    return client.auth.verifyOtp({ type, email, token: otp })
  }
  return { data: { user: null, session: null }, error: { message: 'generateLink did not return a usable verification token.' } }
}

function parseApiKeyRows(raw) {
  const jsonStart = raw.indexOf('[')
  const jsonObjectStart = raw.indexOf('{')
  const start = jsonStart >= 0 && (jsonObjectStart < 0 || jsonStart <= jsonObjectStart)
    ? jsonStart
    : jsonObjectStart
  if (start < 0) return []
  const parsed = JSON.parse(raw.slice(start))
  return Array.isArray(parsed) ? parsed : [parsed]
}

function keyValue(row) {
  return String(row?.api_key ?? row?.apiKey ?? row?.secret ?? row?.key ?? '')
}

function keyName(row) {
  return String(row?.name ?? row?.id ?? '').toLowerCase()
}

export function selectApiKeys(rows) {
  const anon = rows.find((row) => keyName(row) === 'anon' || keyName(row) === 'publishable')
  const service = rows.find((row) => keyName(row) === 'service_role' || keyName(row) === 'secret')
  return {
    anon: keyValue(anon),
    serviceRole: keyValue(service),
  }
}

export function resolveHostedAuthTarget(env = process.env) {
  const fileEnv = {
    ...loadNamedEnv(path.join(root, '.env.local')),
    ...loadNamedEnv(path.join(root, 'supabase/.env')),
  }
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || fileEnv.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || HOSTED_API_URL).trim()
  const anon = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || fileEnv.SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
  const serviceRole = (env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return { url, anon, serviceRole }
}

export function assertHostedAuthUrl(url) {
  assert(url === HOSTED_API_URL || url.startsWith(`${HOSTED_API_URL}/`), 'Hosted Auth proof must target the production project ref.')
}

export function readHostedApiKeysFromCli(projectRef = HOSTED_PROJECT_REF) {
  const output = execFileSync(supabaseCli, ['projects', 'api-keys', '--project-ref', projectRef, '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20_000,
    killSignal: 'SIGKILL',
  })
  return selectApiKeys(parseApiKeyRows(output))
}

export function disposableProofEmail(prefix, suffix) {
  return `${prefix}-${suffix}@pooria-pm.workers.dev`
}

export function signupMetadata() {
  return {
    locale: 'en-US',
    country_code: 'US',
    product_region: 'intl',
    product_region_source: 'ip_at_signup',
  }
}

export async function signupAnonymous(anonymous, { email, password, redirectTo }) {
  return anonymous.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: signupMetadata(),
    },
  })
}

export function writeProof(fileName, payload, folder = 'auth-proofs') {
  const directory = path.join(root, 'artifacts', folder)
  fs.mkdirSync(directory, { recursive: true })
  const filePath = path.join(directory, fileName)
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`)
  return path.relative(root, filePath)
}
