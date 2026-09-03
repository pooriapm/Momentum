import type { LegalDocumentVersions } from './legal'

export type ConsentDocumentKey = keyof LegalDocumentVersions

export interface AcceptedConsentVersions {
  terms: string | null | undefined
  privacy: string | null | undefined
  health: string | null | undefined
  healthAcceptedAt?: string | null | undefined
}

export interface ConsentMigrationState {
  required: boolean
  staleDocuments: ConsentDocumentKey[]
}

/**
 * Detects when accepted profile consent versions lag the current legal policy.
 * Server generation already fail-closes on mismatch; this powers the client re-accept prompt.
 */
export function evaluateConsentMigration(
  accepted: AcceptedConsentVersions | null | undefined,
  required: LegalDocumentVersions,
): ConsentMigrationState {
  if (!accepted) {
    return { required: true, staleDocuments: ['terms', 'privacy', 'health'] }
  }

  const staleDocuments: ConsentDocumentKey[] = []
  if (accepted.terms !== required.terms) staleDocuments.push('terms')
  if (accepted.privacy !== required.privacy) staleDocuments.push('privacy')
  if (accepted.health !== required.health || !accepted.healthAcceptedAt) {
    staleDocuments.push('health')
  }

  return {
    required: staleDocuments.length > 0,
    staleDocuments,
  }
}
