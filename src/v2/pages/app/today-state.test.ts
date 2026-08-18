import { describe, expect, it } from 'vitest'
import { demoPlan } from '../../data/demo'
import { deriveTodaySurface, formatLastSync, mealIsCompleted } from './today-state'

const today = demoPlan.localDate ?? '2026-08-17'

describe('Today surface derivation', () => {
  it('maps inventory states from plan, network, and safety signals', () => {
    expect(deriveTodaySurface({ plan: null, online: true, today })).toBe('no-plan')
    expect(deriveTodaySurface({ plan: demoPlan, online: true, today, preparing: true })).toBe('preparing')
    expect(deriveTodaySurface({ plan: demoPlan, online: true, today, loadError: true })).toBe('load-error')
    expect(deriveTodaySurface({ plan: null, online: true, today, loadError: true })).toBe('load-error')
    expect(deriveTodaySurface({ plan: demoPlan, online: true, today, safetyLevel: 'urgent' })).toBe('safety')
    expect(deriveTodaySurface({ plan: demoPlan, online: false, today })).toBe('offline')
    expect(deriveTodaySurface({ plan: { ...demoPlan, localDate: '2026-01-01' }, online: true, today })).toBe('stale')
  })

  it('treats a rest day without a workout as TODAY-02, not a failure', () => {
    expect(deriveTodaySurface({ plan: { ...demoPlan, workout: null }, online: true, today })).toBe('rest')
  })

  it('promotes partial and completed days from meal and workout progress', () => {
    const mealOverrides = Object.fromEntries(demoPlan.meals.map((meal, index) => [meal.id, index === 0]))
    expect(deriveTodaySurface({ plan: demoPlan, online: true, today, mealOverrides })).toBe('partial')
    expect(deriveTodaySurface({
      plan: demoPlan,
      online: true,
      today,
      mealOverrides: Object.fromEntries(demoPlan.meals.map((meal) => [meal.id, true])),
      workoutStatus: 'completed',
    })).toBe('completed')
  })

  it('reads overlay completion before the stored meal status', () => {
    const meal = { ...demoPlan.meals[0], completionStatus: 'completed' as const }
    expect(mealIsCompleted(meal)).toBe(true)
    expect(mealIsCompleted(meal, { [meal.id]: false })).toBe(false)
  })

  it('formats a last-sync timestamp for both locales', () => {
    expect(formatLastSync('2026-08-17T08:42:00.000Z', 'en')).not.toBe('unknown')
    expect(formatLastSync(undefined, 'en')).toBe('unknown')
  })
})
