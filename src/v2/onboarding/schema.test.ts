import { describe, expect, it } from 'vitest'
import {
  isFieldVisible,
  onboardingDefaultValues,
  onboardingSections,
  validateSection,
} from './schema'

const section = (key: string) => onboardingSections.find((item) => item.key === key)!
const field = (sectionKey: string, fieldKey: string) => section(sectionKey).fields.find((item) => item.key === fieldKey)!

describe('adaptive onboarding schema', () => {
  it('provides deterministic defaults for option and restaurant counts', () => {
    expect(onboardingDefaultValues).toMatchObject({
      preferredOptionCount: '3',
      restaurantMealsPerWeek: '0',
      trainingDuration: '60',
    })
  })

  it('does not ask for a target weight during maintenance', () => {
    expect(isFieldVisible(field('goal', 'targetWeightKg'), { goalType: 'maintenance' })).toBe(false)
    expect(validateSection(section('goal'), { goalType: 'maintenance' })).toEqual({})
  })

  it('requires restaurant preferences only when restaurant meals are used', () => {
    const common = {
      dietStyle: 'omnivore',
      favoriteFoods: 'rice',
      requestedMealPattern: '3 meals',
      preferredOptionCount: '3',
      cookingConstraints: '30 minutes',
      foodBudget: 'standard',
      groceryPreferences: 'local supermarket',
    }
    expect(validateSection(section('food'), { ...common, restaurantMealsPerWeek: '0' })).toEqual({})
    expect(validateSection(section('food'), { ...common, restaurantMealsPerWeek: '2' })).toHaveProperty('restaurantPreferences')
  })

  it('requires the exact number of selected training days', () => {
    const training = {
      trainingDays: '3',
      primaryActivity: 'strength',
      trainingWeekdays: '1,3',
      trainingStartTime: '18:30',
      trainingDuration: '60',
      trainingAvailability: 'evenings',
      workSchedule: 'weekdays',
    }
    expect(validateSection(section('training'), training)).toHaveProperty('trainingWeekdays')
    expect(validateSection(section('training'), { ...training, trainingWeekdays: '1,3,5' })).toEqual({})
  })
})
