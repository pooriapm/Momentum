import { describe, expect, it } from 'vitest'
import { resources } from '../../platform/i18n/catalog'
import {
  earliestIncompleteStep,
  generationBlockedReason,
  healthScreeningOutcome,
  canVisitStep,
  prepareCompletionValues,
} from './onboarding-state'
import {
  D11_STEP_ORDER,
  ageFromBirthDate,
  hasUnmappedAllergen,
  isFieldVisible,
  onboardingDefaultValues,
  onboardingOptionLabelKey,
  onboardingSections,
  validateSection,
  weekdayOptionsForLocale,
} from './schema'

const section = (key: string) => onboardingSections.find((item) => item.key === key)!
const field = (sectionKey: string, fieldKey: string) => section(sectionKey).fields.find((item) => item.key === fieldKey)!

const eligibleHealth = {
  pregnancyOrBreastfeeding: 'no',
  eatingDisorderHistory: 'no',
  highRiskCondition: 'no',
  urgentSymptoms: 'no',
  injuryLimitation: 'no',
}

const completeBasics = {
  firstName: 'Sara',
  birthDate: '1992-05-18',
  adultConfirmed: 'yes',
  sex: 'female',
  heightCm: '168',
  weightKg: '72.4',
  country: 'IR',
}

describe('D11 onboarding schema', () => {
  it('keeps Basics → Health → Consent → Goal → Food → Training → Body → Review', () => {
    expect(onboardingSections.map((item) => item.key)).toEqual([
      'basics', 'health', 'consent', 'goal', 'food', 'training', 'body', 'review',
    ])
    expect(D11_STEP_ORDER).toEqual(onboardingSections.map((item) => item.key))
    expect(Object.keys(resources.fa.translation.onboarding).sort()).toEqual(Object.keys(resources.en.translation.onboarding).sort())
  })

  it('puts the adult gate on Basics and does not geo-block Iran before Health', () => {
    expect(field('basics', 'adultConfirmed')).toBeTruthy()
    expect(section('health').fields.some((item) => item.key === 'adultConfirmed')).toBe(false)
    expect(validateSection(section('basics'), completeBasics)).toEqual({})
    expect(canVisitStep('health', completeBasics)).toBe(true)
  })

  it('rejects under-18 birth dates with a locale-safe boundary', () => {
    expect(ageFromBirthDate('2012-05-18', new Date('2026-08-17'))).toBe(14)
    expect(validateSection(section('basics'), { ...completeBasics, birthDate: '2012-05-18' })).toHaveProperty('birthDate')
    expect(validateSection(section('basics'), { ...completeBasics, adultConfirmed: 'no' })).toHaveProperty('adultConfirmed')
  })

  it('provides deterministic defaults for option, restaurant, and duration counts', () => {
    expect(onboardingDefaultValues).toMatchObject({
      preferredOptionCount: '3',
      restaurantMealsPerWeek: '0',
      trainingDuration: '60',
      trainingDurationPreset: '60',
    })
  })

  it('keeps target weight optional and hidden during maintenance', () => {
    expect(isFieldVisible(field('goal', 'targetWeightKg'), { goalType: 'maintenance' })).toBe(false)
    expect(validateSection(section('goal'), { goalType: 'fat_loss' })).toEqual({})
    expect(validateSection(section('goal'), { goalType: 'maintenance' })).toEqual({})
    expect(prepareCompletionValues({ goalType: 'fat_loss', weightKg: '72.4' }).targetWeightKg).toBe('72.4')
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

  it('maps stored option values to translation keys', () => {
    expect(onboardingOptionLabelKey('goalType', 'fat_loss')).toBe('onboarding.loss')
    expect(onboardingOptionLabelKey('dietStyle', 'omnivore')).toBe('onboarding.omnivore')
    expect(onboardingOptionLabelKey('goalType', 'unknown')).toBeUndefined()
  })

  it('requires the exact number of selected training days and a 15–120 minute duration', () => {
    const training = {
      trainingDays: '3',
      trainingLocation: 'home',
      primaryActivity: 'strength',
      trainingExperience: 'intermediate',
      trainingWeekdays: '1,3',
      trainingStartTime: '18:30',
      trainingDurationPreset: '60',
      trainingDuration: '60',
      trainingAvailability: 'evenings',
      workSchedule: 'weekdays',
    }
    expect(validateSection(section('training'), training)).toHaveProperty('trainingWeekdays')
    expect(validateSection(section('training'), { ...training, trainingWeekdays: '1,3,5' })).toEqual({})
    expect(validateSection(section('training'), {
      ...training,
      trainingWeekdays: '1,3,5',
      trainingDurationPreset: 'custom',
      trainingDuration: '140',
    })).toHaveProperty('trainingDuration')
  })

  it('hides equipment for outdoor training and starts Persian weekdays on Saturday', () => {
    expect(isFieldVisible(field('training', 'equipment'), { trainingLocation: 'outdoor' })).toBe(false)
    expect(isFieldVisible(field('training', 'equipment'), { trainingLocation: 'home' })).toBe(true)
    expect(weekdayOptionsForLocale('fa').map((option) => option.value)).toEqual(['6', '0', '1', '2', '3', '4', '5'])
  })

  it('treats catalog “other” as an unmapped allergen that blocks generation', () => {
    expect(hasUnmappedAllergen({ allergies: 'peanut,other' })).toBe(true)
    expect(hasUnmappedAllergen({ allergies: 'peanut' })).toBe(false)
    expect(generationBlockedReason({ ...eligibleHealth, allergies: 'other' })).toMatch(/mapped catalog path/i)
  })

  it('resumes at the earliest incomplete valid step and stops after an ineligible Health screen', () => {
    expect(earliestIncompleteStep({})).toBe('basics')
    expect(earliestIncompleteStep(completeBasics)).toBe('health')
    expect(healthScreeningOutcome({ ...eligibleHealth })).toBe('eligible')
    expect(healthScreeningOutcome({ ...eligibleHealth, highRiskCondition: 'yes' })).toBe('blocked')
    expect(healthScreeningOutcome({ ...eligibleHealth, urgentSymptoms: 'yes' })).toBe('urgent')
    expect(canVisitStep('food', { ...completeBasics, ...eligibleHealth, highRiskCondition: 'yes' })).toBe(false)
    expect(canVisitStep('consent', { ...completeBasics, ...eligibleHealth })).toBe(true)
    expect(earliestIncompleteStep({
      ...completeBasics,
      ...eligibleHealth,
      termsAccepted: 'yes',
      privacyAccepted: 'yes',
      healthDataConsent: 'yes',
    })).toBe('goal')
  })
})
