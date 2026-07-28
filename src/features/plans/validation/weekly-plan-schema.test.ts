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

  it('rejects unknown major schema versions and unsafe text', () => {
    const unsupported = { ...loadSample(), schemaVersion: '3.0' }
    const unsafe = { ...loadSample(), description: 'javascript:alert(1)' }

    expect(validateWeeklyMealPlan(unsupported).success).toBe(false)
    expect(validateWeeklyMealPlan(unsafe).errors[0].path).toBe('description')
  })
})
