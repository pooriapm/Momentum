import type { AppLocale } from '../../platform/i18n/catalog'

export interface LocalizedText {
  fa: string
  en: string
}

export interface NutritionSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealChoice {
  id: string
  name: LocalizedText
  description: LocalizedText
  nutrition: NutritionSummary
  confidence: 'estimated' | 'verified' | 'usda' | 'manufacturer'
  confidenceLevel?: 'low' | 'medium' | 'high'
  nutritionSource?: 'model_estimate' | 'catalog_reference' | 'food_label' | 'verified_database' | 'user_provided'
  cookingMinutes: number
  ingredients?: Array<{ name: LocalizedText; amount: number; unit: string; note?: LocalizedText }>
  recipe?: {
    prepMinutes: number
    cookMinutes: number
    steps: LocalizedText[]
  } | null
  warnings?: LocalizedText[]
}

export interface MealSlot {
  id: string
  type?: string
  label: LocalizedText
  time: string
  selectedOptionId?: string
  completionStatus?: 'planned' | 'completed' | 'skipped'
  options: MealChoice[]
}

export interface WorkoutExerciseDetail {
  key: string
  exerciseId?: string
  name: LocalizedText
  sets: number
  reps: string
  restSeconds: number
  substitution: LocalizedText | null
  substitutionExerciseId?: string | null
  equipment?: LocalizedText[]
  adaptation?: LocalizedText | null
}

export interface WorkoutBlock {
  id: string
  name: LocalizedText
  focus: LocalizedText
  durationMinutes: number
  exercises: number
  exerciseItems: LocalizedText[]
  exerciseDetails: WorkoutExerciseDetail[]
  intensity: 'low' | 'moderate' | 'high'
  equipment?: LocalizedText[]
  warmup?: LocalizedText[]
  cooldown?: LocalizedText[]
}

export interface PlanChange {
  label: LocalizedText
  detail: LocalizedText
}

export interface PlanVersionMeta {
  id: string
  label: string
  cycle: number
  validFrom: string
  validTo: string
  readyAt?: string
  source: LocalizedText
  active?: boolean
  changes: PlanChange[]
}

export interface ShoppingGroup {
  id: string
  name: LocalizedText
  items: LocalizedText[]
}

export interface MomentumPlanDayView {
  localDate: string
  dateLabel: LocalizedText
  adjustmentReason: LocalizedText
  targets: NutritionSummary
  targetStrategy: LocalizedText
  meals: MealSlot[]
  workout: WorkoutBlock | null
}

export interface WeeklyProgressPoint {
  week: number
  workoutsCompleted: number
  workoutsPlanned: number
  mealsCompleted: number
  mealsPlanned: number
  energy: number
  adherence: number
  partial?: boolean
}

export interface MomentumPlanView {
  localDate?: string
  timezone?: string
  contentLocale?: 'fa' | 'en'
  displayUnitSystem?: 'metric' | 'us_customary'
  userName: LocalizedText
  dateLabel: LocalizedText
  monthlyPlanBrief: LocalizedText
  adjustmentReason: LocalizedText
  targets: NutritionSummary
  targetStrategy: LocalizedText
  meals: MealSlot[]
  workout: WorkoutBlock | null
  shoppingGroups: ShoppingGroup[]
  days?: MomentumPlanDayView[]
  version?: PlanVersionMeta
  history?: PlanVersionMeta[]
  progress: {
    currentWeight: number
    startWeight: number
    targetWeight: number
    weeklyAdherence: number
    readiness: number
    recovery: number
    streak: number
    loggedCalories: number
    sleepMinutes: number
    energyScore: number
    entitlementLabel?: LocalizedText
    entitlementStatus?: 'gift' | 'active' | 'pending' | 'expired' | 'none'
    entitlementPeriodEnd?: string
    productRegion?: 'ir' | 'intl'
    cycleEnding?: boolean
    safetyPaused?: boolean
    weeklySeries?: WeeklyProgressPoint[]
    recentCheckIns: Array<{
      date: LocalizedText
      score: number
      note: LocalizedText
      weight?: number
    }>
  }
}

export function localize(text: LocalizedText, locale: AppLocale) {
  return text[locale]
}
