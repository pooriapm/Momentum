import type { MomentumPlanView, WeeklyProgressPoint } from '../../data/types'
import { formatLastSync } from './today-state'

export type ProgressSurface = 'loading' | 'overview' | 'empty' | 'offline' | 'stale' | 'load-error'
export type ProgressChartView = 'chart' | 'text' | 'table'

export function progressHasInsufficientData(plan: MomentumPlanView | null) {
  if (!plan) return true
  if (plan.progress.weeklySeries && plan.progress.weeklySeries.length > 0) return false
  return plan.progress.recentCheckIns.length === 0 && plan.progress.weeklyAdherence === 0
}

export function resolveWeeklySeries(plan: MomentumPlanView | null): WeeklyProgressPoint[] {
  if (plan?.progress.weeklySeries?.length) return plan.progress.weeklySeries
  return []
}

export function deriveProgressSurface(input: {
  plan: MomentumPlanView | null
  online: boolean
  today: string
  loading?: boolean
  loadError?: boolean
}): ProgressSurface {
  if (input.loading) return 'loading'
  if (input.loadError) return 'load-error'
  if (progressHasInsufficientData(input.plan)) return 'empty'
  if (!input.online) return 'offline'
  if (input.plan?.localDate && input.plan.localDate !== input.today) return 'stale'
  return 'overview'
}

export function currentWeekIndex(series: WeeklyProgressPoint[]) {
  const partial = series.findIndex((item) => item.partial)
  if (partial >= 0) return partial
  return Math.max(0, series.length - 1)
}

export function completionRate(completed: number, planned: number) {
  if (planned <= 0) return 0
  return Math.round((100 * completed) / planned)
}

export interface WeekComparison {
  week: number
  partial: boolean
  adherence: number
  adherenceDelta: number | null
  meals: number
  mealsDelta: number | null
  workouts: number
  workoutsDelta: number | null
  energy: number
  energyDelta: number | null
  mealsCompleted: number
  mealsPlanned: number
  workoutsCompleted: number
  workoutsPlanned: number
}

export function compareWeeks(series: WeeklyProgressPoint[]): WeekComparison[] {
  return series.map((item, index) => {
    const previous = index > 0 ? series[index - 1] : null
    const meals = completionRate(item.mealsCompleted, item.mealsPlanned)
    const workouts = completionRate(item.workoutsCompleted, item.workoutsPlanned)
    const previousMeals = previous ? completionRate(previous.mealsCompleted, previous.mealsPlanned) : null
    const previousWorkouts = previous ? completionRate(previous.workoutsCompleted, previous.workoutsPlanned) : null
    return {
      week: item.week,
      partial: Boolean(item.partial),
      adherence: item.adherence,
      adherenceDelta: previous ? item.adherence - previous.adherence : null,
      meals,
      mealsDelta: previousMeals === null ? null : meals - previousMeals,
      workouts,
      workoutsDelta: previousWorkouts === null ? null : workouts - previousWorkouts,
      energy: item.energy,
      energyDelta: previous ? Math.round((item.energy - previous.energy) * 10) / 10 : null,
      mealsCompleted: item.mealsCompleted,
      mealsPlanned: item.mealsPlanned,
      workoutsCompleted: item.workoutsCompleted,
      workoutsPlanned: item.workoutsPlanned,
    }
  })
}

export { formatLastSync }
