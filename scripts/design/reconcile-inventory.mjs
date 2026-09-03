#!/usr/bin/env node
/**
 * Reconcile the canonical 137 product-state inventory against Storybook evidence.
 * Stale "132" counts are never treated as the reopen baseline.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)

// coverage.ts is TypeScript; mirror the contract here for Node without a TS loader.
const canonicalFamilies = {
  AUTH: 18,
  EXEC: 10,
  LIFE: 24,
  ME: 9,
  ONB: 29,
  PLAN: 14,
  PROG: 7,
  PUB: 14,
  TODAY: 12,
}

const expectedTotal = Object.values(canonicalFamilies).reduce((sum, count) => sum + count, 0)
if (expectedTotal !== 137) {
  throw new Error(`Canonical family math drifted: ${expectedTotal} (expected 137)`)
}

const storyRoots = [
  path.join(root, 'src/stories'),
  path.join(root, 'src/v2'),
]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.stories\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

const storyFiles = storyRoots.flatMap((dir) => walk(dir))
const evidenced = new Set()
const stateIdPattern = /\b((?:AUTH|EXEC|LIFE|ME|ONB|PLAN|PROG|PUB|TODAY)-\d{2})\b/g

for (const file of storyFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(stateIdPattern)) evidenced.add(match[1])
}

const allIds = Object.entries(canonicalFamilies).flatMap(([family, count]) => (
  Array.from({ length: count }, (_, index) => `${family}-${String(index + 1).padStart(2, '0')}`)
))
const missing = allIds.filter((id) => !evidenced.has(id))
const stale132Mentions = storyFiles.filter((file) => {
  const text = fs.readFileSync(file, 'utf8')
  return /\b132\b/.test(text) && !file.endsWith('CoverageReport.stories.tsx')
})

const payload = {
  canonicalTotal: expectedTotal,
  storyFiles: storyFiles.length,
  evidencedCount: evidenced.size,
  missingCount: missing.length,
  missingSample: missing.slice(0, 20),
  staleNonCoverage132Files: stale132Mentions.map((file) => path.relative(root, file)),
  note: 'Missing IDs may be covered by inventory attributes outside Storybook parameters; treat as audit queue, not automatic redesign.',
}

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'artifacts/inventory-reconcile.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
)
console.log(JSON.stringify(payload, null, 2))

if (expectedTotal !== 137) process.exit(1)
void require
