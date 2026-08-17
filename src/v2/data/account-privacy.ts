export interface LegalDocumentVersions {
  terms: string
  privacy: string
  health: string
}

export interface ExportRequestRow {
  id: string
  status: 'pending' | 'ready' | 'expired' | 'failed'
  requested_at: string
  ready_at: string | null
  expires_at: string | null
  error_code?: string | null
}

export interface DeletionRequestRow {
  id: string
  status: 'pending' | 'completed' | 'failed'
  requested_at: string
  confirmed_at: string | null
  completed_at: string | null
  sessions_revoked_at: string | null
  error_code?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseLegalDocumentVersions(value: unknown): LegalDocumentVersions {
  if (
    !isRecord(value) ||
    typeof value.terms !== 'string' ||
    typeof value.privacy !== 'string' ||
    typeof value.health !== 'string' ||
    value.terms.length < 1 ||
    value.privacy.length < 1 ||
    value.health.length < 1
  ) {
    throw new Error('consent_policy_not_configured')
  }
  return { terms: value.terms, privacy: value.privacy, health: value.health }
}

export function parseExportRequest(value: unknown): ExportRequestRow | null {
  if (value == null) return null
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.status !== 'pending' &&
      value.status !== 'ready' &&
      value.status !== 'expired' &&
      value.status !== 'failed') ||
    typeof value.requested_at !== 'string'
  ) {
    throw new Error('account_export_failed')
  }
  return {
    id: value.id,
    status: value.status,
    requested_at: value.requested_at,
    ready_at: typeof value.ready_at === 'string' ? value.ready_at : null,
    expires_at: typeof value.expires_at === 'string' ? value.expires_at : null,
    error_code: typeof value.error_code === 'string' ? value.error_code : null,
  }
}

export function parseDeletionRequest(value: unknown): DeletionRequestRow | null {
  if (value == null) return null
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.status !== 'pending' && value.status !== 'completed' && value.status !== 'failed') ||
    typeof value.requested_at !== 'string'
  ) {
    throw new Error('account_delete_failed')
  }
  return {
    id: value.id,
    status: value.status,
    requested_at: value.requested_at,
    confirmed_at: typeof value.confirmed_at === 'string' ? value.confirmed_at : null,
    completed_at: typeof value.completed_at === 'string' ? value.completed_at : null,
    sessions_revoked_at: typeof value.sessions_revoked_at === 'string'
      ? value.sessions_revoked_at
      : null,
    error_code: typeof value.error_code === 'string' ? value.error_code : null,
  }
}

export function exportClientStatus(
  row: ExportRequestRow | null,
  now = Date.now(),
): 'idle' | 'pending' | 'ready' | 'expired' | 'failed' {
  if (!row) return 'idle'
  if (row.status === 'ready' && row.expires_at && Date.parse(row.expires_at) <= now) return 'expired'
  return row.status
}
