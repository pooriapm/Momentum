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

export { formatLastSync }
