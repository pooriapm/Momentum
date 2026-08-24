export type UnitSystemPreference = 'auto' | 'metric' | 'us_customary'
export type ResolvedUnitSystem = 'metric' | 'us_customary'

// CLDR's territory-wide US measurement system currently applies to Liberia and
// the United States. All other countries fall back to metric for this two-mode
// product setting. Usage-specific exceptions can be added without changing the
// canonical SI storage contract.
const US_SYSTEM_COUNTRIES = new Set(['LR', 'US'])

export function resolveUnitSystem(
  preference: UnitSystemPreference,
  countryCode: string | null | undefined,
): ResolvedUnitSystem {
  if (preference !== 'auto') return preference
  return countryCode && US_SYSTEM_COUNTRIES.has(countryCode.toUpperCase())
    ? 'us_customary'
    : 'metric'
}

const KG_PER_POUND = 0.45359237
const CM_PER_INCH = 2.54

export function kilogramsToPounds(value: number) {
  return value / KG_PER_POUND
}

export function poundsToKilograms(value: number) {
  return value * KG_PER_POUND
}

export function centimetersToInches(value: number) {
  return value / CM_PER_INCH
}

export function inchesToCentimeters(value: number) {
  return value * CM_PER_INCH
}

export function roundMeasurement(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
