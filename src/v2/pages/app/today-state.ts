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

/** A meal is planned, eaten (completed), or skipped; local overrides win until the server catches up. */
export type MealStatus = 'planned' | 'completed' | 'skipped'

export function mealStatus(meal: MealSlot, overrides: Record<string, MealStatus> = {}): MealStatus {
  return overrides[meal.id] ?? meal.completionStatus ?? 'planned'
}

export function mealIsCompleted(meal: MealSlot, overrides: Record<string, MealStatus> = {}) {
  return mealStatus(meal, overrides) === 'completed'
}

/** Eaten or skipped: either way the day has moved past this meal. */
export function mealIsSettled(meal: MealSlot, overrides: Record<string, MealStatus> = {}) {
  return mealStatus(meal, overrides) !== 'planned'
}

/** Only eaten meals count toward what was logged. */
export function completedMealCount(meals: MealSlot[], overrides: Record<string, MealStatus> = {}) {
  return meals.filter((meal) => mealIsCompleted(meal, overrides)).length
}

export function deriveTodaySurface(input: {
  plan: MomentumPlanView | null
  online: boolean
  today: string
  safetyLevel?: 'normal' | 'caution' | 'urgent' | null
  mealOverrides?: Record<string, MealStatus>
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
  const settled = meals.filter((meal) => mealIsSettled(meal, input.mealOverrides)).length
  const allMealsDone = meals.length > 0 && settled === meals.length
  const workoutDone = !input.plan.workout || input.workoutStatus === 'completed' || input.workoutStatus === 'stopped'
  if (allMealsDone && workoutDone) return 'completed'
  if (!input.plan.workout) return 'rest'
  if (settled > 0 || input.workoutStatus === 'in_progress' || input.workoutStatus === 'paused') return 'partial'
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

export interface PeriodPosition {
  /** 1-based day of the plan period that `today` falls on. */
  day: number
  days: number
  /** 1-based days of the period that carry a workout, where the plan lists its days. */
  trainingDays: number[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function isoDay(value: string) {
  const time = Date.parse(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(time) ? null : time / DAY_MS
}

/** Where today sits in the plan period, or null when the period is unknown or today is outside it. */
export function periodPosition(plan: MomentumPlanView, today: string): PeriodPosition | null {
  const from = plan.version?.validFrom ? isoDay(plan.version.validFrom) : null
  const to = plan.version?.validTo ? isoDay(plan.version.validTo) : null
  const now = isoDay(plan.localDate ?? today)
  if (from == null || to == null || now == null || to < from) return null
  const days = to - from + 1
  const day = now - from + 1
  if (day < 1 || day > days) return null
  const trainingDays = (plan.days ?? []).flatMap((entry) => {
    const at = isoDay(entry.localDate)
    return entry.workout && at != null && at >= from && at <= to ? [at - from + 1] : []
  })
  return { day, days, trainingDays }
}
