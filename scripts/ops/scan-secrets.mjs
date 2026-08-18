#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'coverage',
  'storybook-static',
  'dev-dist',
  'playwright-report',
  'test-results',
])

/**
 * Literal leak patterns for client code and built bundles.
 * `sk-` is matched as a secret prefix, not as a substring of CSS `mask-image`.
 */
export const FORBIDDEN_PATTERNS = [
  { id: 'service_role', regex: /service_role/g },
  { id: 'OPENAI_API_KEY=', regex: /OPENAI_API_KEY=/g },
  { id: 'sk-', regex: /(?:^|[^A-Za-z0-9_-])sk-[A-Za-z0-9]{8,}/g },
]

export function isExcludedSecretScanPath(filePath) {
  const normalized = filePath.split(path.sep).join('/')
  if (normalized.endsWith('.env.example')) return true
  if (normalized.includes('/supabase/.env.example')) return true
  return false
}

export function collectForbiddenMatches(rootDir) {
  if (!fs.existsSync(rootDir)) return []

  const matches = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()
    const stat = fs.statSync(current)
    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(path.basename(current))) continue
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry))
      }
      continue
    }
    if (!stat.isFile() || isExcludedSecretScanPath(current)) continue

    const text = fs.readFileSync(current, 'utf8')
    for (const { id, regex } of FORBIDDEN_PATTERNS) {
      regex.lastIndex = 0
      if (regex.test(text)) {
        matches.push({ file: current, pattern: id })
      }
    }
  }
  return matches
}

export function gitleaksInstalled() {
  const probe = spawnSync('gitleaks', ['version'], { encoding: 'utf8' })
  return probe.status === 0
}

function runGitleaks(repoRoot) {
  const result = spawnSync('gitleaks', ['detect', '--source', repoRoot, '--no-banner', '--verbose'], {
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status)
  }
}

function runNodeCheck(repoRoot) {
  const roots = [path.join(repoRoot, 'src')]
  const distDir = path.join(repoRoot, 'dist')
  if (fs.existsSync(distDir)) roots.push(distDir)

  const matches = roots.flatMap((root) => collectForbiddenMatches(root))
  if (matches.length === 0) {
    console.log(`Secret scan (node fallback): no ${FORBIDDEN_PATTERNS.map((item) => item.id).join(', ')} literals in src/${fs.existsSync(distDir) ? ' or dist/' : ''}.`)
    return
  }

  console.error('Secret scan failed. Client source/bundles contain forbidden literals:')
  for (const match of matches) {
    console.error(`  ${path.relative(repoRoot, match.file)}: ${match.pattern}`)
  }
  process.exit(1)
}

function isMain() {
  const entry = process.argv[1]
  return Boolean(entry) && import.meta.url === pathToFileURL(path.resolve(entry)).href
}

if (isMain()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  if (gitleaksInstalled()) {
    console.log('Secret scan: gitleaks is installed; running gitleaks detect.')
    runGitleaks(repoRoot)
  } else {
    console.log('Secret scan: gitleaks not installed; running node fallback on src/ and dist/.')
    runNodeCheck(repoRoot)
  }
}
