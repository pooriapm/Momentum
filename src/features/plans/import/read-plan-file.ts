import { APP_CONFIG } from '../../../config/app'
import { getTodayIso } from '../../../lib/dates/jalali'
import type { ISODate, WeeklyMealPlan } from '../../../types/domain'
import {
  validateWeeklyMealPlan,
  type PlanValidationResult,
} from '../validation/weekly-plan-schema'
import {
  getPlanImportAdapter,
  getSupportedPlanExtensions,
} from './adapters/registry'
import { PlanImportAdapterError } from './adapters/types'

export const MAX_PLAN_FILE_BYTES = APP_CONFIG.planFile.maxBytes

export interface PlanFileResult extends PlanValidationResult {
  fileName?: string
}

function addIsoDays(date: ISODate, amount: number): ISODate {
  const [year, month, day] = date.split('-').map(Number)
  const nextDate = new Date(Date.UTC(year, month - 1, day))
  nextDate.setUTCDate(nextDate.getUTCDate() + amount)
  return nextDate.toISOString().slice(0, 10) as ISODate
}

function differenceInIsoDays(from: ISODate, to: ISODate) {
  const fromDate = new Date(`${from}T00:00:00Z`)
  const toDate = new Date(`${to}T00:00:00Z`)
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000)
}

export function rebaseSamplePlanToToday(
  plan: WeeklyMealPlan,
  today: ISODate = getTodayIso(),
): WeeklyMealPlan {
  const originalStart = plan.validFrom

  return {
    ...plan,
    generatedAt: `${today}T08:00:00Z`,
    validFrom: today,
    validTo: addIsoDays(
      today,
      differenceInIsoDays(originalStart, plan.validTo),
    ),
    profile: {
      ...plan.profile,
      goalDate: addIsoDays(today, 90),
      bodyComposition: plan.profile.bodyComposition
        ? {
            ...plan.profile.bodyComposition,
            measuredAt: addIsoDays(today, -1),
          }
        : undefined,
    },
    days: plan.days.map((day) => ({
      ...day,
      date: addIsoDays(
        today,
        differenceInIsoDays(originalStart, day.date),
      ),
    })),
  }
}

export async function readPlanFile(file: File): Promise<PlanFileResult> {
  const adapter = getPlanImportAdapter(file)

  if (!adapter) {
    return {
      success: false,
      errors: [
        {
          path: 'file',
          message: `فرمت فایل پشتیبانی نمی‌شود. فرمت‌های فعلی: ${getSupportedPlanExtensions().join('، ')}. معماری importer برای افزودن بسته .mplan آماده است.`,
        },
      ],
      warnings: [],
      fileName: file.name,
    }
  }

  if (file.size > MAX_PLAN_FILE_BYTES) {
    const maxMegabytes = Math.round(MAX_PLAN_FILE_BYTES / (1024 * 1024))
    return {
      success: false,
      errors: [
        {
          path: 'file',
          message: `حجم فایل نباید بیشتر از ${maxMegabytes} مگابایت باشد.`,
        },
      ],
      warnings: [],
      fileName: file.name,
    }
  }

  try {
    const parsed = await adapter.parse(file)
    return { ...validateWeeklyMealPlan(parsed), fileName: file.name }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path:
            error instanceof PlanImportAdapterError ? error.path : 'file',
          message:
            error instanceof PlanImportAdapterError
              ? error.message
              : 'خواندن فایل انجام نشد.',
        },
      ],
      warnings: [],
      fileName: file.name,
    }
  }
}

export async function loadSamplePlan(): Promise<PlanFileResult> {
  try {
    const response = await fetch('/samples/momentum-week-example.json', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Sample unavailable')
    }

    const parsed = (await response.json()) as unknown
    const validation = validateWeeklyMealPlan(parsed)

    if (!validation.success || !validation.data) {
      return {
        ...validation,
        fileName: 'momentum-week-example.json',
      }
    }

    return {
      ...validateWeeklyMealPlan(
        rebaseSamplePlanToToday(parsed as WeeklyMealPlan),
      ),
      fileName: 'momentum-week-example.json',
    }
  } catch {
    return {
      success: false,
      errors: [{ path: 'sample', message: 'فایل نمونه قابل دریافت نیست.' }],
      warnings: [],
    }
  }
}

export function countMealOptions(plan: WeeklyMealPlan) {
  return plan.days.reduce(
    (total, day) =>
      total + day.meals.reduce((dayTotal, meal) => dayTotal + meal.options.length, 0),
    0,
  )
}
