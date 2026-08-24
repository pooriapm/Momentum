#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const environment = JSON.parse(fs.readFileSync(path.join(root, 'supabase/environments.json'), 'utf8'))

const EXPECTED_FUNCTIONS = [
  'account-data',
  'account-settings',
  'checkins',
  'generate-monthly-plan',
  'geo-context',
]
const QUARANTINED_FUNCTIONS = [
  'analyze-body-composition',
  'coach',
  'generate-plan',
]

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function invocationRegexes(name) {
  const quoted = `['"\`]${escapeRegex(name)}['"\`]`
  return [
    new RegExp(`\\.functions\\.invoke\\(\\s*${quoted}`),
    new RegExp(`/functions/v1/${escapeRegex(name)}(?=[/"'?\\s]|$)`),
    new RegExp(`/functions/${escapeRegex(name)}(?=[/"'?\\s]|$)`),
  ]
}

const INVOCATION_PATTERNS = QUARANTINED_FUNCTIONS.map((name) => ({
  name,
  regexes: invocationRegexes(name),
}))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sorted(values) {
  return [...values].sort()
}

function sameNames(actual, expected, message) {
  const left = JSON.stringify(sorted(actual))
  const right = JSON.stringify(sorted(expected))
  assert(left === right, `${message} expected ${right}, got ${left}`)
}

function listFunctionDirs() {
  return fs.readdirSync(path.join(root, 'supabase/functions'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_shared' && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
}

function walkSourceFiles(dir) {
  const files = []
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  return files
}

function scanClientInvocations() {
  const srcRoot = path.join(root, 'src')
  const hits = []
  for (const file of walkSourceFiles(srcRoot)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
      for (const { name, regexes } of INVOCATION_PATTERNS) {
        if (regexes.some((regex) => regex.test(line))) {
          hits.push({
            name,
            file: path.relative(root, file),
            line: index + 1,
            excerpt: trimmed,
          })
        }
      }
    })
  }
  return hits
}

function extractJsonValue(text) {
  const arrayIndex = text.indexOf('[')
  const objectIndex = text.indexOf('{')
  const start = [arrayIndex, objectIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0]
  if (start === undefined) return null
  try {
    return JSON.parse(text.slice(start))
  } catch {
    return null
  }
}

function namesFromRemoteList(payload) {
  if (!payload) return []
  const rows = Array.isArray(payload) ? payload : payload.functions ?? payload.data ?? []
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (typeof row === 'string') return [row]
    if (row && typeof row === 'object') {
      const name = row.slug ?? row.name ?? row.id
      return typeof name === 'string' ? [name] : []
    }
    return []
  })
}

function namesFromTable(text) {
  const names = new Set()
  for (const line of text.split(/\r?\n/)) {
    for (const name of [...EXPECTED_FUNCTIONS, ...QUARANTINED_FUNCTIONS]) {
      if (new RegExp(`(?:^|[\\s|])${escapeRegex(name)}(?:[\\s|]|$)`).test(line)) {
        names.add(name)
      }
    }
  }
  return [...names]
}

function listRemoteFunctions(projectRef) {
  const result = spawnSync(
    'npx',
    ['supabase', 'functions', 'list', '--project-ref', projectRef, '-o', 'json'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 45_000,
      env: { ...process.env, npm_config_yes: 'true' },
    },
  )
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  if (result.status !== 0) {
    return { ok: false, reason: output.trim().split('\n').at(-1) || `exit ${result.status}` }
  }
  const parsed = extractJsonValue(result.stdout ?? '')
  const names = namesFromRemoteList(parsed)
  if (names.length > 0) return { ok: true, names }
  const tableNames = namesFromTable(output)
  if (tableNames.length > 0) return { ok: true, names: tableNames }
  return { ok: false, reason: 'functions list returned no parseable names' }
}

sameNames(environment.edge_functions ?? [], EXPECTED_FUNCTIONS, 'environments.json edge_functions drifted:')
sameNames(
  environment.quarantined_remote_functions ?? [],
  QUARANTINED_FUNCTIONS,
  'environments.json quarantined_remote_functions drifted:',
)
sameNames(listFunctionDirs(), EXPECTED_FUNCTIONS, 'supabase/functions directory surface drifted:')

const clientHits = scanClientInvocations()
if (clientHits.length > 0) {
  const details = clientHits
    .map((hit) => `  ${hit.file}:${hit.line} invokes ${hit.name} (${hit.excerpt})`)
    .join('\n')
  throw new Error(`Client still calls quarantined Edge Functions:\n${details}`)
}

console.log('Edge allowlist contract passed.')
console.log(`Live functions: ${sorted(EXPECTED_FUNCTIONS).join(', ')}`)
console.log(`Quarantined names: ${sorted(QUARANTINED_FUNCTIONS).join(', ')}`)
console.log('No client invocations of quarantined functions under src/.')

const projectRef = environment.production?.project_ref
if (!projectRef) {
  console.warn('Remote functions list skipped: production project_ref is missing.')
  process.exitCode = 0
  process.exit()
}

const remote = listRemoteFunctions(projectRef)
if (!remote.ok) {
  console.warn(`Remote functions list unavailable (${remote.reason}). Local unused check still stands.`)
  console.warn('Deletion remains an owner gate per supabase/R1-OPERATIONS.md; this script never deletes.')
  process.exitCode = 0
  process.exit()
}

const remoteNames = new Set(remote.names)
const leftover = QUARANTINED_FUNCTIONS.filter((name) => remoteNames.has(name))
const missingLive = EXPECTED_FUNCTIONS.filter((name) => !remoteNames.has(name))

if (leftover.length > 0) {
  console.warn(`WARNING: quarantined functions still exist remotely: ${leftover.join(', ')}`)
  console.warn('Do not delete them from this verifier. R1-OPERATIONS.md requires an approved production change, staging smoke, and remote metadata export first.')
} else {
  console.log('Remote list: none of the quarantined names are present.')
}

if (missingLive.length > 0) {
  console.warn(`WARNING: allowlisted live functions missing from remote list: ${missingLive.join(', ')}`)
}

console.warn('Deletion remains an owner gate; this script never deletes production functions.')
process.exitCode = 0
