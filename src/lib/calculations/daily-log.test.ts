import { describe, expect, it } from 'vitest'
import { createEmptyDailyLog } from '../../features/plans/state/plan-state'
import { toggleMealInLog } from './daily-log'

describe('daily meal completion', () => {
  it('awards XP once, removes it on undo, and never stacks XP while toggling', () => {
    const emptyLog = createEmptyDailyLog('2026-07-28')
    const selectedOption = {
      id: 'lunch-b',
      title: 'گزینه دوم',
      ingredients: [{ name: 'ماده تست', amount: 1, unit: 'serving' as const }],
      nutrition: { calories: 420, protein: 42, carbs: 40, fat: 12 },
    }
    const completed = toggleMealInLog(emptyLog, 'lunch', 12, {
      selectedOption,
      completedAt: '2026-07-28T12:00:00Z',
    })
    const undone = toggleMealInLog(completed, 'lunch', 12)
    const completedAgain = toggleMealInLog(undone, 'lunch', 12, {
      selectedOption,
      completedAt: '2026-07-28T12:05:00Z',
    })

    expect(completed.earnedXp).toBe(12)
    expect(undone.earnedXp).toBe(0)
    expect(completedAgain.earnedXp).toBe(12)
    expect(completedAgain.consumedMeals.lunch.xpAwarded).toBe(12)
    expect(completedAgain.consumedMeals.lunch.optionId).toBe('lunch-b')
    expect(completedAgain.consumedMeals.lunch.nutrition?.protein).toBe(42)
  })
})
