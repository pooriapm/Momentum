#!/usr/bin/env node
// One staging build and deploy; never reuse the production frontend bundle.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const root = fileURLToPath(new URL('../../', import.meta.url))
const environments = JSON.parse(readFileSync(new URL('../../supabase/environments.json', import.meta.url), 'utf8'))
const { staging, production } = environments
assert.equal(staging.status, 'active', 'Staging must be provisioned first.')
assert(staging.project_ref && staging.project_ref !== production.project_ref, 'Staging needs its own database.')

const config = parseEnv(readFileSync(new URL('../../.env.staging.local', import.meta.url), 'utf8'))
assert.equal(config.VITE_SUPABASE_URL, staging.api_origin, 'Staging URL does not match its registered database.')
assert.equal(config.VITE_SUPABASE_URL, `https://${staging.project_ref}.supabase.co`)
assert(config.VITE_SUPABASE_PUBLISHABLE_KEY, 'Staging public API key is missing.')
assert.equal(config.VITE_APP_ENV, 'staging')
assert(Object.keys(config).every((key) => key.startsWith('VITE_')), 'Only public browser settings belong in .env.staging.local.')

const env = {
  ...process.env,
  ...config,
  VITE_APP_COMMIT_SHA: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
}
function run(command, args) {
  execFileSync(command, args, { cwd: root, env, stdio: 'inherit' })
}

run('npx', ['tsc', '-b'])
run('npx', ['vite', 'build', '--mode', 'staging', '--outDir', 'dist-staging'])
run('npx', ['wrangler', 'deploy', '--env', 'staging', '--config', 'wrangler.jsonc'])
console.log(`Staging updated: ${staging.web_origin}`)
