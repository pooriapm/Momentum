import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(import.meta.dirname, '../..')
const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))
const expectedRef = 'osyvvzglvyonevkhdzpu'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function readLinkedRef() {
  const linkedRefPath = path.join(root, 'supabase/.temp/project-ref')
  if (!fs.existsSync(linkedRefPath)) return null
  return fs.readFileSync(linkedRefPath, 'utf8').trim()
}

function redact(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+/g, '[redacted-jwt]')
    .replace(/sbp_[A-Za-z0-9]+/g, '[redacted-token]')
    .replace(/sb_secret_[A-Za-z0-9]+/g, '[redacted-secret]')
    .replace(/postgres:\/\/[^\s'"]+/g, '[redacted-db-url]')
    .replace(/(pass(?:word)?|secret|token|key|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
}

function runCli(args) {
  try {
    const output = execFileSync(supabaseCli, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })
    return { ok: true, stdout: output, stderr: '' }
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr : ''
    const stdout = typeof error?.stdout === 'string' ? error.stdout : ''
    return { ok: false, stdout, stderr }
  }
}

function combined(result) {
  return `${result.stdout}\n${result.stderr}`
}

function parseJsonBlob(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function classifyHostname(result) {
  const text = combined(result).toLowerCase()
  const payload = parseJsonBlob(combined(result))
  const code = String(payload?.error?.code ?? '').toLowerCase()
  if (code === 'entitlement_required' || text.includes('custom domain add-on') || text.includes('requires the pro')) {
    return 'unavailable_on_plan'
  }
  if (!result.ok) {
    if (text.includes('not logged in') || text.includes('access token') || text.includes('unauthorized')) {
      return 'unknown'
    }
    if (text.includes('not found') || text.includes('no custom hostname') || text.includes('does not exist')) {
      return 'none'
    }
    return 'unknown'
  }
  const status = String(payload?.status ?? payload?.custom_hostname_status ?? payload?.state ?? '').toLowerCase()
  if (status.includes('active') || status.includes('success') || status.includes('verified')) return 'verified'
  if (payload?.custom_hostname || payload?.hostname || payload?.vanity_subdomain || payload?.subdomain) {
    return status.includes('pending') ? 'pending' : 'pending'
  }
  if (status) return 'pending'
  return 'none'
}

const linkedRef = readLinkedRef()
if (linkedRef) {
  assert(linkedRef === expectedRef, 'Supabase link targets the wrong project.')
}

const domainResult = runCli(['domains', 'get', '--project-ref', expectedRef, '-o', 'json'])
const vanityResult = runCli([
  '--experimental',
  'vanity-subdomains',
  'get',
  '--project-ref',
  expectedRef,
  '-o',
  'json',
])

const customDomain = classifyHostname(domainResult)
const vanitySubdomain = classifyHostname(vanityResult)

for (const sample of [combined(domainResult), combined(vanityResult)]) {
  const cleaned = redact(sample)
  assert(!/eyJ[A-Za-z0-9_-]{10,}\./.test(cleaned), 'Hosting inspect leaked a JWT.')
  assert(!/sbp_[A-Za-z0-9]+/.test(cleaned), 'Hosting inspect leaked a personal token.')
  assert(!/sb_secret_/.test(cleaned), 'Hosting inspect leaked a secret.')
}

console.log(
  JSON.stringify({
    project_ref: expectedRef,
    linked_ref: linkedRef ?? 'unlinked',
    custom_domain: customDomain,
    vanity_subdomain: vanitySubdomain,
    smtp: 'unknown',
    smtp_reason: 'No secret-free CLI command exposes hosted Auth SMTP; do not treat this as verified.',
    note: 'config.toml hardening is local/declarative until an owner runs supabase config push.',
  }),
)
process.exitCode = 0
