import { HttpError } from './http.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'

export const REQUIRED_PLAN_CATALOG_RELEASE = 'momentum-core@v2'

const RELEASE_PATTERN = /^momentum-core@v([1-9][0-9]*)$/

export function catalogReleaseVersion(releaseId: string): number | null {
  const match = RELEASE_PATTERN.exec(releaseId)
  if (!match) return null
  return Number(match[1])
}

export function isApprovedGenerationCatalog(releaseId: string): boolean {
  const version = catalogReleaseVersion(releaseId)
  return version !== null && version >= 2
}

export function assertCatalogGenerationGate(catalog: Pick<PlanCatalogSnapshot, 'releaseId'>): void {
  if (isApprovedGenerationCatalog(catalog.releaseId)) return
  throw new HttpError(
    503,
    'CATALOG_RELEASE_REQUIRED',
    `Public generation requires catalog ${REQUIRED_PLAN_CATALOG_RELEASE} or a later reviewed release.`,
  )
}
