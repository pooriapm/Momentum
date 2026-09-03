#!/usr/bin/env node
/**
 * Package H release-readiness reporter.
 * Never creates R4–R8 go records. Prints evidence vs blockers only.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const environments = JSON.parse(fs.readFileSync(path.join(root, 'supabase/environments.json'), 'utf8'))
const contract = JSON.parse(fs.readFileSync(path.join(root, 'ops/contract.json'), 'utf8'))
const envExample = fs.readFileSync(path.join(root, 'supabase/.env.example'), 'utf8')

function hasLine(source, line) {
  return source.split('\n').some((row) => row.trim() === line)
}

const releaseVerify = spawnSync(process.execPath, [path.join(root, 'scripts/ops/verify-r4-r8.mjs'), '--release'], {
  cwd: root,
  encoding: 'utf8',
})

const payload = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  commit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  productContract: {
    singleSku: true,
    thirtyDayPlan: true,
    destinations: ['Today', 'Plan', 'Progress', 'Me'],
  },
  gates: {
    alphaDefaultOff: hasLine(envExample, 'ALPHA_ENROLLMENT_ENABLED=false'),
    publicBetaDefaultOff: hasLine(envExample, 'PUBLIC_BETA_ENABLED=false'),
    liveAiDefaultOff: hasLine(envExample, 'AI_PLAN_LIVE_OPENAI=false'),
    paymentsDefaultOff: hasLine(envExample, 'PAYMENTS_MASTER_ENABLED=false'),
  },
  staging: {
    status: environments.staging.status,
    sameShaPromotionReady: environments.promotion?.same_sha_required === true,
  },
  backup: {
    hostedRestoreStatus: contract.backup.hostedRestoreStatus,
  },
  releaseEvidence: {
    verifyExitCode: releaseVerify.status,
    expectedFailUntilSignedGo: true,
    stdoutTail: (releaseVerify.stderr || releaseVerify.stdout || '').trim().split('\n').slice(-3),
  },
  remainingOwnerActions: [
    'Provision staging (ops/STAGING-READINESS.md) with paid-project approval',
    'Run hosted restore + alert destination proof with approved channels only',
    'Complete live AI staging eval + professional content/safety signoff',
    'Complete payment sandbox end-to-end with provider credentials (no live charge without approval)',
    'Invited alpha cohort + consent + cost ceiling before any public beta',
    'Create real release-evidence/R4.json…R8.json only after genuine signoffs',
  ],
  deferred: [
    'Native iOS/Android generators',
    'VoiceOver and second screen-reader device evidence',
    'Forced Colors Pass on real OS settings',
    'Chat/coach surfaces',
    'Core/Pro or annual SKUs',
  ],
}

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true })
fs.writeFileSync(path.join(root, 'artifacts/release-readiness.json'), `${JSON.stringify(payload, null, 2)}\n`)
console.log(JSON.stringify(payload, null, 2))

if (releaseVerify.status === 0) {
  console.error('Unexpected: verify:r4-r8-release passed without signed evidence.')
  process.exit(1)
}
