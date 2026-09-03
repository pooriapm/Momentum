import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

function values(name: string, pattern: RegExp): ReadonlySet<string> {
  return new Set(
    (optionalEnv(name) ?? '').split(',').map((value) => value.trim()).filter((value) =>
      pattern.test(value)
    ),
  )
}

function enabled(name: string): boolean {
  return optionalEnv(name)?.toLowerCase() === 'true'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertClosedAlphaAccess(userId: string): void {
  if (!enabled('ALPHA_ENROLLMENT_ENABLED')) {
    throw new HttpError(403, 'ALPHA_DISABLED', 'Closed alpha access is unavailable.')
  }
  if (!values('ALPHA_COHORT_IDS', UUID_PATTERN).has(userId)) {
    throw new HttpError(403, 'ALPHA_NOT_INVITED', 'Closed alpha access is unavailable.')
  }
}

export function assertPublicBetaAccess(): void {
  if (!enabled('PUBLIC_BETA_ENABLED')) {
    throw new HttpError(403, 'PUBLIC_BETA_DISABLED', 'Public beta access is unavailable.')
  }
}

/** Public beta opens the product; otherwise closed alpha requires an invited cohort. */
export function assertProductEnrollmentAccess(userId: string): void {
  if (enabled('PUBLIC_BETA_ENABLED')) return
  assertClosedAlphaAccess(userId)
}

const ACCOUNT_DATA_UNGATED_ACTIONS = new Set([
  'legal-versions',
  'export-status',
  'export-download',
  'export-account',
  'deletion-status',
  'delete-account',
])

const ACCOUNT_SETTINGS_UNGATED_ACTIONS = new Set([
  'withdraw-health-consent',
])

export function assertAccountDataEnrollmentAccess(userId: string, action: unknown): void {
  if (typeof action === 'string' && ACCOUNT_DATA_UNGATED_ACTIONS.has(action)) return
  assertProductEnrollmentAccess(userId)
}

export function assertAccountSettingsEnrollmentAccess(userId: string, action: unknown): void {
  if (typeof action === 'string' && ACCOUNT_SETTINGS_UNGATED_ACTIONS.has(action)) return
  assertProductEnrollmentAccess(userId)
}
