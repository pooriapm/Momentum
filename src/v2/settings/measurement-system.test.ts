import { describe, expect, it } from 'vitest'
import {
  centimetersToInches,
  inchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
  resolveUnitSystem,
  roundMeasurement,
} from './measurement-system'

describe('measurement system policy', () => {
  it('uses country only for auto preference', () => {
    expect(resolveUnitSystem('auto', 'IR')).toBe('metric')
    expect(resolveUnitSystem('auto', 'US')).toBe('us_customary')
    expect(resolveUnitSystem('auto', 'lr')).toBe('us_customary')
    expect(resolveUnitSystem('metric', 'US')).toBe('metric')
    expect(resolveUnitSystem('us_customary', 'IR')).toBe('us_customary')
  })

  it('round-trips exact mass and length conversions', () => {
    expect(roundMeasurement(kilogramsToPounds(70))).toBe(154.3)
    expect(roundMeasurement(poundsToKilograms(kilogramsToPounds(70)), 4)).toBe(70)
    expect(roundMeasurement(centimetersToInches(170))).toBe(66.9)
    expect(roundMeasurement(inchesToCentimeters(centimetersToInches(170)), 4)).toBe(170)
  })
})
