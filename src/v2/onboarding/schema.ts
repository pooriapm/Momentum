import type { AppLocale } from '../../platform/i18n/catalog'

export type OnboardingStepKey = 'basics' | 'goal' | 'health' | 'food' | 'training' | 'body' | 'consent' | 'review'
export type FieldKind = 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'textarea' | 'checkbox'

interface FieldOption {
  value: string
  labelKey: string
}

export interface OnboardingField {
  key: string
  labelKey: string
  kind: FieldKind
  required?: boolean
  min?: number
  max?: number
  step?: number
  options?: readonly FieldOption[]
  optionSource?: 'countries'
  placeholder?: Record<AppLocale, string>
  defaultValue?: string
  visibleWhen?: { field: string; equals?: string; notEquals?: string; greaterThan?: number }
  requiredWhen?: { field: string; equals?: string; notEquals?: string; greaterThan?: number }
  selectionCountField?: string
}

export interface OnboardingSection {
  key: OnboardingStepKey
  titleKey: string
  fields: readonly OnboardingField[]
}

const yesNoOptions = [
  { value: 'no', labelKey: 'onboarding.no' },
  { value: 'yes', labelKey: 'onboarding.yes' },
] as const

export const onboardingSections: readonly OnboardingSection[] = [
  {
    key: 'basics',
    titleKey: 'onboarding.basics',
    fields: [
      { key: 'firstName', labelKey: 'onboarding.firstName', kind: 'text', required: true },
      { key: 'birthDate', labelKey: 'onboarding.birthDate', kind: 'date', required: true },
      { key: 'sex', labelKey: 'onboarding.sex', kind: 'select', required: true, options: [
        { value: 'female', labelKey: 'onboarding.female' },
        { value: 'male', labelKey: 'onboarding.male' },
        { value: 'undisclosed', labelKey: 'onboarding.undisclosed' },
      ] },
      { key: 'heightCm', labelKey: 'onboarding.height', kind: 'number', required: true, min: 120, max: 230, step: 0.1 },
      { key: 'weightKg', labelKey: 'onboarding.weight', kind: 'number', required: true, min: 35, max: 350, step: 0.1 },
      { key: 'country', labelKey: 'onboarding.country', kind: 'select', required: true, optionSource: 'countries' },
    ],
  },
  {
    key: 'goal',
    titleKey: 'onboarding.goal',
    fields: [
      { key: 'goalType', labelKey: 'onboarding.goal', kind: 'select', required: true, options: [
        { value: 'fat_loss', labelKey: 'onboarding.loss' },
        { value: 'muscle_gain', labelKey: 'onboarding.gain' },
        { value: 'maintenance', labelKey: 'onboarding.maintain' },
      ] },
      { key: 'targetWeightKg', labelKey: 'onboarding.targetWeight', kind: 'number', min: 35, max: 350, step: 0.1, visibleWhen: { field: 'goalType', notEquals: 'maintenance' }, requiredWhen: { field: 'goalType', notEquals: 'maintenance' } },
    ],
  },
  {
    key: 'consent',
    titleKey: 'onboarding.consent',
    fields: [
      { key: 'termsAccepted', labelKey: 'onboarding.termsConsent', kind: 'checkbox', required: true },
      { key: 'privacyAccepted', labelKey: 'onboarding.privacyConsent', kind: 'checkbox', required: true },
      { key: 'healthDataConsent', labelKey: 'onboarding.healthConsent', kind: 'checkbox', required: true },
    ],
  },
  {
    key: 'health',
    titleKey: 'onboarding.health',
    fields: [
      { key: 'adultConfirmed', labelKey: 'onboarding.adultConfirm', kind: 'select', required: true, options: yesNoOptions },
      { key: 'pregnancyOrBreastfeeding', labelKey: 'onboarding.pregnancy', kind: 'select', required: true, options: yesNoOptions },
      { key: 'eatingDisorderHistory', labelKey: 'onboarding.eatingDisorder', kind: 'select', required: true, options: yesNoOptions },
      { key: 'highRiskCondition', labelKey: 'onboarding.highRisk', kind: 'select', required: true, options: yesNoOptions },
      { key: 'medicalNotes', labelKey: 'onboarding.medicalNotes', kind: 'textarea' },
      { key: 'medications', labelKey: 'onboarding.medications', kind: 'textarea' },
      { key: 'supplements', labelKey: 'onboarding.supplements', kind: 'textarea' },
    ],
  },
  {
    key: 'food',
    titleKey: 'onboarding.food',
    fields: [
      { key: 'dietStyle', labelKey: 'onboarding.diet', kind: 'select', required: true, options: [
        { value: 'omnivore', labelKey: 'onboarding.omnivore' },
        { value: 'vegetarian', labelKey: 'onboarding.vegetarian' },
      ] },
      { key: 'favoriteFoods', labelKey: 'onboarding.favoriteFoods', kind: 'textarea', required: true },
      { key: 'dislikedFoods', labelKey: 'onboarding.dislikedFoods', kind: 'textarea' },
      { key: 'allergies', labelKey: 'onboarding.allergies', kind: 'textarea' },
      { key: 'requestedMealPattern', labelKey: 'onboarding.mealPattern', kind: 'textarea', required: true },
      { key: 'preferredOptionCount', labelKey: 'onboarding.optionCount', kind: 'number', required: true, min: 1, max: 6, step: 1, defaultValue: '3' },
      { key: 'cookingConstraints', labelKey: 'onboarding.cookingConstraints', kind: 'textarea', required: true },
      { key: 'foodBudget', labelKey: 'onboarding.budget', kind: 'select', required: true, options: [
        { value: 'budget', labelKey: 'onboarding.budgetLow' }, { value: 'standard', labelKey: 'onboarding.budgetStandard' }, { value: 'flexible', labelKey: 'onboarding.budgetFlexible' },
      ] },
      { key: 'restaurantMealsPerWeek', labelKey: 'onboarding.restaurantMeals', kind: 'number', required: true, min: 0, max: 21, step: 1, defaultValue: '0' },
      { key: 'restaurantPreferences', labelKey: 'onboarding.restaurantPreferences', kind: 'textarea', visibleWhen: { field: 'restaurantMealsPerWeek', greaterThan: 0 }, requiredWhen: { field: 'restaurantMealsPerWeek', greaterThan: 0 } },
      { key: 'groceryPreferences', labelKey: 'onboarding.groceryPreferences', kind: 'textarea', required: true },
    ],
  },
  {
    key: 'training',
    titleKey: 'onboarding.training',
    fields: [
      { key: 'trainingDays', labelKey: 'onboarding.trainingDays', kind: 'number', required: true, min: 0, max: 7, step: 1 },
      { key: 'primaryActivity', labelKey: 'onboarding.activity', kind: 'select', options: [
        { value: 'strength', labelKey: 'onboarding.strength' }, { value: 'crossfit', labelKey: 'onboarding.crossfit' }, { value: 'cardio', labelKey: 'onboarding.cardio' }, { value: 'mixed', labelKey: 'onboarding.mixed' }, { value: 'none', labelKey: 'onboarding.notTraining' },
      ], visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingWeekdays', labelKey: 'onboarding.trainingWeekdays', kind: 'multiselect', options: [
        { value: '0', labelKey: 'onboarding.sunday' }, { value: '1', labelKey: 'onboarding.monday' }, { value: '2', labelKey: 'onboarding.tuesday' }, { value: '3', labelKey: 'onboarding.wednesday' }, { value: '4', labelKey: 'onboarding.thursday' }, { value: '5', labelKey: 'onboarding.friday' }, { value: '6', labelKey: 'onboarding.saturday' },
      ], visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 }, selectionCountField: 'trainingDays' },
      { key: 'trainingStartTime', labelKey: 'onboarding.trainingStartTime', kind: 'time', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingDuration', labelKey: 'onboarding.trainingDuration', kind: 'number', min: 10, max: 300, step: 5, defaultValue: '60', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingAvailability', labelKey: 'onboarding.trainingAvailability', kind: 'textarea', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'equipment', labelKey: 'onboarding.equipment', kind: 'textarea' },
      { key: 'workSchedule', labelKey: 'onboarding.schedule', kind: 'textarea', required: true },
    ],
  },
  {
    key: 'body',
    titleKey: 'onboarding.body',
    fields: [
      { key: 'bodyReportDate', labelKey: 'onboarding.bodyReportDate', kind: 'date' },
    ],
  },
  { key: 'review', titleKey: 'onboarding.review', fields: [] },
] as const

function conditionMatches(condition: OnboardingField['visibleWhen'], values: Record<string, string>) {
  if (!condition) return true
  const value = values[condition.field] ?? ''
  if (condition.equals !== undefined && value !== condition.equals) return false
  if (condition.notEquals !== undefined && value === condition.notEquals) return false
  if (condition.greaterThan !== undefined && !(Number(value) > condition.greaterThan)) return false
  return true
}

export function isFieldVisible(field: OnboardingField, values: Record<string, string>) {
  return conditionMatches(field.visibleWhen, values)
}

export function isFieldRequired(field: OnboardingField, values: Record<string, string>) {
  return Boolean(field.required || (field.requiredWhen && conditionMatches(field.requiredWhen, values)))
}

export const onboardingDefaultValues = Object.fromEntries(
  onboardingSections.flatMap((section) => section.fields)
    .filter((field) => field.defaultValue !== undefined)
    .map((field) => [field.key, field.defaultValue!]),
)

export function validateSection(section: OnboardingSection, values: Record<string, string>, locale: AppLocale = 'en') {
  const errors: Record<string, string> = {}
  section.fields.forEach((field) => {
    if (!isFieldVisible(field, values)) return
    const value = values[field.key]?.trim() ?? ''
    if (isFieldRequired(field, values) && !value) {
      errors[field.key] = locale === 'fa' ? 'تکمیل این فیلد ضروری است.' : 'This field is required.'
      return
    }
    if (field.kind === 'number' && value) {
      const number = Number(value)
      if (!Number.isFinite(number) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) {
        errors[field.key] = locale === 'fa'
          ? `عدد باید بین ${field.min ?? '—'} و ${field.max ?? '—'} باشد.`
          : `Use a number between ${field.min ?? '—'} and ${field.max ?? '—'}.`
      }
    }
    if (field.selectionCountField && value) {
      const selectedCount = new Set(value.split(',').filter(Boolean)).size
      const expectedCount = Number(values[field.selectionCountField])
      if (selectedCount !== expectedCount) {
        errors[field.key] = locale === 'fa'
          ? `دقیقاً ${expectedCount} روز را انتخاب کن.`
          : `Select exactly ${expectedCount} days.`
      }
    }
  })
  return errors
}
