import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createAppState } from '../../../lib/storage/app-state'
import type { UserProfile, WeeklyMealPlan } from '../../../types/domain'
import {
  applyPlanImport,
  getPlanForDate,
  planRangesOverlap,
} from './plan-state'

const samplePath = resolve('public/samples/momentum-week-example.json')
const sample = JSON.parse(readFileSync(samplePath, 'utf8')) as WeeklyMealPlan
const profile: UserProfile = {
  name: 'کاربر نمونه',
  startWeightKg: 82,
  currentWeightKg: 81,
  targetWeightKg: 75,
  heightCm: 172,
  journeyStartDate: '2026-08-01',
  goalDate: '2026-11-01',
}

describe('plan state priority and conflicts', () => {
  it('detects overlapping date ranges', () => {
    const overlapping = { ...sample, planId: 'overlap', validFrom: '2026-08-01' } as WeeklyMealPlan
    const separate = {
      ...sample,
      planId: 'separate',
      validFrom: '2026-09-01',
      validTo: '2026-09-07',
    } as WeeklyMealPlan

    expect(planRangesOverlap(sample, overlapping)).toBe(true)
    expect(planRangesOverlap(sample, separate)).toBe(false)
  })

  it('keeps both plans and respects the selected priority', () => {
    const initial = createAppState(profile)
    const firstImport = applyPlanImport(initial, sample)
    const newer = {
      ...sample,
      planName: 'برنامه جدید',
      planVersion: '0.1.0-alpha.2',
    } as WeeklyMealPlan
    const secondImport = applyPlanImport(firstImport.state, newer, 'existing-first')

    expect(Object.keys(secondImport.state.plans)).toHaveLength(2)
    expect(secondImport.state.planPriority[0]).toBe(firstImport.storageKey)
    expect(getPlanForDate(secondImport.state, '2026-08-01')?.plan.planName).toBe(
      sample.planName,
    )
  })

  it('archives conflicting priorities when replacing a range', () => {
    const initial = applyPlanImport(createAppState(profile), sample)
    const replacement = {
      ...sample,
      planName: 'جایگزین',
      planVersion: '0.1.0-alpha.3',
    } as WeeklyMealPlan
    const result = applyPlanImport(initial.state, replacement, 'replace-conflicts')

    expect(Object.keys(result.state.plans)).toHaveLength(2)
    expect(result.state.planPriority).toHaveLength(1)
    expect(getPlanForDate(result.state, '2026-08-01')?.plan.planName).toBe('جایگزین')
  })
})
