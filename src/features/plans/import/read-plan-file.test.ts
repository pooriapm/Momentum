import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WeeklyMealPlan } from '../../../types/domain'
import {
  loadSamplePlan,
  rebaseSamplePlanToToday,
} from './read-plan-file'
import { validateWeeklyMealPlan } from '../validation/weekly-plan-schema'

function loadSample(): WeeklyMealPlan {
  return JSON.parse(
    readFileSync(
      resolve('src/test/fixtures/legacy-momentum-week-example.json'),
      'utf8',
    ),
  ) as WeeklyMealPlan
}

describe('sample plan', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rebases the demo so the first complete day is always today', () => {
    const rebased = rebaseSamplePlanToToday(loadSample(), '2026-07-29')

    expect(rebased.validFrom).toBe('2026-07-29')
    expect(rebased.validTo).toBe('2026-07-30')
    expect(rebased.days.map((day) => day.date)).toEqual([
      '2026-07-29',
      '2026-07-30',
    ])
    expect(rebased.days[0].meals).toHaveLength(3)
    expect(rebased.days[0].meals[0].options.length).toBeGreaterThan(1)
    expect(rebased.profile.goalDate).toBe('2026-10-27')
    expect(rebased.profile.bodyComposition?.measuredAt).toBe('2026-07-28')
    expect(validateWeeklyMealPlan(rebased).success).toBe(true)
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
