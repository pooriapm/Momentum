import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const schema = JSON.parse(read('ops/schema.json'))
const contract = JSON.parse(read('ops/contract.json'))
const macros = JSON.parse(read('ops/support-macros.json'))
const environments = JSON.parse(read('supabase/environments.json'))

assert(schema.$id.includes('operations-contract'), 'Operations schema id drifted.')
assert(contract.schemaVersion === '1.0.0', 'Operations contract schema version drifted.')
assert(contract.service === 'momentum', 'Operations contract service drifted.')
assert(contract.backup.projectRef === environments.production.project_ref, 'Backup project ref drifted.')
assert(contract.backup.hostedRestoreStatus === 'blocked_no_staging', 'Do not claim a hosted restore while staging is unprovisioned.')
assert(environments.staging.status === 'not_provisioned', 'Review hosted restore status if staging is provisioned.')
assert(exists(contract.restoreDrill.script), 'Restore-drill script is missing.')
assert(exists(contract.support.macrosFile), 'Support macros file is missing.')
assert(contract.restoreDrill.neverProductionDump === true, 'Restore drill must never dump production.')

const wrangler = read('wrangler.jsonc')
assert(wrangler.includes('"main": "workers/ops.ts"'), 'Wrangler must route ops through workers/ops.ts.')
assert(wrangler.includes('"binding": "ASSETS"'), 'Wrangler assets binding is missing.')
assert(wrangler.includes('"observability"'), 'Wrangler observability block is missing.')
assert(read('vite.config.ts').includes('/ops/'), 'PWA must fetch /ops/ from the network, not the page cache.')

const worker = read('workers/ops.ts')
assert(worker.includes("pathname === '/ops/health'"), 'Health endpoint is missing.')
assert(worker.includes("pathname === '/ops/client-errors'"), 'Error ingest endpoint is missing.')
assert(worker.includes('unknown_fields'), 'Error ingest must reject extra fields.')
assert(worker.includes('unsafe_message'), 'Error ingest must reject non-categorical messages.')

for (const code of contract.monitoring.allowedErrorCodes) {
  assert(read('src/platform/observability/safe-error-report.ts').includes(`'${code}'`), `Client allowlist missing ${code}.`)
  assert(worker.includes(`'${code}'`), `Worker allowlist missing ${code}.`)
}

const oncallRoles = new Set(contract.oncall.roles)
assert(oncallRoles.has(contract.oncall.primaryRole), 'Primary on-call role is not in the roster.')
for (const role of contract.oncall.escalation) {
  assert(oncallRoles.has(role), `Escalation role ${role} is not in the roster.`)
}
for (const alert of contract.alerts) {
  assert(oncallRoles.has(alert.ownerRole), `Alert ${alert.id} owner ${alert.ownerRole} is not an on-call role.`)
  if (alert.severity === 'P0') assert(alert.page === true, `P0 alert ${alert.id} must page.`)
}

const requiredAlerts = [
  'backup_stale',
  'pitr_disabled',
  'restore_drill_overdue',
  'client_error_burst',
  'edge_5xx',
  'secret_or_rls_failure',
  'support_mailbox_unconfigured',
]
for (const id of requiredAlerts) {
  assert(contract.alerts.some((alert) => alert.id === id), `Missing alert ${id}.`)
}

assert(Array.isArray(macros.macros) && macros.macros.length >= 8, 'Support macros are incomplete.')
assert(JSON.stringify(contract.support.locales) === JSON.stringify(['fa', 'en']), 'Support locales drifted.')
const seenMacroIds = new Set()
for (const macro of macros.macros) {
  assert(typeof macro.id === 'string' && macro.id.length >= 3, 'Support macro id missing.')
  assert(!seenMacroIds.has(macro.id), `Duplicate support macro ${macro.id}.`)
  seenMacroIds.add(macro.id)
  assert(oncallRoles.has(macro.escalation), `Macro ${macro.id} escalation is not an on-call role.`)
  for (const locale of ['fa', 'en']) {
    assert(macro[locale]?.subject?.includes(macro.id), `${locale} subject for ${macro.id} must include the code.`)
    assert(macro[locale]?.body?.includes(macro.id), `${locale} body for ${macro.id} must include the code.`)
    assert(!/password\s*[:=]|رمز عبور\s*[:=]/i.test(macro[locale].body), `${macro.id} ${locale} body looks like it collects a secret.`)
  }
  assert(Array.isArray(macro.neverAskFor) && macro.neverAskFor.length > 0, `Macro ${macro.id} must list forbidden asks.`)
}

const requiredMacros = [
  'ACCOUNT-RECOVERY',
  'PLAN-IMPORT-207',
  'GENERATION-FAILED',
  'AI-DEGRADED',
  'SIGNOUT-17',
  'ACCOUNT-EXPORT',
  'ACCOUNT-DELETE',
  'SAFETY-BOUNDARY',
  'PRIVACY-REQUEST',
  'PAYMENT-ROUTE',
  'QUOTA-REACHED',
  'OUTAGE',
]
for (const id of requiredMacros) {
  assert(seenMacroIds.has(id), `Missing support macro ${id}.`)
}

const mePage = read('src/v2/pages/app/MePage.tsx')
assert(mePage.includes('supportMailtoHref'), 'Help panel must use the shared support mailto helper.')
assert(read('src/v2/pages/app/me-state.ts').includes('SUPPORT_ISSUE_CODES'), 'Support issue codes are missing.')
assert(read('src/platform/config/runtime.ts').includes('/ops/client-errors'), 'Production error ingest default is missing.')

const operationsDoc = read('supabase/R7-OPERATIONS.md')
assert(operationsDoc.includes('npm run test:ops'), 'Tracked operations contract must name the verifier.')
assert(operationsDoc.includes('MOMENTUM_ONCALL_CONTACT'), 'Tracked operations contract must name the on-call env.')
assert(!operationsDoc.includes('@gmail.com'), 'Do not put personal mailboxes in the tracked operations contract.')

const quality = read('.github/workflows/quality.yml')
assert(quality.includes('npm run test:ops'), 'CI must run the operations verifier.')
assert(quality.includes('restore-drill.sh execute'), 'CI database job must execute the local restore drill.')
assert(quality.includes('npm run test:privacy-lifecycle'), 'CI database job must drill export/delete.')
assert(exists('scripts/ops/verify-privacy-lifecycle.mjs'), 'Privacy lifecycle drill script is missing.')
assert(quality.includes('npm run test:body-report'), 'CI database job must drill private body reports.')
assert(exists('scripts/ops/verify-body-report.mjs'), 'Body-report drill script is missing.')

const r1 = read('supabase/R1-OPERATIONS.md')
assert(r1.includes('restore rehearsal'), 'R1 operations still records the hosted restore blocker.')

const live = spawnSync(process.execPath, [path.join(root, 'scripts/ops/backup-pitr-status.mjs')], {
  cwd: root,
  encoding: 'utf8',
})
assert(live.status === 0, live.stderr || live.stdout || 'backup/PITR status script failed.')
const livePayload = JSON.parse(live.stdout)
assert(livePayload.projectRef === contract.backup.projectRef, 'Live backup status targeted the wrong project.')
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  assert(livePayload.liveVerification === 'skipped', 'Without a token, backup verification must skip live PITR.')
}

console.log(JSON.stringify({
  operations: 'passed',
  backup: {
    projectRef: contract.backup.projectRef,
    hostedRestoreStatus: contract.backup.hostedRestoreStatus,
    liveVerification: livePayload.liveVerification,
  },
  alerts: contract.alerts.length,
  macros: macros.macros.length,
  oncallConfigured: Boolean(process.env.MOMENTUM_ONCALL_CONTACT?.trim()),
  supportMailboxConfigured: Boolean(process.env.VITE_SUPPORT_EMAIL?.trim()),
}, null, 2))
