#!/usr/bin/env node
/**
 * Alert destination proof helper.
 * Default is dry-run only. Never sends unless --send is passed and an approved
 * webhook env is present. Does not invent Pass for missing destinations.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const contract = JSON.parse(fs.readFileSync(path.join(root, 'ops/contract.json'), 'utf8'))
const send = process.argv.includes('--send')
const pageEnv = contract.monitoring.destinations.pageWebhookEnv
const notifyEnv = contract.monitoring.destinations.notifyWebhookEnv
const pageUrl = process.env[pageEnv]?.trim() || ''
const notifyUrl = process.env[notifyEnv]?.trim() || ''

const payload = {
  schemaVersion: '1.0.0',
  mode: send ? 'send' : 'dry-run',
  destinations: {
    pageWebhookEnv: pageEnv,
    notifyWebhookEnv: notifyEnv,
    pageConfigured: Boolean(pageUrl),
    notifyConfigured: Boolean(notifyUrl),
  },
  sent: false,
  blockedReason: null,
}

if (!send) {
  payload.blockedReason = 'dry_run_only'
  console.log(JSON.stringify(payload, null, 2))
  process.exit(pageUrl || notifyUrl ? 0 : 2)
}

if (!notifyUrl && !pageUrl) {
  payload.blockedReason = 'no_webhook_env'
  console.log(JSON.stringify(payload, null, 2))
  process.exit(2)
}

const target = notifyUrl || pageUrl
const body = {
  source: 'momentum-ops-alert-proof',
  severity: 'P2',
  id: 'alert_destination_proof',
  message: 'Momentum approved alert-destination proof ping',
  at: new Date().toISOString(),
}

const response = await fetch(target, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

payload.sent = response.ok
payload.blockedReason = response.ok ? null : `webhook_http_${response.status}`
console.log(JSON.stringify(payload, null, 2))
process.exit(response.ok ? 0 : 1)
