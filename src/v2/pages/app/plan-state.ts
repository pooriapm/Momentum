import type { AppLocale } from '../../../platform/i18n/catalog'
import type {
  LocalizedText,
  MomentumPlanDayView,
  MomentumPlanView,
  PlanVersionMeta,
} from '../../data/types'
import { formatLastSync, readStoredLastSync, writeStoredLastSync } from './today-state'

export type PlanSegment = 'week' | 'nutrition' | 'training' | 'grocery' | 'calendar'
export type PlanSurface = 'ready' | 'empty' | 'loading' | 'offline' | 'stale' | 'error'

export const PLAN_SHOPPING_KEY = 'momentum.plan.shoppingChecks'
export const PLAN_SEGMENTS: PlanSegment[] = ['week', 'nutrition', 'training', 'grocery', 'calendar']

export { formatLastSync, readStoredLastSync, writeStoredLastSync }

export function derivePlanSurface(input: {
  plan: MomentumPlanView | null
  online: boolean
  today: string
  loading?: boolean
  loadError?: boolean
}): PlanSurface {
  if (input.loading) return 'loading'
  if (input.loadError) return 'error'
  if (!input.plan) return 'empty'
  if (!input.online) return 'offline'
  if (input.plan.localDate && input.plan.localDate !== input.today) return 'stale'
  return 'ready'
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function dateToIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isoToDate(iso: string) {
  return new Date(`${iso}T12:00:00`)
}

export function startOfWeekIso(iso: string, locale: AppLocale) {
  const date = isoToDate(iso)
  const weekday = date.getDay()
  const weekStart = locale === 'fa' ? 6 : 0
  date.setDate(date.getDate() - ((weekday - weekStart + 7) % 7))
  return dateToIso(date)
}

export function weekIsoDates(iso: string, locale: AppLocale) {
  const start = isoToDate(startOfWeekIso(iso, locale))
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start)
    next.setDate(start.getDate() + index)
    return dateToIso(next)
  })
}

export function planDays(plan: MomentumPlanView): MomentumPlanDayView[] {
  if (plan.days?.length) return plan.days
  return [{
    localDate: plan.localDate ?? dateToIso(new Date()),
    dateLabel: plan.dateLabel,
    adjustmentReason: plan.adjustmentReason,
    targets: plan.targets,
    targetStrategy: plan.targetStrategy,
    meals: plan.meals,
    workout: plan.workout,
  }]
}

export function planWeeks(days: MomentumPlanDayView[]) {
  const weeks: MomentumPlanDayView[][] = []
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7))
  return weeks
}

export function resolvePlanVersion(plan: MomentumPlanView): PlanVersionMeta {
  if (plan.version) return plan.version
  const days = planDays(plan)
  const validFrom = days[0]?.localDate ?? plan.localDate ?? ''
  const validTo = days.at(-1)?.localDate ?? validFrom
  return {
    id: 'active',
    label: 'v1',
    cycle: 1,
    validFrom,
    validTo,
    source: plan.monthlyPlanBrief,
    active: true,
    changes: [],
  }
}

export function resolvePlanHistory(plan: MomentumPlanView): PlanVersionMeta[] {
  if (plan.history?.length) return plan.history
  return [resolvePlanVersion(plan)]
}

export function isWithinInterval(iso: string, from: string, to: string) {
  return Boolean(from && to && iso >= from && iso <= to)
}

export function shoppingPlanKey(plan: MomentumPlanView) {
  return plan.version?.id ?? plan.localDate ?? 'active-plan'
}

export function readShoppingChecks(planKey: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAN_SHOPPING_KEY) ?? '{}') as Record<string, string[]>
    return new Set(parsed[planKey] ?? [])
  } catch {
    return new Set()
  }
}

export function writeShoppingChecks(planKey: string, checks: Set<string>) {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAN_SHOPPING_KEY) ?? '{}') as Record<string, string[]>
    parsed[planKey] = [...checks]
    localStorage.setItem(PLAN_SHOPPING_KEY, JSON.stringify(parsed))
  } catch {
    /* private mode */
  }
}

export function groceryShareText(groups: MomentumPlanView['shoppingGroups'], localize: (text: LocalizedText) => string) {
  return groups
    .map((group) => [localize(group.name), ...group.items.map((item) => `• ${localize(item)}`)].join('\n'))
    .join('\n\n')
}

export function weekdayLabels(locale: AppLocale) {
  return locale === 'fa'
    ? ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
}

export function formatPlanInterval(from: string, to: string, locale: AppLocale) {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const formatter = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', options)
  if (!from || !to) return locale === 'fa' ? 'بازه نامشخص' : 'Unknown interval'
  return `${formatter.format(isoToDate(from))} – ${formatter.format(isoToDate(to))}`
}

export function formatReadyAt(iso: string | undefined, locale: AppLocale) {
  if (!iso) return locale === 'fa' ? 'نامشخص' : 'unknown'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {
        day: 'numeric',
        month: 'short',
      }).format(isoToDate(iso))
    }
    return locale === 'fa' ? 'نامشخص' : 'unknown'
  }
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-GB', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(parsed)
}
