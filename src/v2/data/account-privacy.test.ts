import { describe, expect, it } from 'vitest'
import {
  exportClientStatus,
  parseDeletionRequest,
  parseExportRequest,
  parseLegalDocumentVersions,
} from './account-privacy'

describe('account privacy server projections', () => {
  it('requires all three current legal document versions', () => {
    expect(parseLegalDocumentVersions({
      terms: '2026-08-01-alpha',
      privacy: '2026-08-01-alpha',
      health: '2026-08-01-alpha',
    })).toEqual({
      terms: '2026-08-01-alpha',
      privacy: '2026-08-01-alpha',
      health: '2026-08-01-alpha',
    })
    expect(() => parseLegalDocumentVersions({ terms: '2026-08-01-alpha' })).toThrow(
      'consent_policy_not_configured',
    )
  })

  it('maps export rows through pending, ready, and expired without duplicating status', () => {
    const pending = parseExportRequest({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'pending',
      requested_at: '2026-08-18T00:00:00.000Z',
      ready_at: null,
      expires_at: null,
    })
    const ready = parseExportRequest({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'ready',
      requested_at: '2026-08-18T00:00:00.000Z',
      ready_at: '2026-08-18T00:01:00.000Z',
      expires_at: '2026-08-19T00:01:00.000Z',
    })
    expect(exportClientStatus(pending)).toBe('pending')
    expect(exportClientStatus(ready, Date.parse('2026-08-18T12:00:00.000Z'))).toBe('ready')
    expect(exportClientStatus(ready, Date.parse('2026-08-20T00:00:00.000Z'))).toBe('expired')
    expect(exportClientStatus(null)).toBe('idle')
  })

  it('keeps a confirmed deletion request pending until the workflow finishes', () => {
    const row = parseDeletionRequest({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'pending',
      requested_at: '2026-08-18T00:00:00.000Z',
      confirmed_at: '2026-08-18T00:00:01.000Z',
      completed_at: null,
      sessions_revoked_at: null,
    })
    expect(row?.status).toBe('pending')
    expect(row?.confirmed_at).toBeTruthy()
  })
})
