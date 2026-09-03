#!/usr/bin/env node
/**
 * Same-SHA frontend promotion helper.
 * Never deploys an artifact built for a different commit than the gate SHA.
 * Staging remains blocked until environments.json staging.status === 'active'.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const environments = JSON.parse(fs.readFileSync(path.join(root, 'supabase/environments.json'), 'utf8'))

const target = process.argv.includes('--production') ? 'production' : 'staging'
const sha = (process.env.VITE_APP_COMMIT_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase()
const artifactDir = process.env.MOMENTUM_DIST_DIR || path.join(root, 'dist')

assert(/^[a-f0-9]{40}$/.test(sha), 'Promotion requires the exact 40-char commit SHA in VITE_APP_COMMIT_SHA or GITHUB_SHA.')
assert(fs.existsSync(artifactDir), `Artifact directory missing: ${artifactDir}`)

if (target === 'staging' && environments.staging.status !== 'active') {
  console.log(JSON.stringify({
    promoted: false,
    target: 'staging',
    sha,
    blockedReason: environments.promotion?.blocked_reason || 'staging_not_provisioned',
    stagingStatus: environments.staging.status,
  }, null, 2))
  process.exit(2)
}

const releasePath = path.join(artifactDir, 'release.json')
if (fs.existsSync(releasePath)) {
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'))
  const releaseCommit = String(release.commit || '').toLowerCase()
  assert.equal(releaseCommit, sha, `Artifact commit ${releaseCommit} does not match gate SHA ${sha}.`)
}

if (target === 'staging') {
  const result = spawnSync(
    'npx',
    ['wrangler', 'deploy', '--env', 'staging', '--config', 'wrangler.jsonc'],
    { cwd: root, stdio: 'inherit', env: process.env },
  )
  process.exit(result.status ?? 1)
}

const result = spawnSync(
  'npx',
  ['wrangler', 'deploy', '--config', 'wrangler.jsonc'],
  { cwd: root, stdio: 'inherit', env: process.env },
)
process.exit(result.status ?? 1)
