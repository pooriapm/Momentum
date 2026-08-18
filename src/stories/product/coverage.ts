const canonicalFamilies = {
  AUTH: 18,
  EXEC: 10,
  LIFE: 20,
  ME: 9,
  ONB: 28,
  PLAN: 14,
  PROG: 7,
  PUB: 14,
  TODAY: 12,
} as const

export type CanonicalFamily = keyof typeof canonicalFamilies
export type CoverageParent = 'dialog' | 'in-page' | 'screen' | 'sheet'

export function canonicalStateIds(): string[] {
  return Object.entries(canonicalFamilies).flatMap(([family, count]) => (
    Array.from({ length: count }, (_, index) => `${family}-${String(index + 1).padStart(2, '0')}`)
  ))
}

const canonicalSet = new Set(canonicalStateIds())

export function momentumEvidence(stateIds: string[], route: string, parent: CoverageParent = 'screen') {
  const invalid = stateIds.filter((stateId) => !canonicalSet.has(stateId))
  if (invalid.length) throw new Error(`Unknown Momentum state IDs: ${invalid.join(', ')}`)
  return { momentum: { canonical: true, parent, route, stateIds } }
}

export function momentumSupportingVariant(route: string, variant: string, parent: CoverageParent = 'screen') {
  return { momentum: { canonical: false, parent, route, stateIds: [], variant } }
}
