import type { MomentumPlanView, WeeklyProgressPoint } from '../../data/types'
import { formatLastSync } from './today-state'

export type ProgressSurface = 'loading' | 'overview' | 'empty' | 'offline' | 'stale' | 'load-error'
export type ProgressChartView = 'chart' | 'text' | 'table'

export const DEFAULT_WEEKLY_SERIES: WeeklyProgressPoint[] = [
  { week: 1, workoutsCompleted: 2, workoutsPlanned: 3, mealsCompleted: 21, mealsPlanned: 28, energy: 6.8, adherence: 62 },
  { week: 2, workoutsCompleted: 3, workoutsPlanned: 3, mealsCompleted: 23, mealsPlanned: 28, energy: 7.1, adherence: 78 },
  { week: 3, workoutsCompleted: 3, workoutsPlanned: 3, mealsCompleted: 25, mealsPlanned: 28, energy: 7.4, adherence: 86 },
  { week: 4, workoutsCompleted: 1, workoutsPlanned: 3, mealsCompleted: 5, mealsPlanned: 28, energy: 7, adherence: 18, partial: true },
]

export function progressHasInsufficientData(plan: MomentumPlanView | null) {
  if (!plan) return true
  if (plan.progress.weeklySeries && plan.progress.weeklySeries.length > 0) return false
  return plan.progress.recentCheckIns.length === 0 && plan.progress.weeklyAdherence === 0
}

export function resolveWeeklySeries(plan: MomentumPlanView | null): WeeklyProgressPoint[] {
  if (plan?.progress.weeklySeries?.length) return plan.progress.weeklySeries
  if (progressHasInsufficientData(plan)) return []
  return DEFAULT_WEEKLY_SERIES
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

export { formatLastSync }
