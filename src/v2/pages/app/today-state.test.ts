import { describe, expect, it } from 'vitest'
import { demoPlan } from '../../data/demo'
import { completedMealCount, deriveTodaySurface, formatLastSync, mealIsCompleted, mealIsSettled, periodPosition, type MealStatus } from './today-state'

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
    const mealOverrides: Record<string, MealStatus> = Object.fromEntries(demoPlan.meals.map((meal, index) => [meal.id, index === 0 ? 'completed' : 'planned']))
    expect(deriveTodaySurface({ plan: demoPlan, online: true, today, mealOverrides })).toBe('partial')
    expect(deriveTodaySurface({
      plan: demoPlan,
      online: true,
      today,
      mealOverrides: Object.fromEntries(demoPlan.meals.map((meal) => [meal.id, 'completed' as const])),
      workoutStatus: 'completed',
    })).toBe('completed')
  })

  it('reads overlay completion before the stored meal status', () => {
    const meal = { ...demoPlan.meals[0], completionStatus: 'completed' as const }
    expect(mealIsCompleted(meal)).toBe(true)
    expect(mealIsCompleted(meal, { [meal.id]: 'planned' })).toBe(false)
  })

  it('treats a skipped meal as settled for the day but not as eaten', () => {
    const meals = demoPlan.meals.map((meal, index) => ({ ...meal, completionStatus: (index === 0 ? 'skipped' : 'completed') as MealStatus }))
    expect(mealIsSettled(meals[0]!)).toBe(true)
    expect(mealIsCompleted(meals[0]!)).toBe(false)
    expect(completedMealCount(meals)).toBe(meals.length - 1)
    expect(deriveTodaySurface({ plan: { ...demoPlan, meals }, online: true, today, workoutStatus: 'completed' })).toBe('completed')
  })

  it('formats a last-sync timestamp for both locales', () => {
    expect(formatLastSync('2026-08-17T08:42:00.000Z', 'en')).not.toBe('unknown')
    expect(formatLastSync(undefined, 'en')).toBe('unknown')
  })
})

describe('periodPosition', () => {
  const base = { ...demoPlan, days: [], localDate: '2026-08-12', version: { ...demoPlan.version!, validFrom: '2026-08-01', validTo: '2026-08-30' } }

  it('places today inside the thirty-day period', () => {
    expect(periodPosition(base, '2026-08-12')).toEqual({ day: 12, days: 30, trainingDays: [] })
  })

  it('lists the period days that carry a workout', () => {
    const plan = { ...base, days: [
      { ...demoPlan.days![0], localDate: '2026-08-02', workout: demoPlan.workout },
      { ...demoPlan.days![0], localDate: '2026-08-03', workout: null },
      { ...demoPlan.days![0], localDate: '2026-09-02', workout: demoPlan.workout },
    ] }
    expect(periodPosition(plan, '2026-08-12')?.trainingDays).toEqual([2])
  })

  it('says nothing when the period is unknown or today is outside it', () => {
    expect(periodPosition({ ...base, version: undefined }, '2026-08-12')).toBeNull()
    expect(periodPosition({ ...base, localDate: '2026-09-04' }, '2026-09-04')).toBeNull()
  })
})
