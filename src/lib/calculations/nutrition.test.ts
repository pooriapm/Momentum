import { describe, expect, it } from 'vitest'
import { applyPlanImport, createEmptyDailyLog } from '../../features/plans/state/plan-state'
import { createAppState } from '../storage/app-state'
import type { UserProfile, WeeklyMealPlan } from '../../types/domain'
import { calculateDailyNutrition } from './nutrition'

const profile: UserProfile = {
  name: 'کاربر نمونه',
  startWeightKg: 82,
  currentWeightKg: 81,
  targetWeightKg: 75,
  heightCm: 172,
  journeyStartDate: '2026-08-01',
  goalDate: '2026-11-01',
}

const plan: WeeklyMealPlan = {
  schemaVersion: '2.0',
  planId: 'nutrition-test',
  planName: 'برنامه تست',
  planVersion: '1.0.0',
  generatedAt: '2026-07-28T08:00:00Z',
  validFrom: '2026-07-28',
  validTo: '2026-07-28',
  locale: 'fa-IR',
  direction: 'rtl',
  unitSystem: 'metric',
  defaultTargets: { calories: 1800, protein: 140 },
  days: [
    {
      date: '2026-07-28',
      targets: { calories: 1800, protein: 140 },
      meals: [
        {
          id: 'lunch',
          type: 'lunch',
          title: 'ناهار',
          xp: 10,
          required: true,
          defaultOptionId: 'lunch-a',
          options: [
            {
              id: 'lunch-a',
              title: 'گزینه اول',
              ingredients: [{ name: 'ماده اول', amount: 1, unit: 'serving' }],
              nutrition: { calories: 500, protein: 35, carbs: 50, fat: 15 },
            },
            {
              id: 'lunch-b',
              title: 'گزینه دوم',
              ingredients: [{ name: 'ماده دوم', amount: 1, unit: 'serving' }],
              nutrition: { calories: 420, protein: 42, carbs: 40, fat: 12 },
            },
          ],
        },
        {
          id: 'dinner',
          type: 'dinner',
          title: 'شام',
          xp: 10,
          required: true,
          defaultOptionId: 'dinner-a',
          options: [
            {
              id: 'dinner-a',
              title: 'گزینه شام',
              ingredients: [{ name: 'ماده سوم', amount: 1, unit: 'serving' }],
              nutrition: { calories: 600, protein: 45, carbs: 55, fat: 20 },
            },
          ],
        },
      ],
    },
  ],
  emergencyOptions: [],
}

describe('daily nutrition calculations', () => {
  it('counts only completed meals and uses the selected option', () => {
    const imported = applyPlanImport(createAppState(profile), plan).state
    const log = createEmptyDailyLog('2026-07-28')
    const state = {
      ...imported,
      dailyLogs: {
        '2026-07-28': {
          ...log,
          selectedMealOptions: { lunch: 'lunch-b' },
          consumedMeals: {
            lunch: { completed: true, xpAwarded: 10 },
            dinner: { completed: false, xpAwarded: 0 },
          },
        },
      },
    }

    const result = calculateDailyNutrition(state, '2026-07-28')

    expect(result.consumed.calories).toBe(420)
    expect(result.consumed.protein).toBe(42)
    expect(result.remaining?.calories).toBe(1380)
  })

  it('adds logged emergency food to daily totals', () => {
    const imported = applyPlanImport(createAppState(profile), plan).state
    const log = createEmptyDailyLog('2026-07-28')
    const state = {
      ...imported,
      dailyLogs: {
        '2026-07-28': {
          ...log,
          extraFoodLogs: [
            {
              id: 'emergency-1',
              title: 'گزینه اضطراری',
              nutrition: { calories: 150, protein: 20, carbs: 10, fat: 4 },
              loggedAt: '2026-07-28T15:30:00Z',
              source: 'emergency' as const,
            },
          ],
        },
      },
    }

    const result = calculateDailyNutrition(state, '2026-07-28')

    expect(result.consumed).toMatchObject({
      calories: 150,
      protein: 20,
      carbs: 10,
      fat: 4,
    })
  })

  it('keeps the nutrition snapshot of the option that was actually logged', () => {
    const imported = applyPlanImport(createAppState(profile), plan).state
    const log = createEmptyDailyLog('2026-07-28')
    const state = {
      ...imported,
      dailyLogs: {
        '2026-07-28': {
          ...log,
          selectedMealOptions: { lunch: 'lunch-a' },
          consumedMeals: {
            lunch: {
              completed: true,
              xpAwarded: 10,
              optionId: 'lunch-b',
              optionTitle: 'گزینه دوم',
              nutrition: { calories: 420, protein: 42, carbs: 40, fat: 12 },
            },
          },
        },
      },
    }

    const result = calculateDailyNutrition(state, '2026-07-28')

    expect(result.consumed.calories).toBe(420)
    expect(result.consumed.protein).toBe(42)
  })
})
