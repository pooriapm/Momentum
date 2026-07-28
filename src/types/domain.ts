export type ISODate = `${number}-${number}-${number}`

export type MealType =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'pre_sleep'
  | 'emergency'

export type TrainingType = 'rest' | 'crossfit' | 'full_body' | 'cardio' | 'walk'

export interface Nutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface Ingredient {
  name: string
  amount: number
  unit: 'g' | 'ml' | 'piece' | 'tbsp' | 'tsp' | 'cup' | 'slice' | 'serving'
  note?: string
}

export interface MealOption {
  id: string
  title: string
  subtitle?: string
  ingredients: Ingredient[]
  nutrition: Nutrition
  preparation?: string[]
  prepTimeMinutes?: number
  portable?: boolean
  restaurantFriendly?: boolean
  tags?: string[]
  warnings?: string[]
  satietyScore?: 1 | 2 | 3 | 4 | 5
}

export interface MealSlot {
  id: string
  type: MealType
  title: string
  scheduledTime?: string
  xp: number
  required: boolean
  defaultOptionId: string
  options: MealOption[]
}

export interface DayTargets {
  calories: number
  protein: number
  carbs?: number
  fat?: number
  fiber?: number
  waterMl?: number
  steps?: number
  treadmillMinutes?: number
}

export interface PlanDay {
  date: ISODate
  label?: string
  trainingType?: TrainingType
  targets: DayTargets
  meals: MealSlot[]
  notes?: string[]
}

export interface EmergencyOption extends MealOption {
  suitableForHungerLevels: Array<1 | 2 | 3 | 4 | 5>
  minimumMinutesBeforeDinner?: number
  maximumMinutesBeforeDinner?: number
}

export interface RestaurantChoice {
  id: string
  category: string
  title: string
  orderInstructions: string[]
  estimatedNutrition: Nutrition
  rating: 1 | 2 | 3 | 4 | 5
  notes?: string[]
}

export interface ImportedProfile {
  name: string
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  startWeightKg?: number
  goalDate?: ISODate
}

export interface WeeklyMealPlan {
  schemaVersion: `2.${number}`
  planId: string
  planName: string
  planVersion: string
  generatedAt: string
  validFrom: ISODate
  validTo: ISODate
  locale: 'fa-IR'
  direction: 'rtl'
  unitSystem: 'metric'
  profile?: ImportedProfile
  author?: string
  description?: string
  defaultTargets: DayTargets
  days: PlanDay[]
  emergencyOptions: EmergencyOption[]
  restaurantGuide?: RestaurantChoice[]
  groceryList?: Array<{
    category: string
    items: Array<{
      name: string
      amount?: number
      unit?: string
      note?: string
    }>
  }>
}

export type PlanConflictResolution =
  | 'replace-conflicts'
  | 'imported-first'
  | 'existing-first'

export interface UserProfile {
  name: string
  startWeightKg: number
  currentWeightKg: number
  targetWeightKg: number
  heightCm: number
  journeyStartDate: ISODate
  goalDate: ISODate
}

export interface AppSettings {
  streakCompletionThreshold: number
  preserveRestDayStreak: boolean
  print: {
    showNutrition: boolean
    showNotes: boolean
  }
}

export interface DailyLog {
  date: ISODate
  weightKg?: number
  waistCm?: number
  sleepHours?: number
  hungerScore?: 1 | 2 | 3 | 4 | 5
  moodScore?: 1 | 2 | 3 | 4 | 5
  energyScore?: 1 | 2 | 3 | 4 | 5
  waterMl?: number
  steps?: number
  treadmillMinutes?: number
  workout?: {
    type: 'none' | 'crossfit' | 'full_body' | 'cardio' | 'walk'
    durationMinutes?: number
    activeCalories?: number
  }
  selectedMealOptions: Record<string, string>
  mealNotes?: Record<string, string>
  consumedMeals: Record<
    string,
    {
      completed: boolean
      completedAt?: string
      xpAwarded: number
      optionId?: string
      optionTitle?: string
      nutrition?: Nutrition
    }
  >
  extraFoodLogs: Array<{
    id: string
    title: string
    nutrition: Nutrition
    loggedAt: string
    source: 'emergency' | 'restaurant' | 'manual'
  }>
  adherencePercent?: number
  earnedXp: number
  checkInCompletedAt?: string
  checkInXpAwarded?: number
  notes?: string
}

export interface DailyCheckInUpdate {
  weightKg?: number
  waistCm?: number
  sleepHours?: number
  hungerScore?: 1 | 2 | 3 | 4 | 5
  moodScore?: 1 | 2 | 3 | 4 | 5
  energyScore?: 1 | 2 | 3 | 4 | 5
  waterMl?: number
  steps?: number
  treadmillMinutes?: number
  workout?: {
    type: 'none' | 'crossfit' | 'full_body' | 'cardio' | 'walk'
    durationMinutes?: number
    activeCalories?: number
  }
  adherencePercent?: number
  notes?: string
}

export interface AchievementState {
  unlockedAt: Record<string, string>
}

export interface AppState {
  storageVersion: 1
  profile: UserProfile
  settings: AppSettings
  plans: Record<string, WeeklyMealPlan>
  planPriority: string[]
  dailyLogs: Record<string, DailyLog>
  achievements: AchievementState
  metadata: {
    createdAt: string
    updatedAt: string
    lastBackupAt?: string
  }
}
