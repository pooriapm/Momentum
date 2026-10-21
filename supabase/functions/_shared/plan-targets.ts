import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { HttpError } from './http.ts'

/**
 * Daily nutrition and water targets, computed in code. The model never invents these numbers;
 * it only picks catalog foods and the server scales portions to hit them.
 *
 * Energy: Mifflin-St Jeor BMR x activity factor (from the user's training schedule), adjusted for
 * the goal, never below the sex floor (1200 kcal, 1500 kcal for men) or the BMR during fat loss.
 * Macros: protein per kg (adjusted weight above BMI 30), fat share with a per-kg minimum, carbs
 * fill the rest. Water: per-kg base plus training and hot-climate allowances.
 */
export const TARGETS_VERSION = 'momentum-targets/1.0.0'

/** Same floor the deterministic starter and assertGeneratedPlan enforce. */
export const MINIMUM_DAILY_CALORIES = 1_200
export const MINIMUM_DAILY_CALORIES_MALE = 1_500
const MAXIMUM_DAILY_CALORIES = 4_500

export type TargetGoal = 'fat_loss' | 'muscle_gain' | 'maintenance'
export type ClimateBand = 'temperate' | 'hot_season' | 'tropical'

export interface NutritionTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface PlanTargets extends NutritionTargets {
  version: typeof TARGETS_VERSION
  bmr_kcal: number
  tdee_kcal: number
  activity_factor: number
  goal: TargetGoal
  weekly_training_minutes: number
  climate: ClimateBand
  water_ml_rest_day: number
  water_ml_training_day: number
  /** Which safety clamps changed the raw numbers, for the audit trail. */
  adjustments: string[]
}

export interface TargetInputs {
  sex: string | null
  ageYears: number | null
  heightCm: number | null
  weightKg: number | null
  goalType: string | null
  /** Distinct training weekdays per week (0-7). */
  trainingDaysPerWeek: number
  /** Planned minutes per session; null when unknown. */
  sessionMinutes: number | null
  countryCode: string | null
  /** Month the plan starts (1-12), for the climate allowance. */
  month: number
}

function round(value: number, step: number): number {
  return Math.round(value / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeGoal(goalType: string | null | undefined): TargetGoal {
  if (goalType === 'fat_loss' || goalType === 'weight_loss') return 'fat_loss'
  if (goalType === 'muscle_gain') return 'muscle_gain'
  return 'maintenance'
}

/** Mifflin-St Jeor. Undisclosed sex uses the midpoint of the male (+5) and female (-161) terms. */
export function mifflinStJeorBmr(input: {
  sex: string | null
  ageYears: number
  heightCm: number
  weightKg: number
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears
  if (input.sex === 'male') return base + 5
  if (input.sex === 'female') return base - 161
  return base - 78
}

/**
 * Activity factor from planned weekly training minutes. Onboarding has no job-activity question,
 * so the lifestyle baseline is sedentary (1.2) and training moves it up the standard PAL steps.
 */
export function activityFactor(weeklyTrainingMinutes: number): number {
  if (weeklyTrainingMinutes <= 0) return 1.2
  if (weeklyTrainingMinutes <= 90) return 1.3
  if (weeklyTrainingMinutes <= 180) return 1.375
  if (weeklyTrainingMinutes <= 300) return 1.55
  return 1.725
}

const DEFAULT_SESSION_MINUTES = 45

export function weeklyTrainingMinutes(daysPerWeek: number, sessionMinutes: number | null): number {
  const days = clamp(Math.floor(daysPerWeek), 0, 7)
  const minutes = clamp(sessionMinutes ?? DEFAULT_SESSION_MINUTES, 10, 180)
  return days * minutes
}

// Countries with a hot season (northern hemisphere: May-Sep; southern: Nov-Mar) and year-round
// tropical climates. Country level only: we never ask for the city.
const HOT_SEASON_NORTH = new Set([
  'IR', 'IQ', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'JO', 'SY', 'LB', 'IL', 'PS', 'EG', 'LY',
  'TN', 'DZ', 'MA', 'SD', 'PK', 'AF', 'IN', 'TM', 'UZ', 'TJ', 'AZ', 'TR', 'CY', 'GR', 'ES', 'PT',
  'IT', 'MX', 'US',
])
const HOT_SEASON_SOUTH = new Set(['AU', 'ZA', 'AR', 'CL', 'UY', 'PY', 'BW', 'NA'])
const TROPICAL = new Set([
  'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'KH', 'LA', 'MM', 'BD', 'LK', 'NG', 'GH', 'KE', 'TZ', 'UG',
  'CI', 'SN', 'CM', 'BR', 'CO', 'VE', 'EC', 'PE', 'PA', 'CR', 'CU', 'DO', 'JM',
])

export function climateBand(countryCode: string | null, month: number): ClimateBand {
  const country = (countryCode ?? '').toUpperCase()
  if (TROPICAL.has(country)) return 'tropical'
  if (HOT_SEASON_NORTH.has(country) && month >= 5 && month <= 9) return 'hot_season'
  if (HOT_SEASON_SOUTH.has(country) && (month >= 11 || month <= 3)) return 'hot_season'
  return 'temperate'
}

/**
 * Water per day: 35 ml/kg (30 ml/kg from age 55), +500 ml per training hour on training days,
 * +500 ml in a hot season or +300 ml in the tropics. Clamped to 1.5-4.5 l, rounded to 50 ml.
 */
export function waterTargets(input: {
  weightKg: number
  ageYears: number
  sessionMinutes: number | null
  trainingDaysPerWeek: number
  climate: ClimateBand
}): { restDay: number; trainingDay: number } {
  const perKg = input.ageYears >= 55 ? 30 : 35
  const climateBonus = input.climate === 'hot_season' ? 500 : input.climate === 'tropical' ? 300 : 0
  const base = input.weightKg * perKg + climateBonus
  const session = input.trainingDaysPerWeek > 0
    ? clamp(input.sessionMinutes ?? DEFAULT_SESSION_MINUTES, 10, 180)
    : 0
  const trainingBonus = (session / 60) * 500
  const restDay = round(clamp(base, 1_500, 4_500), 50)
  const trainingDay = round(clamp(base + trainingBonus, 1_500, 4_500), 50)
  return { restDay, trainingDay }
}

function requirePositive(value: number | null, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(422, 'TARGETS_INPUT_MISSING', `Target input is missing: ${field}`)
  }
  return value
}

export function computePlanTargets(input: TargetInputs): PlanTargets {
  const ageYears = requirePositive(input.ageYears, 'age', 18, 100)
  const heightCm = requirePositive(input.heightCm, 'height', 120, 230)
  const weightKg = requirePositive(input.weightKg, 'weight', 35, 350)
  const goal = normalizeGoal(input.goalType)
  const adjustments: string[] = []

  const bmr = mifflinStJeorBmr({ sex: input.sex, ageYears, heightCm, weightKg })
  const minutes = weeklyTrainingMinutes(input.trainingDaysPerWeek, input.sessionMinutes)
  const factor = activityFactor(minutes)
  const tdee = bmr * factor

  let calories = tdee
  if (goal === 'fat_loss') calories = tdee - Math.min(tdee * 0.2, 750)
  if (goal === 'muscle_gain') calories = tdee + Math.min(tdee * 0.1, 350)

  const sexFloor = input.sex === 'male' ? MINIMUM_DAILY_CALORIES_MALE : MINIMUM_DAILY_CALORIES
  if (calories < sexFloor) {
    calories = sexFloor
    adjustments.push(`calorie_floor_${sexFloor}`)
  }
  if (goal === 'fat_loss' && calories < bmr) {
    calories = bmr
    adjustments.push('calorie_floor_bmr')
  }
  if (calories > MAXIMUM_DAILY_CALORIES) {
    calories = MAXIMUM_DAILY_CALORIES
    adjustments.push('calorie_ceiling')
  }
  calories = round(calories, 10)

  // Protein is dosed on an adjusted weight above BMI 30 so large bodies don't get extreme grams.
  const bmi = weightKg / (heightCm / 100) ** 2
  const referenceWeight = bmi > 30 ? 27.5 * (heightCm / 100) ** 2 : weightKg
  if (bmi > 30) adjustments.push('protein_adjusted_weight')
  let proteinPerKg = goal === 'maintenance' ? (minutes >= 150 ? 1.6 : 1.4) : 1.8
  if (ageYears >= 65) proteinPerKg = Math.max(proteinPerKg, 1.2)
  let protein = Math.min(referenceWeight * proteinPerKg, (calories * 0.35) / 4)
  let fat = Math.min(Math.max(referenceWeight * 0.6, (calories * 0.25) / 9), (calories * 0.35) / 9)
  let carbs = (calories - protein * 4 - fat * 9) / 4

  // Keep at least ~100 g carbohydrate: trim fat to its floor first, then protein to 1.2 g/kg.
  if (carbs < 100) {
    fat = Math.max(referenceWeight * 0.5, (calories * 0.2) / 9)
    carbs = (calories - protein * 4 - fat * 9) / 4
    if (carbs < 100) {
      protein = Math.min(protein, Math.max(referenceWeight * 1.2, (calories - fat * 9 - 400) / 4))
      carbs = (calories - protein * 4 - fat * 9) / 4
    }
    adjustments.push('carb_minimum')
  }
  carbs = Math.max(carbs, 50)

  const fiber = clamp(round((calories / 1000) * 14, 1), 20, 40)
  const climate = climateBand(input.countryCode, input.month)
  const water = waterTargets({
    weightKg,
    ageYears,
    sessionMinutes: input.sessionMinutes,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
    climate,
  })

  return {
    version: TARGETS_VERSION,
    bmr_kcal: Math.round(bmr),
    tdee_kcal: Math.round(tdee),
    activity_factor: factor,
    goal,
    weekly_training_minutes: minutes,
    climate,
    calories,
    protein_g: Math.round(protein),
    carbs_g: Math.round(carbs),
    fat_g: Math.round(fat),
    fiber_g: fiber,
    water_ml_rest_day: water.restDay,
    water_ml_training_day: water.trainingDay,
    adjustments,
  }
}

/** Current weight: newest confirmed measurement, else the onboarding start weight. */
export function currentWeightKg(snapshot: GenerationProfileSnapshot): number | null {
  const measured = snapshot.confirmed_measurements.find((item) =>
    typeof item.weight_kg === 'number'
  )
  return measured?.weight_kg ?? snapshot.goal?.start_weight_kg ?? null
}

export function trainingDaysPerWeek(snapshot: GenerationProfileSnapshot): number {
  return new Set(
    snapshot.training_schedule
      .filter((item) => item.activity_type !== 'rest')
      .map((item) => item.weekday),
  ).size
}

export function sessionMinutes(snapshot: GenerationProfileSnapshot): number | null {
  const minutes = snapshot.training_schedule
    .map((item) => item.duration_minutes)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  return minutes.length ? Math.max(...minutes) : null
}

export function targetInputsFromSnapshot(
  snapshot: GenerationProfileSnapshot,
  startsOn: Date,
): TargetInputs {
  return {
    sex: snapshot.sex,
    ageYears: snapshot.age_years,
    heightCm: snapshot.height_cm,
    weightKg: currentWeightKg(snapshot),
    goalType: snapshot.goal?.goal_type ?? null,
    trainingDaysPerWeek: trainingDaysPerWeek(snapshot),
    sessionMinutes: sessionMinutes(snapshot),
    countryCode: snapshot.country_code,
    month: startsOn.getUTCMonth() + 1,
  }
}
