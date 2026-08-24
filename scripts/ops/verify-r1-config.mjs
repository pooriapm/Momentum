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
assert(environment.staging.status === 'not_provisioned', 'Review staging identity/status change.')
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

const config = read('supabase/config.toml')
assert(config.includes(`site_url = "${expectedOrigin}"`), 'Production Auth site URL is missing.')
assert(config.includes(`"${expectedOrigin}/**"`), 'Production auth redirect is missing.')
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

console.log('R1 configuration contract passed (staging intentionally recorded as not provisioned).')
process.exitCode = 0
