import { describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENT_VERSION,
  legalDocumentVersionsSchema,
  loadLegalDocumentVersions,
} from './legal'

vi.mock('../platform/data/supabase', () => ({
  requireSupabase: () => ({
    rpc: vi.fn().mockResolvedValue({
      data: {
        terms: '2026-08-01-alpha',
        privacy: '2026-08-01-alpha',
        health: '2026-08-01-alpha',
      },
      error: null,
    }),
  }),
}))

describe('legal document versions', () => {
  it('treats the server RPC payload as the current consent versions', async () => {
    await expect(loadLegalDocumentVersions()).resolves.toEqual({
      terms: '2026-08-01-alpha',
      privacy: '2026-08-01-alpha',
      health: '2026-08-01-alpha',
    })
    expect(legalDocumentVersionsSchema.parse({
      terms: LEGAL_DOCUMENT_VERSION,
      privacy: LEGAL_DOCUMENT_VERSION,
      health: LEGAL_DOCUMENT_VERSION,
    })).toEqual(FALLBACK_LEGAL_DOCUMENT_VERSIONS)
  })
})
