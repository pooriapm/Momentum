import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const contract = JSON.parse(fs.readFileSync(path.join(root, 'ops/contract.json'), 'utf8'))
const contactConfigured = Boolean(process.env.MOMENTUM_ONCALL_CONTACT?.trim())

process.stdout.write(`${JSON.stringify({
  primaryRole: contract.oncall.primaryRole,
  escalation: contract.oncall.escalation,
  ackMinutes: contract.oncall.ackMinutes,
  roles: contract.oncall.roles,
  contactConfigured,
  hostedRestoreStatus: contract.backup.hostedRestoreStatus,
}, null, 2)}\n`)
