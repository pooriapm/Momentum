import { HttpError } from './http.ts'

type MassUnit = 'kg' | 'lb'
type LengthUnit = 'cm' | 'in'
type PercentUnit = '%'
type RatingUnit = 'score'
type EnergyUnit = 'kcal/day'

export interface ExtractionObservation<Unit extends string> {
  value: number | null
  unit: Unit | null
  confidence: number
  evidence: string | null
}

export interface BodyCompositionExtraction {
  measurements: {
    weight: ExtractionObservation<MassUnit>
    body_fat: ExtractionObservation<PercentUnit>
    fat_mass: ExtractionObservation<MassUnit>
    lean_mass: ExtractionObservation<MassUnit>
    skeletal_muscle_mass: ExtractionObservation<MassUnit>
    visceral_fat_rating: ExtractionObservation<RatingUnit>
    waist: ExtractionObservation<LengthUnit>
    basal_metabolic_rate: ExtractionObservation<EnergyUnit>
  }
}

export interface NormalizedBodyCompositionMetrics {
  weight_kg: number | null
  body_fat_percent: number | null
  fat_mass_kg: number | null
  lean_mass_kg: number | null
  skeletal_muscle_mass_kg: number | null
  visceral_fat_rating: number | null
  waist_cm: number | null
  basal_metabolic_rate_kcal: number | null
}

const metricKeys = [
  'weight',
  'body_fat',
  'fat_mass',
  'lean_mass',
  'skeletal_muscle_mass',
  'visceral_fat_rating',
  'waist',
  'basal_metabolic_rate',
] as const

type MetricKey = typeof metricKeys[number]

interface MetricSpec {
  units: readonly string[]
  minimum: number
  maximum: number
  toCanonical: (value: number, unit: string) => number
}

const kilograms = (value: number, unit: string): number =>
  unit === 'lb' ? value * 0.45359237 : value

const centimeters = (value: number, unit: string): number => unit === 'in' ? value * 2.54 : value

const identity = (value: number): number => value

const metricSpecs: Record<MetricKey, MetricSpec> = {
  weight: { units: ['kg', 'lb'], minimum: 20, maximum: 500, toCanonical: kilograms },
  body_fat: { units: ['%'], minimum: 0, maximum: 80, toCanonical: identity },
  fat_mass: { units: ['kg', 'lb'], minimum: 0, maximum: 350, toCanonical: kilograms },
  lean_mass: { units: ['kg', 'lb'], minimum: 0, maximum: 350, toCanonical: kilograms },
  skeletal_muscle_mass: {
    units: ['kg', 'lb'],
    minimum: 0,
    maximum: 250,
    toCanonical: kilograms,
  },
  visceral_fat_rating: {
    units: ['score'],
    minimum: 0,
    maximum: 100,
    toCanonical: identity,
  },
  waist: { units: ['cm', 'in'], minimum: 20, maximum: 300, toCanonical: centimeters },
  basal_metabolic_rate: {
    units: ['kcal/day'],
    minimum: 0,
    maximum: 10_000,
    toCanonical: identity,
  },
}

function observationSchema(units: readonly string[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      value: { type: ['number', 'null'] },
      unit: { type: ['string', 'null'], enum: [...units, null] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      evidence: { type: ['string', 'null'], maxLength: 200 },
    },
    required: ['value', 'unit', 'confidence', 'evidence'],
    additionalProperties: false,
  }
}

export const bodyCompositionExtractionJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    measurements: {
      type: 'object',
      properties: Object.fromEntries(
        metricKeys.map((key) => [key, observationSchema(metricSpecs[key].units)]),
      ),
      required: metricKeys,
      additionalProperties: false,
    },
  },
  required: ['measurements'],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const actual = Object.keys(value)
  return actual.length === allowed.length && actual.every((key) => allowed.includes(key))
}

function assertObservation(value: unknown, spec: MetricSpec): void {
  if (!isRecord(value) || !hasOnlyKeys(value, ['value', 'unit', 'confidence', 'evidence'])) {
    throw new HttpError(
      502,
      'invalid_extraction_output',
      'Body-composition extraction output is invalid.',
    )
  }

  const confidence = value.confidence
  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new HttpError(
      502,
      'invalid_extraction_output',
      'Body-composition extraction output is invalid.',
    )
  }

  if (value.value === null) {
    if (value.unit !== null || confidence !== 0 || value.evidence !== null) {
      throw new HttpError(
        502,
        'invalid_extraction_output',
        'Body-composition extraction output is invalid.',
      )
    }
    return
  }

  if (
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value) ||
    typeof value.unit !== 'string' ||
    !spec.units.includes(value.unit) ||
    confidence < 0.8 ||
    typeof value.evidence !== 'string' ||
    value.evidence.trim().length < 1 ||
    value.evidence.length > 200
  ) {
    throw new HttpError(
      502,
      'invalid_extraction_output',
      'Body-composition extraction output is invalid.',
    )
  }

  const normalized = spec.toCanonical(value.value, value.unit)
  if (!Number.isFinite(normalized) || normalized < spec.minimum || normalized > spec.maximum) {
    throw new HttpError(
      422,
      'measurement_out_of_range',
      'An extracted measurement is outside the supported range.',
    )
  }
}

export function assertBodyCompositionExtraction(
  value: unknown,
): asserts value is BodyCompositionExtraction {
  if (!isRecord(value) || !hasOnlyKeys(value, ['measurements']) || !isRecord(value.measurements)) {
    throw new HttpError(
      502,
      'invalid_extraction_output',
      'Body-composition extraction output is invalid.',
    )
  }
  if (!hasOnlyKeys(value.measurements, metricKeys)) {
    throw new HttpError(
      502,
      'invalid_extraction_output',
      'Body-composition extraction output is invalid.',
    )
  }

  for (const key of metricKeys) {
    assertObservation(value.measurements[key], metricSpecs[key])
  }
}

function normalizeObservation(
  observation: ExtractionObservation<string>,
  spec: MetricSpec,
): number | null {
  if (observation.value === null || observation.unit === null) return null
  const canonical = spec.toCanonical(observation.value, observation.unit)
  return Math.round(canonical * 100) / 100
}

export function normalizeBodyCompositionMetrics(
  extraction: BodyCompositionExtraction,
): NormalizedBodyCompositionMetrics {
  const measurements = extraction.measurements
  return {
    weight_kg: normalizeObservation(measurements.weight, metricSpecs.weight),
    body_fat_percent: normalizeObservation(measurements.body_fat, metricSpecs.body_fat),
    fat_mass_kg: normalizeObservation(measurements.fat_mass, metricSpecs.fat_mass),
    lean_mass_kg: normalizeObservation(measurements.lean_mass, metricSpecs.lean_mass),
    skeletal_muscle_mass_kg: normalizeObservation(
      measurements.skeletal_muscle_mass,
      metricSpecs.skeletal_muscle_mass,
    ),
    visceral_fat_rating: normalizeObservation(
      measurements.visceral_fat_rating,
      metricSpecs.visceral_fat_rating,
    ),
    waist_cm: normalizeObservation(measurements.waist, metricSpecs.waist),
    basal_metabolic_rate_kcal: normalizeObservation(
      measurements.basal_metabolic_rate,
      metricSpecs.basal_metabolic_rate,
    ),
  }
}
