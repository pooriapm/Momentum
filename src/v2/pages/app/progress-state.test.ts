import { describe, expect, it } from 'vitest'
import { compareWeeks } from './progress-state'
import type { WeeklyProgressPoint } from '../../data/types'

const series: WeeklyProgressPoint[] = [
  { week: 1, workoutsCompleted: 2, workoutsPlanned: 3, mealsCompleted: 21, mealsPlanned: 28, energy: 6.8, adherence: 62 },
  { week: 2, workoutsCompleted: 3, workoutsPlanned: 3, mealsCompleted: 23, mealsPlanned: 28, energy: 7.1, adherence: 78 },
]

describe('compareWeeks', () => {
  it('compares each week with the one before it', () => {
    const rows = compareWeeks(series)
    expect(rows[0]?.adherenceDelta).toBeNull()
    expect(rows[1]?.adherenceDelta).toBe(16)
    expect(rows[1]?.workoutsDelta).toBe(100 - 67)
    expect(rows[1]?.energyDelta).toBe(0.3)
    expect(rows[0]?.meals).toBe(75)
  })
})
