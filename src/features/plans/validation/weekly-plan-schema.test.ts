import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WeeklyMealPlan } from '../../../types/domain'
import { validateWeeklyMealPlan } from './weekly-plan-schema'

const samplePath = resolve('public/samples/momentum-week-example.json')

function loadSample(): WeeklyMealPlan {
  return JSON.parse(readFileSync(samplePath, 'utf8')) as WeeklyMealPlan
}

describe('weekly meal plan validation', () => {
  it('accepts the bundled sample with a dynamic meal count', () => {
    const result = validateWeeklyMealPlan(loadSample())

    expect(result.success).toBe(true)
    expect(result.data?.planId).toBe('momentum-week-example')
    expect(result.data?.days.map((day) => day.meals.length)).toEqual([3, 5])
    expect(result.warnings).toEqual([])
  })

  it('accepts the complete profile and planning context from the imported file', () => {
    const plan = {
      ...loadSample(),
      schemaVersion: '0.1.0' as const,
      profile: {
        name: 'کاربر فایل',
        age: 36,
        sex: 'prefer_not_to_say' as const,
        heightCm: 170,
        currentWeightKg: 80,
        targetWeightKg: 74,
        startWeightKg: 82,
        goalDate: '2026-12-01' as const,
        activityLevel: 'moderate' as const,
      },
    }

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(true)
    expect(result.data?.profile.name).toBe('کاربر فایل')
    expect(result.data?.profile.goalDate).toBe('2026-12-01')
  })

  it('rejects invalid profile measurements with an exact path', () => {
    const plan = {
      ...loadSample(),
      profile: {
        ...loadSample().profile,
        heightCm: 20,
      },
    }

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(false)
    expect(result.errors.some((error) => error.path === 'profile.heightCm')).toBe(true)
  })

  it('maps negative nutrition errors to the exact JSON path', () => {
    const plan = structuredClone(loadSample())
    plan.days[0].meals[0].options[0].nutrition.calories = -1

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(false)
    expect(result.errors).toContainEqual({
      path: 'days[0].meals[0].options[0].nutrition.calories',
      message: 'کالری باید بزرگ‌تر یا مساوی صفر باشد.',
    })
  })

  it('rejects duplicate meal ids inside one day', () => {
    const plan = structuredClone(loadSample())
    plan.days[0].meals.push(structuredClone(plan.days[0].meals[0]))

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(false)
    expect(result.errors.some((error) => error.path === 'days[0].meals')).toBe(true)
  })

  it('rejects days outside the declared range', () => {
    const plan = structuredClone(loadSample())
    plan.days[0].date = '2026-08-15'

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(false)
    expect(result.errors).toContainEqual({
      path: 'days[0].date',
      message: 'تاریخ روز خارج از بازه اعلام‌شده برنامه است.',
    })
  })

  it('rejects any other schema version and unsafe text', () => {
    const unsupported = { ...loadSample(), schemaVersion: '0.1.1' }
    const unsafe = { ...loadSample(), description: 'javascript:alert(1)' }

    expect(validateWeeklyMealPlan(unsupported).success).toBe(false)
    expect(validateWeeklyMealPlan(unsafe).errors[0].path).toBe('description')
  })

  it('rejects files without the current required profile contract', () => {
    const plan = structuredClone(loadSample()) as Partial<WeeklyMealPlan>
    delete plan.profile

    const result = validateWeeklyMealPlan(plan)

    expect(result.success).toBe(false)
    expect(result.errors.some((error) => error.path === 'profile')).toBe(true)
  })
})
