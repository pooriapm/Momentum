import type { WeeklyMealPlan } from '../../../types/domain'
import {
  validateWeeklyMealPlan,
  type PlanValidationResult,
} from '../validation/weekly-plan-schema'

export const MAX_PLAN_FILE_BYTES = 1024 * 1024

export interface PlanFileResult extends PlanValidationResult {
  fileName?: string
}

export async function readPlanFile(file: File): Promise<PlanFileResult> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return {
      success: false,
      errors: [{ path: 'file', message: 'فقط فایل با پسوند JSON پذیرفته می‌شود.' }],
      warnings: [],
      fileName: file.name,
    }
  }

  if (file.size > MAX_PLAN_FILE_BYTES) {
    return {
      success: false,
      errors: [{ path: 'file', message: 'حجم فایل نباید بیشتر از ۱ مگابایت باشد.' }],
      warnings: [],
      fileName: file.name,
    }
  }

  try {
    const parsed = JSON.parse(await file.text()) as unknown
    return { ...validateWeeklyMealPlan(parsed), fileName: file.name }
  } catch {
    return {
      success: false,
      errors: [{ path: 'file', message: 'محتوای فایل JSON معتبر نیست.' }],
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
    return {
      ...validateWeeklyMealPlan(parsed),
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
