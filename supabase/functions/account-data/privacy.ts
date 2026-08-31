import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalJson, sha256 } from '../_shared/crypto.ts'
import { HttpError } from '../_shared/http.ts'

type AdminClient = Pick<SupabaseClient, 'rpc' | 'auth'>

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

function rpcError(
  error: { message: string } | null,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (!error) return
  if (error.message.includes('consent_policy_not_configured')) {
    throw new HttpError(
      503,
      'consent_policy_not_configured',
      'Consent policy versions are not configured.',
    )
  }
  if (error.message.includes('consent_version_stale')) {
    throw new HttpError(
      409,
      'consent_update_required',
      'Current terms, privacy policy, and health-data consent must be accepted.',
    )
  }
  if (error.message.includes('export_request_not_found')) {
    throw new HttpError(404, 'export_request_not_found', 'No export request was found.')
  }
  if (error.message.includes('deletion_request_not_found')) {
    throw new HttpError(404, 'deletion_request_not_found', 'No deletion request was found.')
  }
  if (error.message.includes('delete_confirmation_required')) {
    throw new HttpError(
      400,
      'delete_confirmation_required',
      'Type DELETE to confirm account deletion.',
    )
  }
  throw new HttpError(503, fallbackCode, fallbackMessage)
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
    throw new HttpError(
      503,
      'consent_policy_not_configured',
      'Consent policy versions are not configured.',
    )
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
    throw new HttpError(503, 'account_export_failed', 'Account export is unavailable.')
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
    throw new HttpError(503, 'account_delete_failed', 'Account deletion could not be completed.')
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

export async function loadCurrentLegalVersions(admin: AdminClient): Promise<LegalDocumentVersions> {
  const { data, error } = await admin.rpc('current_legal_document_versions')
  rpcError(error, 'consent_policy_not_configured', 'Consent policy versions are not configured.')
  return parseLegalDocumentVersions(data)
}

export async function requestExportRow(
  admin: AdminClient,
  userId: string,
): Promise<ExportRequestRow> {
  const { data, error } = await admin.rpc('request_account_export', { p_user_id: userId })
  rpcError(error, 'account_export_failed', 'Account export is unavailable.')
  const row = parseExportRequest(data)
  if (!row) throw new HttpError(503, 'account_export_failed', 'Account export is unavailable.')
  return row
}

export async function finalizeExportRow(
  admin: AdminClient,
  userId: string,
  requestId: string,
  payload: Record<string, unknown>,
): Promise<ExportRequestRow> {
  const { data, error } = await admin.rpc('finalize_account_export', {
    p_user_id: userId,
    p_request_id: requestId,
    p_payload: payload,
  })
  rpcError(error, 'account_export_failed', 'Account export is unavailable.')
  const row = parseExportRequest(data)
  if (!row) throw new HttpError(503, 'account_export_failed', 'Account export is unavailable.')
  return row
}

export async function failExportRow(
  admin: AdminClient,
  userId: string,
  requestId: string,
  errorCode: string,
): Promise<void> {
  const { error } = await admin.rpc('fail_account_export', {
    p_user_id: userId,
    p_request_id: requestId,
    p_error_code: errorCode,
  })
  rpcError(error, 'account_export_failed', 'Account export is unavailable.')
}

export async function getExportRow(
  admin: AdminClient,
  userId: string,
  includeArtifact: boolean,
): Promise<{ export_request: ExportRequestRow | null; export: Record<string, unknown> | null }> {
  const { data, error } = await admin.rpc('get_account_export', {
    p_user_id: userId,
    p_include_artifact: includeArtifact,
  })
  rpcError(error, 'account_export_failed', 'Account export is unavailable.')
  if (!isRecord(data)) {
    throw new HttpError(503, 'account_export_failed', 'Account export is unavailable.')
  }
  const payload = isRecord(data.export) ? data.export : null
  return {
    export_request: parseExportRequest(data.export_request),
    export: payload,
  }
}

export async function beginDeletionRow(
  admin: AdminClient,
  userId: string,
  confirmation: string,
): Promise<DeletionRequestRow> {
  const { data, error } = await admin.rpc('begin_account_deletion', {
    p_user_id: userId,
    p_confirmation: confirmation,
  })
  rpcError(error, 'account_delete_failed', 'Account deletion could not be completed.')
  const row = parseDeletionRequest(data)
  if (!row) {
    throw new HttpError(503, 'account_delete_failed', 'Account deletion could not be completed.')
  }
  return row
}

export async function markDeletionSessionsRevoked(
  admin: AdminClient,
  userId: string,
): Promise<void> {
  const { error } = await admin.rpc('mark_account_deletion_sessions_revoked', { p_user_id: userId })
  rpcError(error, 'account_delete_failed', 'Account deletion could not be completed.')
}

export async function failDeletionRow(
  admin: AdminClient,
  userId: string,
  errorCode: string,
): Promise<void> {
  const { error } = await admin.rpc('fail_account_deletion', {
    p_user_id: userId,
    p_error_code: errorCode,
  })
  rpcError(error, 'account_delete_failed', 'Account deletion could not be completed.')
}

export async function recordDeletionReceipt(
  admin: AdminClient,
  accountHash: string,
  result: 'completed' | 'failed',
): Promise<void> {
  const { error } = await admin.rpc('record_deletion_receipt', {
    p_account_hash: accountHash,
    p_result: result,
    p_policy_version: 'momentum-deletion-receipt-v1',
  })
  rpcError(error, 'account_delete_failed', 'Account deletion could not be completed.')
}

export async function getDeletionRow(
  admin: AdminClient,
  userId: string,
): Promise<DeletionRequestRow | null> {
  const { data, error } = await admin.rpc('get_account_deletion', { p_user_id: userId })
  rpcError(error, 'account_delete_failed', 'Account deletion could not be completed.')
  if (!isRecord(data)) {
    throw new HttpError(503, 'account_delete_failed', 'Account deletion could not be completed.')
  }
  return parseDeletionRequest(data.deletion_request)
}

export async function revokeAccountSessions(admin: AdminClient, accessToken: string): Promise<void> {
  if (typeof admin.auth.admin.signOut !== 'function') return
  const { error } = await admin.auth.admin.signOut(accessToken, 'global')
  if (error) {
    throw new HttpError(
      503,
      'account_delete_session_revoke_failed',
      'Account sessions could not be revoked.',
    )
  }
}

export async function accountHash(userId: string): Promise<string> {
  return await sha256(canonicalJson({ account: userId, purpose: 'deletion-receipt' }))
}

export function exportClientStatus(
  row: ExportRequestRow | null,
  now = Date.now(),
): 'idle' | 'pending' | 'ready' | 'expired' | 'failed' {
  if (!row) return 'idle'
  if (row.status === 'ready' && row.expires_at && Date.parse(row.expires_at) <= now) {
    return 'expired'
  }
  return row.status
}
