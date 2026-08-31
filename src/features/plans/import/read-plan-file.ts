import { APP_CONFIG } from '../../../config/app'
import { getTodayIso } from '../../../lib/dates/jalali'
import type { ISODate, MonthlyMealPlan } from '../../../types/domain'
import {
  validateMonthlyMealPlan,
  type PlanValidationResult,
} from '../validation/monthly-plan-schema'
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
  plan: MonthlyMealPlan,
  today: ISODate = getTodayIso(),
): MonthlyMealPlan {
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
    return { ...validateMonthlyMealPlan(parsed), fileName: file.name }
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
    const response = await fetch('/samples/momentum-month-example.json', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Sample unavailable')
    }

    const parsed = (await response.json()) as unknown
    const validation = validateMonthlyMealPlan(parsed)

    if (!validation.success || !validation.data) {
      return {
        ...validation,
        fileName: 'momentum-month-example.json',
      }
    }

    return {
      ...validateMonthlyMealPlan(
        rebaseSamplePlanToToday(parsed as MonthlyMealPlan),
      ),
      fileName: 'momentum-month-example.json',
    }
  } catch {
    return {
      success: false,
      errors: [{ path: 'sample', message: 'فایل نمونه قابل دریافت نیست.' }],
      warnings: [],
    }
  }
}

export function countMealOptions(plan: MonthlyMealPlan) {
  return plan.days.reduce(
    (total, day) =>
      total + day.meals.reduce((dayTotal, meal) => dayTotal + meal.options.length, 0),
    0,
  )
}
