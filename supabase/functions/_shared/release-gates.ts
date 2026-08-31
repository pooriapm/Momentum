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
