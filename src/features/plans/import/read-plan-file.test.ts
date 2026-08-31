import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MonthlyMealPlan } from '../../../types/domain'
import {
  loadSamplePlan,
  rebaseSamplePlanToToday,
} from './read-plan-file'
import { validateMonthlyMealPlan } from '../validation/monthly-plan-schema'

function loadSample(): MonthlyMealPlan {
  return JSON.parse(
    readFileSync(
      resolve('src/test/fixtures/momentum-month-example.json'),
      'utf8',
    ),
  ) as MonthlyMealPlan
}

describe('sample plan', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rebases the demo so the first complete day is always today', () => {
    const rebased = rebaseSamplePlanToToday(loadSample(), '2026-07-29')

    expect(rebased.validFrom).toBe('2026-07-29')
    expect(rebased.validTo).toBe('2026-08-27')
    expect(rebased.days).toHaveLength(30)
    expect(rebased.days[0]?.date).toBe('2026-07-29')
    expect(rebased.days.at(-1)?.date).toBe('2026-08-27')
    expect(rebased.days[0].meals).toHaveLength(3)
    expect(rebased.days[0].meals[0].options.length).toBeGreaterThan(1)
    expect(rebased.profile.goalDate).toBe('2026-10-27')
    expect(rebased.profile.bodyComposition?.measuredAt).toBe('2026-07-28')
    expect(validateMonthlyMealPlan(rebased).success).toBe(true)
  })

  it('loads the bundled demo without revalidating normalized runtime fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => loadSample(),
      })),
    )

    const result = await loadSamplePlan()

    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.data?.days[0].date).toBeDefined()
    expect(result.data?.days[0].targetOverrides).toEqual({
      fiber: 28,
      waterMl: 2500,
      steps: 8000,
    })
  })
})
