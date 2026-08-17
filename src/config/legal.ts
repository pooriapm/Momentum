import { z } from 'zod'
import { requireSupabase } from '../platform/data/supabase'

export const LEGAL_DOCUMENT_VERSION = '2026-08-01-alpha'

export const legalDocumentVersionsSchema = z.object({
  terms: z.string().min(1).max(80),
  privacy: z.string().min(1).max(80),
  health: z.string().min(1).max(80),
})

export type LegalDocumentVersions = z.infer<typeof legalDocumentVersionsSchema>

export const FALLBACK_LEGAL_DOCUMENT_VERSIONS: LegalDocumentVersions = {
  terms: LEGAL_DOCUMENT_VERSION,
  privacy: LEGAL_DOCUMENT_VERSION,
  health: LEGAL_DOCUMENT_VERSION,
}

export async function loadLegalDocumentVersions(): Promise<LegalDocumentVersions> {
  try {
    const client = requireSupabase()
    const { data, error } = await client.rpc('current_legal_document_versions')
    if (error || data == null) return FALLBACK_LEGAL_DOCUMENT_VERSIONS
    return legalDocumentVersionsSchema.parse(data)
  } catch {
    return FALLBACK_LEGAL_DOCUMENT_VERSIONS
  }
}

export function versionForDocument(
  versions: LegalDocumentVersions,
  document: 'terms' | 'privacy' | 'health',
) {
  return versions[document]
}
