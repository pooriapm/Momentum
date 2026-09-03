import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '../..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const MANAGEMENT = 'https://api.supabase.com/v1'
const requireLive = process.argv.includes('--require-live')

const contract = JSON.parse(read('ops/contract.json'))
const environments = JSON.parse(read('supabase/environments.json'))
const projectRef = contract.backup.projectRef

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(projectRef === environments.production.project_ref, 'Backup project ref drifted from environments.json.')

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() || ''
if (!token) {
  const payload = {
    liveVerification: 'skipped',
    reason: 'SUPABASE_ACCESS_TOKEN unset',
    projectRef,
    pitrRequired: contract.backup.pitrRequired,
    dailyBackupRequired: contract.backup.dailyBackupRequired,
    hostedRestoreStatus: contract.backup.hostedRestoreStatus,
  }
  console.log(JSON.stringify(payload, null, 2))
  if (requireLive) {
    throw new Error('Live backup/PITR verification required but SUPABASE_ACCESS_TOKEN is unset.')
  }
  process.exit(0)
}

const response = await fetch(`${MANAGEMENT}/projects/${projectRef}/database/backups`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
})

if (!response.ok) {
  throw new Error(`Supabase backups API returned ${response.status}. Do not log the token or response body.`)
}

const backups = await response.json()
const pitrEnabled = Boolean(backups?.pitr_enabled ?? backups?.pitrEnabled)
const latest = Array.isArray(backups?.backups) ? backups.backups[0] : null
const latestStatus = latest?.status ?? latest?.backup_status ?? null

const payload = {
  liveVerification: 'ran',
  projectRef,
  pitrEnabled,
  pitrRequired: contract.backup.pitrRequired,
  latestBackupStatus: typeof latestStatus === 'string' ? latestStatus : 'unknown',
  hostedRestoreStatus: contract.backup.hostedRestoreStatus,
}

console.log(JSON.stringify(payload, null, 2))

if (contract.backup.pitrRequired && !pitrEnabled) {
  throw new Error('PITR is required on production and the live check reported it disabled.')
}
if (contract.backup.dailyBackupRequired && latestStatus && !/completed|success|complete/i.test(String(latestStatus))) {
  throw new Error('Latest provider backup is not in a successful state.')
}
