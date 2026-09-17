/**
 * Versioned, minimized generation context for monthly plan provider calls.
 * Excludes display name, email, and raw identifying free text.
 * Body-composition PDFs are out of scope; only confirmed structured measurements.
 */
export const PROFILE_SNAPSHOT_VERSION = 'momentum-profile-snapshot/1.1.0'

export type SnapshotLocale = 'fa-IR' | 'en-US'
export type ProductRegion = 'ir' | 'intl'
export type BudgetTier = 'low' | 'medium' | 'high' | 'custom'

export interface ConfirmedMeasurement {
  measured_on: string
  weight_kg: number | null
  body_fat_percent: number | null
  waist_cm: number | null
  hip_cm: number | null
  source: 'manual' | 'device' | 'clinician' | 'other'
}

export interface GoalSnapshot {
  goal_type: string
  start_weight_kg: number | null
  target_weight_kg: number | null
  target_date: string | null
}

export interface DietarySnapshot {
  dietary_pattern: string | null
  favorite_foods: string[]
  disliked_foods: string[]
  allergies: string[]
  requested_meal_pattern: string | null
  preferred_option_count: number | null
  cooking_constraints: string[]
  available_equipment: string[]
  work_schedule: string | null
  budget_tier: BudgetTier
  restaurant_meals_per_week: number | null
  restaurant_preferences: string[]
  grocery_preferences: string[]
  cuisine_region: string | null
}

export interface TrainingProfileSnapshot {
  location: 'home' | 'gym' | 'outdoor' | null
  experience: 'beginner' | 'intermediate' | 'advanced' | null
}

export interface TrainingItemSnapshot {
  weekday: number
  activity_type: string
  local_start_time: string | null
  duration_minutes: number | null
  intensity: string | null
  availability_note: string | null
}

export interface SafetySnapshot {
  /** Structured exclusion / consideration codes only — no free-text PII. */
  medical_considerations: string[]
  medications_present: boolean
  supplements_present: boolean
}

export interface PriorOutcomeSnapshot {
  cycle_index: number
  adherence_workout_pct: number | null
  adherence_meal_pct: number | null
  avg_energy: number | null
  avg_sleep: number | null
  avg_training_difficulty: number | null
  weight_trend_kg: number | null
  next_cycle_note: string | null
}

export interface GenerationProfileSnapshot {
  snapshot_version: typeof PROFILE_SNAPSHOT_VERSION
  locale: SnapshotLocale
  timezone: string
  country_code: string | null
  product_region: ProductRegion
  age_years: number | null
  sex: string | null
  height_cm: number | null
  goal: GoalSnapshot | null
  dietary: DietarySnapshot
  training_profile: TrainingProfileSnapshot
  training_schedule: TrainingItemSnapshot[]
  safety: SafetySnapshot
  confirmed_measurements: ConfirmedMeasurement[]
  prior_outcomes: PriorOutcomeSnapshot | null
  cycle_index: number
}

export interface ProfileSnapshotRows {
  profile: {
    date_of_birth?: string | null
    sex?: string | null
    height_cm?: number | null
    locale?: string | null
    timezone?: string | null
    country_code?: string | null
    product_region?: string | null
  }
  goal?: {
    goal_type?: string | null
    start_weight_kg?: number | null
    target_weight_kg?: number | null
    target_date?: string | null
  } | null
  dietary?: {
    dietary_pattern?: string | null
    favorite_foods?: unknown
    disliked_foods?: unknown
    allergies?: unknown
    requested_meal_pattern?: string | null
    preferred_option_count?: number | null
    cooking_constraints?: unknown
    available_equipment?: unknown
    work_schedule?: string | null
    budget_tier?: string | null
    restaurant_meals_per_week?: number | null
    restaurant_preferences?: unknown
    grocery_preferences?: unknown
    cuisine_region?: string | null
    training_location?: string | null
    training_experience?: string | null
  } | null
  health?: {
    medical_considerations?: unknown
    medications?: unknown
    supplements?: unknown
  } | null
  training?:
    | Array<{
      weekday?: number | null
      activity_type?: string | null
      local_start_time?: string | null
      duration_minutes?: number | null
      intensity?: string | null
      notes?: string | null
    }>
    | null
  measurements?:
    | Array<{
      measured_on?: string | null
      measured_at?: string | null
      weight_kg?: number | null
      body_fat_percent?: number | null
      waist_cm?: number | null
      hip_cm?: number | null
      source?: string | null
      extraction_status?: string | null
    }>
    | null
  priorOutcomes?: PriorOutcomeSnapshot | null
  cycleIndex: number
  now?: Date
}

function stringList(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 120))
    .slice(0, max)
}

function ageFromDob(dob: string | null | undefined, now: Date): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const birth = new Date(`${dob}T00:00:00Z`)
  if (Number.isNaN(birth.getTime())) return null
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  if (
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1
  }
  if (age < 18 || age > 100) return null
  return age
}

function budgetTier(value: string | null | undefined): BudgetTier {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'custom') {
    return value
  }
  return 'medium'
}

function truncateNote(value: string | null | undefined, max = 500): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function buildGenerationProfileSnapshot(
  rows: ProfileSnapshotRows,
): GenerationProfileSnapshot {
  const now = rows.now ?? new Date()
  const locale = rows.profile.locale === 'fa-IR' ? 'fa-IR' : 'en-US'
  const dietary = rows.dietary ?? {}
  const health = rows.health ?? {}
  const medications = stringList(health.medications, 20)
  const supplements = stringList(health.supplements, 20)

  const confirmed = (rows.measurements ?? [])
    .filter((row) =>
      row.extraction_status === 'confirmed' || row.extraction_status === 'not_requested'
    )
    .slice(0, 3)
    .map((row) => {
      const measuredOn = typeof row.measured_on === 'string'
        ? row.measured_on
        : typeof row.measured_at === 'string'
        ? row.measured_at.slice(0, 10)
        : ''
      return {
        measured_on: measuredOn,
        weight_kg: typeof row.weight_kg === 'number' ? row.weight_kg : null,
        body_fat_percent: typeof row.body_fat_percent === 'number' ? row.body_fat_percent : null,
        waist_cm: typeof row.waist_cm === 'number' ? row.waist_cm : null,
        hip_cm: typeof row.hip_cm === 'number' ? row.hip_cm : null,
        source: (['manual', 'device', 'clinician', 'other'].includes(String(row.source))
          ? row.source
          : 'manual') as ConfirmedMeasurement['source'],
      }
    })
    .filter((row) => row.measured_on)

  return {
    snapshot_version: PROFILE_SNAPSHOT_VERSION,
    locale,
    timezone: typeof rows.profile.timezone === 'string' && rows.profile.timezone
      ? rows.profile.timezone
      : 'UTC',
    country_code: typeof rows.profile.country_code === 'string' ? rows.profile.country_code : null,
    product_region: rows.profile.product_region === 'ir' ? 'ir' : 'intl',
    age_years: ageFromDob(rows.profile.date_of_birth, now),
    sex: typeof rows.profile.sex === 'string' ? rows.profile.sex : null,
    height_cm: typeof rows.profile.height_cm === 'number' ? rows.profile.height_cm : null,
    goal: rows.goal
      ? {
        goal_type: String(rows.goal.goal_type ?? 'general_wellness'),
        start_weight_kg: typeof rows.goal.start_weight_kg === 'number'
          ? rows.goal.start_weight_kg
          : null,
        target_weight_kg: typeof rows.goal.target_weight_kg === 'number'
          ? rows.goal.target_weight_kg
          : null,
        target_date: typeof rows.goal.target_date === 'string' ? rows.goal.target_date : null,
      }
      : null,
    dietary: {
      dietary_pattern: typeof dietary.dietary_pattern === 'string' ? dietary.dietary_pattern : null,
      favorite_foods: stringList(dietary.favorite_foods),
      disliked_foods: stringList(dietary.disliked_foods),
      allergies: stringList(dietary.allergies),
      requested_meal_pattern: typeof dietary.requested_meal_pattern === 'string'
        ? dietary.requested_meal_pattern.slice(0, 500)
        : null,
      preferred_option_count: typeof dietary.preferred_option_count === 'number'
        ? dietary.preferred_option_count
        : null,
      cooking_constraints: stringList(dietary.cooking_constraints),
      available_equipment: stringList(dietary.available_equipment),
      work_schedule: typeof dietary.work_schedule === 'string'
        ? dietary.work_schedule.slice(0, 500)
        : null,
      budget_tier: budgetTier(dietary.budget_tier),
      restaurant_meals_per_week: typeof dietary.restaurant_meals_per_week === 'number'
        ? dietary.restaurant_meals_per_week
        : null,
      restaurant_preferences: stringList(dietary.restaurant_preferences),
      grocery_preferences: stringList(dietary.grocery_preferences),
      cuisine_region: typeof dietary.cuisine_region === 'string' ? dietary.cuisine_region : null,
    },
    training_profile: {
      location:
        (['home', 'gym', 'outdoor'].includes(String(dietary.training_location))
          ? dietary.training_location
          : null) as TrainingProfileSnapshot['location'],
      experience:
        (['beginner', 'intermediate', 'advanced'].includes(String(dietary.training_experience))
          ? dietary.training_experience
          : null) as TrainingProfileSnapshot['experience'],
    },
    training_schedule: (rows.training ?? [])
      .filter((item) => typeof item.weekday === 'number' && typeof item.activity_type === 'string')
      .slice(0, 14)
      .map((item) => ({
        weekday: Number(item.weekday),
        activity_type: String(item.activity_type),
        local_start_time: typeof item.local_start_time === 'string' ? item.local_start_time : null,
        duration_minutes: typeof item.duration_minutes === 'number' ? item.duration_minutes : null,
        intensity: typeof item.intensity === 'string' ? item.intensity : null,
        availability_note: truncateNote(item.notes, 500),
      })),
    safety: {
      medical_considerations: stringList(health.medical_considerations, 30),
      medications_present: medications.length > 0,
      supplements_present: supplements.length > 0,
    },
    confirmed_measurements: confirmed,
    prior_outcomes: rows.priorOutcomes
      ? {
        ...rows.priorOutcomes,
        next_cycle_note: truncateNote(rows.priorOutcomes.next_cycle_note, 500),
      }
      : null,
    cycle_index: rows.cycleIndex,
  }
}

/** Compact prompt payload — semantic goals, not DB IDs; no email/name. */
export function profileSnapshotPromptContext(
  snapshot: GenerationProfileSnapshot,
): Record<string, unknown> {
  return {
    snapshot_version: snapshot.snapshot_version,
    locale: snapshot.locale,
    timezone: snapshot.timezone,
    country_code: snapshot.country_code,
    product_region: snapshot.product_region,
    age_years: snapshot.age_years,
    sex: snapshot.sex,
    height_cm: snapshot.height_cm,
    goal: snapshot.goal,
    dietary: snapshot.dietary,
    training_profile: snapshot.training_profile,
    training_schedule: snapshot.training_schedule,
    safety: snapshot.safety,
    confirmed_measurements: snapshot.confirmed_measurements,
    prior_outcomes: snapshot.prior_outcomes,
    cycle_index: snapshot.cycle_index,
  }
}

export function emptyDietarySnapshot(): DietarySnapshot {
  return {
    dietary_pattern: null,
    favorite_foods: [],
    disliked_foods: [],
    allergies: [],
    requested_meal_pattern: null,
    preferred_option_count: null,
    cooking_constraints: [],
    available_equipment: [],
    work_schedule: null,
    budget_tier: 'medium',
    restaurant_meals_per_week: null,
    restaurant_preferences: [],
    grocery_preferences: [],
    cuisine_region: null,
  }
}
