import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { WeeklyMealPlan } from '../../../types/domain'
import { validateWeeklyMealPlan } from '../validation/weekly-plan-schema'
import {
  analyzePlanHealth,
  createPlanImprovementPrompt,
} from './plan-health-score'

function loadPlan() {
  const raw = JSON.parse(
    readFileSync(
      resolve('src/test/fixtures/legacy-momentum-week-example.json'),
      'utf8',
    ),
  ) as WeeklyMealPlan
  const result = validateWeeklyMealPlan(raw)
  if (!result.data) throw new Error('sample should be valid')
  return result.data
}

describe('plan health score', () => {
  it('returns a bounded score with actionable insights', () => {
    const result = analyzePlanHealth(loadPlan())

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.insights.length).toBeGreaterThanOrEqual(5)
    expect(result.label).toBeTruthy()
  })

  it('creates a ChatGPT-ready correction prompt', () => {
    const plan = loadPlan()
    const analysis = analyzePlanHealth(plan)
    const prompt = createPlanImprovementPrompt(plan, analysis)

    expect(prompt).toContain(plan.planName)
    expect(prompt).toContain('فقط JSON معتبر')
    expect(prompt).toContain(String(analysis.score))
  })
})
