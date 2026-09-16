import { describe, expect, it } from 'vitest'
import { resources } from '../../platform/i18n/catalog'
import {
  earliestIncompleteStep,
  generationBlockedReason,
  healthScreeningOutcome,
  canVisitStep,
  prepareCompletionValues,
  onboardingProgressPercent,
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
  it('keeps Basics → Health → Consent → Plan source → Goal → Food → Training → Body → Review', () => {
    expect(onboardingSections.map((item) => item.key)).toEqual([
      'basics', 'health', 'consent', 'plan-source', 'goal', 'food', 'training', 'body', 'review',
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
    expect(ageFromBirthDate('2000-02-30')).toBeNull()
    expect(validateSection(section('basics'), { ...completeBasics, birthDate: '2000-02-30' })).toHaveProperty('birthDate')
    expect(validateSection(section('basics'), { ...completeBasics, birthDate: '1900-01-01' })).toHaveProperty('birthDate')
  })

  it('rejects values outside option catalogs and unaccepted consent checkboxes', () => {
    expect(validateSection(section('basics'), { ...completeBasics, sex: 'robot' })).toHaveProperty('sex')
    expect(validateSection(section('basics'), { ...completeBasics, country: 'ZZ' })).toHaveProperty('country')
    expect(validateSection(section('food'), { dietStyle: 'omnivore', requestedMealCount: '3', allergies: 'peanut,unknown' })).toHaveProperty('allergies')
    expect(validateSection(section('consent'), { termsAccepted: 'no', privacyAccepted: 'yes', healthDataConsent: 'yes' })).toHaveProperty('termsAccepted')
  })

  it('provides deterministic defaults for option, restaurant, and duration counts', () => {
    expect(onboardingDefaultValues).toMatchObject({
      preferredOptionCount: '3',
      requestedMealCount: '3',
      restaurantMealsPerWeek: '0',
      trainingDays: '0',
      trainingDuration: '60',
      trainingDurationPreset: '60',
    })
    expect(field('food', 'preferredOptionCount')).toMatchObject({ min: 1, max: 4, stepper: true })
    expect(field('training', 'trainingDays')).toMatchObject({ min: 0, max: 7, stepper: true })
  })

  it('keeps target weight optional and hidden during maintenance', () => {
    expect(isFieldVisible(field('goal', 'targetWeightKg'), {})).toBe(false)
    expect(isFieldVisible(field('goal', 'targetWeightKg'), { goalType: 'maintenance' })).toBe(false)
    expect(isFieldVisible(field('goal', 'targetWeightKg'), { goalType: 'fat_loss' })).toBe(true)
    expect(validateSection(section('goal'), { goalType: 'fat_loss' })).toEqual({})
    expect(validateSection(section('goal'), { goalType: 'maintenance' })).toEqual({})
    expect(prepareCompletionValues({ goalType: 'fat_loss', weightKg: '72.4' }).targetWeightKg).toBe('72.4')
  })

  it('requires only diet style and meal count on Food, including optional budget and pattern', () => {
    expect(validateSection(section('food'), { dietStyle: 'omnivore', requestedMealCount: '3' })).toEqual({})
    expect(validateSection(section('food'), { requestedMealCount: '3' })).toHaveProperty('dietStyle')
    expect(validateSection(section('food'), { dietStyle: 'omnivore' })).toHaveProperty('requestedMealCount')
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore',
      requestedMealCount: '4',
      restaurantMealsPerWeek: '2',
    })).toHaveProperty('restaurantPreferences')
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore', requestedMealCount: '4', restaurantMealsPerWeek: '2', restaurantPreferences: 'nearby',
    })).toEqual({})
  })

  it('enforces completion text limits, including the composed meal-count prefix', () => {
    expect(validateSection(section('basics'), { ...completeBasics, firstName: 'x'.repeat(121) })).toHaveProperty('firstName')
    expect(validateSection(section('training'), { trainingDays: '0', workSchedule: 'x'.repeat(1001) })).toHaveProperty('workSchedule')
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore', requestedMealCount: '3', requestedMealPattern: 'x'.repeat(495),
    })).toHaveProperty('requestedMealPattern')
  })

  it('composes meal count into the stored pattern string for completion', () => {
    expect(prepareCompletionValues({ requestedMealCount: '4', locale: 'en-US' }).requestedMealPattern).toBe('4 meals')
    expect(prepareCompletionValues({
      requestedMealCount: '3',
      requestedMealPattern: 'plus a snack',
      locale: 'en-US',
    }).requestedMealPattern).toBe('3 meals. plus a snack')
    expect(prepareCompletionValues({ requestedMealCount: '3', locale: 'fa-IR' }).requestedMealPattern).toBe('۳ وعده')
  })

  it('keeps options per meal inside 1–4 and defaults to 3', () => {
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore',
      requestedMealCount: '3',
      preferredOptionCount: '4',
    })).toEqual({})
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore',
      requestedMealCount: '3',
      preferredOptionCount: '5',
    })).toHaveProperty('preferredOptionCount')
    expect(prepareCompletionValues({ preferredOptionCount: '6' }).preferredOptionCount).toBe('4')
    expect(prepareCompletionValues({}).preferredOptionCount).toBe('3')
    expect(validateSection(section('food'), {
      dietStyle: 'omnivore', requestedMealCount: '3', preferredOptionCount: '2.5',
    })).toHaveProperty('preferredOptionCount')
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
    expect(validateSection(section('training'), { ...training, trainingDays: '2.5' })).toHaveProperty('trainingDays')
    expect(validateSection(section('training'), { ...training, trainingDays: '2.5' }).trainingDays).toMatch(/increments of 1/i)
    expect(validateSection(section('training'), { ...training, trainingStartTime: '24:15' })).toHaveProperty('trainingStartTime')
    expect(validateSection(section('training'), { ...training, primaryActivity: 'none' })).toHaveProperty('primaryActivity')
  })

  it('hides equipment for outdoor training and starts Persian weekdays on Saturday', () => {
    expect(isFieldVisible(field('training', 'equipment'), { trainingLocation: 'outdoor' })).toBe(false)
    expect(isFieldVisible(field('training', 'equipment'), { trainingDays: '3', trainingLocation: 'home' })).toBe(true)
    expect(isFieldVisible(field('training', 'equipment'), { trainingDays: '0', trainingLocation: 'home' })).toBe(false)
    expect(isFieldVisible(field('training', 'trainingDurationPreset'), { trainingDays: '0' })).toBe(false)
    expect(isFieldVisible(field('training', 'trainingDuration'), { trainingDays: '0', trainingDurationPreset: 'custom' })).toBe(false)
    expect(isFieldVisible(field('training', 'trainingDurationPreset'), { trainingDays: '3' })).toBe(true)
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
    expect(healthScreeningOutcome({ urgentSymptoms: 'yes' })).toBe('urgent')
    expect(healthScreeningOutcome({ highRiskCondition: 'yes' })).toBe('blocked')
    expect(canVisitStep('food', { ...completeBasics, ...eligibleHealth, highRiskCondition: 'yes' })).toBe(false)
    expect(canVisitStep('consent', { ...completeBasics, ...eligibleHealth })).toBe(true)
    expect(earliestIncompleteStep({
      ...completeBasics,
      ...eligibleHealth,
      termsAccepted: 'yes',
      privacyAccepted: 'yes',
      healthDataConsent: 'yes',
    })).toBe('plan-source')
  })

  it('rejects impossible report dates and removes stale hidden completion values', () => {
    expect(validateSection(section('body'), { bodyReportDate: '2026-02-30' })).toHaveProperty('bodyReportDate')
    expect(validateSection(section('body'), { bodyReportDate: '2999-01-01' })).toHaveProperty('bodyReportDate')
    const completed = prepareCompletionValues({
      goalType: 'maintenance', targetWeightKg: '60', trainingDays: '0', trainingLocation: 'home',
      trainingDuration: '90', trainingWeekdays: '1,3', equipment: 'dumbbells',
      restaurantMealsPerWeek: '0', restaurantPreferences: 'old preference', bodySkipped: 'yes',
      bodySource: 'manual', bodyFatPercent: '20', waistCm: '80', bodyReportDate: '2026-01-01',
      bodyReportPath: 'reports/old.pdf', bodyReportId: 'old-id',
    })
    expect(completed).not.toHaveProperty('targetWeightKg')
    expect(completed).not.toHaveProperty('trainingLocation')
    expect(completed).not.toHaveProperty('trainingDuration')
    expect(completed).not.toHaveProperty('equipment')
    expect(completed).not.toHaveProperty('restaurantPreferences')
    expect(completed).not.toHaveProperty('bodyFatPercent')
    expect(completed).not.toHaveProperty('bodyReportPath')
  })

  it('advances setup progress only when the current step changes', () => {
    expect(onboardingProgressPercent('basics')).toBe(0)
    expect(onboardingProgressPercent('health')).toBeGreaterThan(0)
    expect(onboardingProgressPercent('consent')).toBeGreaterThan(onboardingProgressPercent('health'))
    expect(onboardingProgressPercent('review')).toBe(100)
  })
})
