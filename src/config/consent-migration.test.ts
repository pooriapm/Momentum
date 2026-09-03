import { describe, expect, it } from 'vitest'
import { evaluateConsentMigration } from './consent-migration'

const required = {
  terms: '2026-09-01',
  privacy: '2026-09-01',
  health: '2026-09-01',
}

describe('consent-migration', () => {
  it('flags all documents when no accepted versions exist', () => {
    expect(evaluateConsentMigration(null, required)).toEqual({
      required: true,
      staleDocuments: ['terms', 'privacy', 'health'],
    })
  })

  it('passes when every document matches and health has a timestamp', () => {
    expect(evaluateConsentMigration({
      terms: '2026-09-01',
      privacy: '2026-09-01',
      health: '2026-09-01',
      healthAcceptedAt: '2026-09-01T00:00:00.000Z',
    }, required)).toEqual({
      required: false,
      staleDocuments: [],
    })
  })

  it('lists only the stale documents on version drift', () => {
    expect(evaluateConsentMigration({
      terms: '2026-08-01-alpha',
      privacy: '2026-09-01',
      health: '2026-09-01',
      healthAcceptedAt: '2026-09-01T00:00:00.000Z',
    }, required)).toEqual({
      required: true,
      staleDocuments: ['terms'],
    })
  })

  it('requires health re-accept when the timestamp is missing', () => {
    expect(evaluateConsentMigration({
      terms: '2026-09-01',
      privacy: '2026-09-01',
      health: '2026-09-01',
      healthAcceptedAt: null,
    }, required).staleDocuments).toEqual(['health'])
  })
})
