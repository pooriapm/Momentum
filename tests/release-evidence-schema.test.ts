import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(join(root, 'release-evidence/schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validate = ajv.compile(schema)

function baseRecord(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0.0',
    stage: 'R4',
    releaseId: 'r4-hold-2026-09-03',
    commit: 'a'.repeat(40),
    decision: 'hold',
    scope: {
      countries: ['IR'],
      locales: ['fa-IR', 'en-US'],
      liveAi: false,
      payments: false,
    },
    evidence: ['staging-eval-pending'],
    signoffs: [{
      role: 'engineering',
      name: 'Pooria',
      evidenceId: 'staging-eval-pending',
      signedAt: '2026-09-03T12:00:00.000Z',
    }],
    decidedAt: '2026-09-03T12:00:00.000Z',
    expiresAt: null,
    ...overrides,
  }
}

describe('release evidence schema validation', () => {
  it('accepts a structurally valid hold decision', () => {
    expect(validate(baseRecord())).toBe(true)
  })

  it('rejects invalid date-time values', () => {
    expect(validate(baseRecord({ decidedAt: 'not-a-date' }))).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === 'format')).toBe(true)
  })

  it('rejects additional properties', () => {
    expect(validate(baseRecord({ forged: true }))).toBe(false)
  })

  it('treats hold as non-promotable even when schema-valid', () => {
    const record = baseRecord()
    expect(validate(record)).toBe(true)
    expect(record.decision).not.toBe('go')
  })
})
