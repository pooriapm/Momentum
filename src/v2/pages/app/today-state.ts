import type { AppLocale } from '../../../platform/i18n/catalog'
import type { MealSlot, MomentumPlanView } from '../../data/types'

export const TODAY_GENERATION_WAIT_MS = 3 * 60 * 1000
export const TODAY_LAST_SYNC_KEY = 'momentum.today.lastSyncAt'

export type TodaySurface =
  | 'active'
  | 'rest'
  | 'no-plan'
  | 'preparing'
  | 'completed'
  | 'partial'
  | 'offline'
  | 'stale'
  | 'load-error'
  | 'safety'

export type WorkoutRunStatus = 'idle' | 'in_progress' | 'paused' | 'completed' | 'stopped'

export function mealIsCompleted(meal: MealSlot, overrides: Record<string, boolean> = {}) {
  if (meal.id in overrides) return overrides[meal.id]
  return meal.completionStatus === 'completed'
}

export function completedMealCount(meals: MealSlot[], overrides: Record<string, boolean> = {}) {
  return meals.filter((meal) => mealIsCompleted(meal, overrides)).length
}

export function deriveTodaySurface(input: {
  plan: MomentumPlanView | null
  online: boolean
  today: string
  safetyLevel?: 'normal' | 'caution' | 'urgent' | null
  mealOverrides?: Record<string, boolean>
  workoutStatus?: WorkoutRunStatus
  loadError?: boolean
  preparing?: boolean
}): TodaySurface {
  if (input.preparing) return 'preparing'
  if (input.loadError) return 'load-error'
  if (!input.plan) return 'no-plan'
  if (input.safetyLevel === 'caution' || input.safetyLevel === 'urgent') return 'safety'
  if (!input.online) return 'offline'
  if (input.plan.localDate && input.plan.localDate !== input.today) return 'stale'

  const meals = input.plan.meals
  const completed = completedMealCount(meals, input.mealOverrides)
  const allMealsDone = meals.length > 0 && completed === meals.length
  const workoutDone = !input.plan.workout || input.workoutStatus === 'completed' || input.workoutStatus === 'stopped'
  if (allMealsDone && workoutDone) return 'completed'
  if (!input.plan.workout) return 'rest'
  if (completed > 0 || input.workoutStatus === 'in_progress' || input.workoutStatus === 'paused') return 'partial'
  return 'active'
}

export function formatLastSync(iso: string | undefined, locale: AppLocale) {
  if (!iso) return locale === 'fa' ? 'نامشخص' : 'unknown'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return locale === 'fa' ? 'نامشخص' : 'unknown'
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-GB', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(parsed)
}

export function readStoredLastSync() {
  try {
    return sessionStorage.getItem(TODAY_LAST_SYNC_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function writeStoredLastSync(iso = new Date().toISOString()) {
  try {
    sessionStorage.setItem(TODAY_LAST_SYNC_KEY, iso)
  } catch {
    /* private mode */
  }
}

export const generationWaitLines = {
  fa: [
    'در حال خواندن هدف و برنامه تمرینی‌ات…',
    'در حال چیدن تمرین‌های یک ماه…',
    'در حال چیدن وعده‌های غذایی…',
    'در حال بررسی ایمنی غذا و حرکت…',
    'تقریباً آماده است…',
  ],
  en: [
    'Reading your goal and training setup…',
    'Laying out one month of workouts…',
    'Laying out the meals for the month…',
    'Checking food and movement safety…',
    'Almost ready…',
  ],
} as const
