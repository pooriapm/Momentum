import { HttpError } from './http.ts'

export const RED_FLAGS = [
  'chest_pain',
  'fainting',
  'severe_shortness_of_breath',
  'sudden_weakness_or_numbness',
] as const

type RedFlag = typeof RED_FLAGS[number]

export interface DailyCheckInPayload {
  adherence_percent: number | null
  energy_score: number
  hunger_score: number
  mood_score: number
  sleep_minutes: number
  weight_kg: number | null
  pain_score: number
  pain_location: string | null
  training_difficulty_score: number | null
  recovery_score: number
  notes: string | null
  red_flags: RedFlag[]
}

export interface WeeklyCheckInPayload {
  overall_score: number
  recovery_trend: 'improved' | 'stable' | 'worse'
  training_trend: 'easier' | 'same' | 'harder' | 'not_applicable'
  pain_trend: 'improved' | 'stable' | 'worse' | 'no_pain'
  circumstances_changed: boolean
  condition_change:
    | 'none'
    | 'new_condition'
    | 'medication_change'
    | 'injury_or_worsening_pain'
    | 'other'
  change_notes: string | null
  notes: string | null
  red_flags: RedFlag[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredInteger(value: unknown, minimum: number, maximum: number, field: string) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new HttpError(422, 'invalid_checkin', `${field} is outside the allowed range.`)
  }
  return value as number
}

function optionalNumber(value: unknown, minimum: number, maximum: number, field: string) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new HttpError(422, 'invalid_checkin', `${field} is outside the allowed range.`)
  }
  return value
}

function optionalText(value: unknown, maximum: number, field: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > maximum) {
    throw new HttpError(422, 'invalid_checkin', `${field} is invalid.`)
  }
  return value.trim()
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(422, 'invalid_checkin', `${field} is invalid.`)
  }
  return value as T
}

function redFlags(value: unknown): RedFlag[] {
  if (!Array.isArray(value) || value.length > RED_FLAGS.length) {
    throw new HttpError(422, 'invalid_checkin', 'redFlags is invalid.')
  }
  const unique = [...new Set(value)]
  if (
    unique.length !== value.length || unique.some((item) => !RED_FLAGS.includes(item as RedFlag))
  ) {
    throw new HttpError(422, 'invalid_checkin', 'redFlags is invalid.')
  }
  return unique as RedFlag[]
}

export function parseDailyCheckIn(value: unknown): DailyCheckInPayload {
  if (!isRecord(value)) throw new HttpError(422, 'invalid_checkin', 'Daily check-in is required.')
  const painScore = requiredInteger(value.painScore, 0, 10, 'painScore')
  const painLocation = optionalText(value.painLocation, 240, 'painLocation')
  if (painScore > 0 && !painLocation) {
    throw new HttpError(
      422,
      'pain_location_required',
      'Describe where you feel pain or discomfort.',
    )
  }
  return {
    adherence_percent: optionalNumber(value.adherencePercent, 0, 100, 'adherencePercent'),
    energy_score: requiredInteger(value.energyScore, 1, 5, 'energyScore'),
    hunger_score: requiredInteger(value.hungerScore, 1, 5, 'hungerScore'),
    mood_score: requiredInteger(value.moodScore, 1, 5, 'moodScore'),
    sleep_minutes: requiredInteger(value.sleepMinutes, 0, 1440, 'sleepMinutes'),
    weight_kg: optionalNumber(value.weightKg, 20, 500, 'weightKg'),
    pain_score: painScore,
    pain_location: painLocation,
    training_difficulty_score: value.trainingDifficultyScore === undefined
      ? null
      : requiredInteger(value.trainingDifficultyScore, 1, 5, 'trainingDifficultyScore'),
    recovery_score: requiredInteger(value.recoveryScore, 1, 5, 'recoveryScore'),
    notes: optionalText(value.notes, 2000, 'notes'),
    red_flags: redFlags(value.redFlags),
  }
}

export function parseWeeklyCheckIn(value: unknown): WeeklyCheckInPayload {
  if (!isRecord(value)) throw new HttpError(422, 'invalid_checkin', 'Weekly check-in is required.')
  const circumstancesChanged = value.circumstancesChanged
  if (typeof circumstancesChanged !== 'boolean') {
    throw new HttpError(422, 'invalid_checkin', 'circumstancesChanged is invalid.')
  }
  const conditionChange = oneOf(
    value.conditionChange,
    [
      'none',
      'new_condition',
      'medication_change',
      'injury_or_worsening_pain',
      'other',
    ] as const,
    'conditionChange',
  )
  const changeNotes = optionalText(value.changeNotes, 2000, 'changeNotes')
  if ((circumstancesChanged || conditionChange !== 'none') && !changeNotes) {
    throw new HttpError(422, 'change_notes_required', 'Describe what changed this week.')
  }
  return {
    overall_score: requiredInteger(value.overallScore, 1, 5, 'overallScore'),
    recovery_trend: oneOf(
      value.recoveryTrend,
      ['improved', 'stable', 'worse'] as const,
      'recoveryTrend',
    ),
    training_trend: oneOf(
      value.trainingTrend,
      ['easier', 'same', 'harder', 'not_applicable'] as const,
      'trainingTrend',
    ),
    pain_trend: oneOf(
      value.painTrend,
      ['improved', 'stable', 'worse', 'no_pain'] as const,
      'painTrend',
    ),
    circumstances_changed: circumstancesChanged,
    condition_change: conditionChange,
    change_notes: changeNotes,
    notes: optionalText(value.notes, 2000, 'notes'),
    red_flags: redFlags(value.redFlags),
  }
}
