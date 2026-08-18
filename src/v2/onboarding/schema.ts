import type { AppLocale } from '../../platform/i18n/catalog'

export type OnboardingStepKey = 'basics' | 'health' | 'consent' | 'goal' | 'food' | 'training' | 'body' | 'review'
export type FieldKind = 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'textarea' | 'checkbox'

interface FieldOption {
  value: string
  labelKey: string
}

export interface FieldCondition {
  field: string
  equals?: string
  notEquals?: string
  greaterThan?: number
  oneOf?: readonly string[]
  and?: FieldCondition
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
  optionSource?: 'countries' | 'allergens'
  placeholder?: Record<AppLocale, string>
  defaultValue?: string
  visibleWhen?: FieldCondition
  requiredWhen?: FieldCondition
  selectionCountField?: string
  maxDigits?: number
  stepper?: boolean
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

export const ALLERGEN_CATALOG = [
  { value: 'milk', labelKey: 'onboarding.allergenMilk' },
  { value: 'egg', labelKey: 'onboarding.allergenEgg' },
  { value: 'peanut', labelKey: 'onboarding.allergenPeanut' },
  { value: 'tree_nut', labelKey: 'onboarding.allergenTreeNut' },
  { value: 'wheat', labelKey: 'onboarding.allergenWheat' },
  { value: 'soy', labelKey: 'onboarding.allergenSoy' },
  { value: 'fish', labelKey: 'onboarding.allergenFish' },
  { value: 'shellfish', labelKey: 'onboarding.allergenShellfish' },
  { value: 'sesame', labelKey: 'onboarding.allergenSesame' },
  { value: 'other', labelKey: 'onboarding.allergenOther' },
] as const

export const UNMAPPED_ALLERGEN = 'other'

export const TRAINING_DURATION_PRESETS = ['30', '45', '60', '75', '90', '120'] as const

const weekdayOptions = [
  { value: '0', labelKey: 'onboarding.sunday' },
  { value: '1', labelKey: 'onboarding.monday' },
  { value: '2', labelKey: 'onboarding.tuesday' },
  { value: '3', labelKey: 'onboarding.wednesday' },
  { value: '4', labelKey: 'onboarding.thursday' },
  { value: '5', labelKey: 'onboarding.friday' },
  { value: '6', labelKey: 'onboarding.saturday' },
] as const

export const onboardingSections: readonly OnboardingSection[] = [
  {
    key: 'basics',
    titleKey: 'onboarding.basics',
    fields: [
      { key: 'firstName', labelKey: 'onboarding.firstName', kind: 'text', required: true },
      { key: 'birthDate', labelKey: 'onboarding.birthDate', kind: 'date', required: true },
      { key: 'adultConfirmed', labelKey: 'onboarding.adultConfirm', kind: 'select', required: true, options: yesNoOptions },
      { key: 'sex', labelKey: 'onboarding.sex', kind: 'select', required: true, options: [
        { value: 'female', labelKey: 'onboarding.female' },
        { value: 'male', labelKey: 'onboarding.male' },
        { value: 'undisclosed', labelKey: 'onboarding.undisclosed' },
      ] },
      { key: 'heightCm', labelKey: 'onboarding.height', kind: 'number', required: true, min: 120, max: 230, step: 0.1, maxDigits: 3 },
      { key: 'weightKg', labelKey: 'onboarding.weight', kind: 'number', required: true, min: 35, max: 350, step: 0.1, maxDigits: 3 },
      { key: 'country', labelKey: 'onboarding.country', kind: 'select', required: true, optionSource: 'countries' },
    ],
  },
  {
    key: 'health',
    titleKey: 'onboarding.health',
    fields: [
      { key: 'pregnancyOrBreastfeeding', labelKey: 'onboarding.pregnancy', kind: 'select', required: true, options: yesNoOptions },
      { key: 'eatingDisorderHistory', labelKey: 'onboarding.eatingDisorder', kind: 'select', required: true, options: yesNoOptions },
      { key: 'highRiskCondition', labelKey: 'onboarding.highRisk', kind: 'select', required: true, options: yesNoOptions },
      { key: 'urgentSymptoms', labelKey: 'onboarding.urgentSymptoms', kind: 'select', required: true, options: yesNoOptions },
      { key: 'injuryLimitation', labelKey: 'onboarding.injury', kind: 'select', required: true, options: yesNoOptions },
      { key: 'medications', labelKey: 'onboarding.medications', kind: 'textarea' },
      { key: 'medicalNotes', labelKey: 'onboarding.medicalNotes', kind: 'textarea' },
      { key: 'supplements', labelKey: 'onboarding.supplements', kind: 'textarea' },
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
    key: 'goal',
    titleKey: 'onboarding.goal',
    fields: [
      { key: 'goalType', labelKey: 'onboarding.goal', kind: 'select', required: true, options: [
        { value: 'fat_loss', labelKey: 'onboarding.loss' },
        { value: 'muscle_gain', labelKey: 'onboarding.gain' },
        { value: 'maintenance', labelKey: 'onboarding.maintain' },
      ] },
      { key: 'targetWeightKg', labelKey: 'onboarding.targetWeight', kind: 'number', min: 35, max: 350, step: 0.1, visibleWhen: { field: 'goalType', notEquals: 'maintenance' } },
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
      { key: 'allergies', labelKey: 'onboarding.allergies', kind: 'multiselect', optionSource: 'allergens', options: ALLERGEN_CATALOG },
      { key: 'favoriteFoods', labelKey: 'onboarding.favoriteFoods', kind: 'textarea' },
      { key: 'dislikedFoods', labelKey: 'onboarding.dislikedFoods', kind: 'textarea' },
      { key: 'requestedMealCount', labelKey: 'onboarding.mealCount', kind: 'select', required: true, defaultValue: '3', options: [
        { value: '2', labelKey: 'onboarding.mealCount2' },
        { value: '3', labelKey: 'onboarding.mealCount3' },
        { value: '4', labelKey: 'onboarding.mealCount4' },
        { value: '5', labelKey: 'onboarding.mealCount5' },
        { value: '6', labelKey: 'onboarding.mealCount6' },
      ] },
      { key: 'requestedMealPattern', labelKey: 'onboarding.mealPattern', kind: 'textarea' },
      { key: 'preferredOptionCount', labelKey: 'onboarding.optionCount', kind: 'number', min: 1, max: 4, step: 1, defaultValue: '3', stepper: true },
      { key: 'cookingConstraints', labelKey: 'onboarding.cookingConstraints', kind: 'textarea' },
      { key: 'foodBudget', labelKey: 'onboarding.budget', kind: 'select', options: [
        { value: 'budget', labelKey: 'onboarding.budgetLow' }, { value: 'standard', labelKey: 'onboarding.budgetStandard' }, { value: 'flexible', labelKey: 'onboarding.budgetFlexible' },
      ] },
      { key: 'restaurantMealsPerWeek', labelKey: 'onboarding.restaurantMeals', kind: 'number', min: 0, max: 21, step: 1, defaultValue: '0' },
      { key: 'restaurantPreferences', labelKey: 'onboarding.restaurantPreferences', kind: 'textarea', visibleWhen: { field: 'restaurantMealsPerWeek', greaterThan: 0 } },
      { key: 'groceryPreferences', labelKey: 'onboarding.groceryPreferences', kind: 'textarea' },
    ],
  },
  {
    key: 'training',
    titleKey: 'onboarding.training',
    fields: [
      { key: 'trainingDays', labelKey: 'onboarding.trainingDays', kind: 'number', required: true, min: 0, max: 7, step: 1, defaultValue: '0', stepper: true },
      { key: 'trainingDurationPreset', labelKey: 'onboarding.durationPreset', kind: 'select', options: [
        { value: '30', labelKey: 'onboarding.duration30' },
        { value: '45', labelKey: 'onboarding.duration45' },
        { value: '60', labelKey: 'onboarding.duration60' },
        { value: '75', labelKey: 'onboarding.duration75' },
        { value: '90', labelKey: 'onboarding.duration90' },
        { value: '120', labelKey: 'onboarding.duration120' },
        { value: 'custom', labelKey: 'onboarding.durationCustom' },
      ], defaultValue: '60', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingDuration', labelKey: 'onboarding.trainingDuration', kind: 'number', min: 15, max: 120, step: 5, defaultValue: '60', visibleWhen: { field: 'trainingDurationPreset', equals: 'custom', and: { field: 'trainingDays', greaterThan: 0 } }, requiredWhen: { field: 'trainingDurationPreset', equals: 'custom', and: { field: 'trainingDays', greaterThan: 0 } } },
      { key: 'trainingLocation', labelKey: 'onboarding.trainingLocation', kind: 'select', options: [
        { value: 'home', labelKey: 'onboarding.locationHome' },
        { value: 'gym', labelKey: 'onboarding.locationGym' },
        { value: 'outdoor', labelKey: 'onboarding.locationOutdoor' },
      ], visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'primaryActivity', labelKey: 'onboarding.activity', kind: 'select', options: [
        { value: 'strength', labelKey: 'onboarding.strength' }, { value: 'crossfit', labelKey: 'onboarding.crossfit' }, { value: 'cardio', labelKey: 'onboarding.cardio' }, { value: 'mixed', labelKey: 'onboarding.mixed' }, { value: 'none', labelKey: 'onboarding.notTraining' },
      ], visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingExperience', labelKey: 'onboarding.trainingExperience', kind: 'select', options: [
        { value: 'beginner', labelKey: 'onboarding.beginner' },
        { value: 'intermediate', labelKey: 'onboarding.intermediate' },
        { value: 'advanced', labelKey: 'onboarding.advanced' },
      ], visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingWeekdays', labelKey: 'onboarding.trainingWeekdays', kind: 'multiselect', options: weekdayOptions, visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 }, selectionCountField: 'trainingDays' },
      { key: 'trainingStartTime', labelKey: 'onboarding.trainingStartTime', kind: 'time', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'trainingAvailability', labelKey: 'onboarding.trainingAvailability', kind: 'textarea', visibleWhen: { field: 'trainingDays', greaterThan: 0 }, requiredWhen: { field: 'trainingDays', greaterThan: 0 } },
      { key: 'equipment', labelKey: 'onboarding.equipment', kind: 'textarea', visibleWhen: { field: 'trainingLocation', oneOf: ['home', 'gym'] } },
      { key: 'workSchedule', labelKey: 'onboarding.schedule', kind: 'textarea', required: true },
    ],
  },
  {
    key: 'body',
    titleKey: 'onboarding.body',
    fields: [
      { key: 'bodySource', labelKey: 'onboarding.bodySource', kind: 'select', options: [
        { value: 'manual', labelKey: 'onboarding.sourceManual' },
        { value: 'report', labelKey: 'onboarding.sourceReport' },
      ] },
      { key: 'bodyFatPercent', labelKey: 'onboarding.bodyFat', kind: 'number', min: 3, max: 60, step: 0.1 },
      { key: 'waistCm', labelKey: 'onboarding.waist', kind: 'number', min: 40, max: 200, step: 0.1 },
      { key: 'bodyReportDate', labelKey: 'onboarding.bodyReportDate', kind: 'date' },
    ],
  },
  { key: 'review', titleKey: 'onboarding.review', fields: [] },
] as const

export const D11_STEP_ORDER: readonly OnboardingStepKey[] = onboardingSections.map((section) => section.key)

function conditionMatches(condition: FieldCondition | undefined, values: Record<string, string>) {
  if (!condition) return true
  const value = values[condition.field] ?? ''
  if (condition.equals !== undefined && value !== condition.equals) return false
  if (condition.notEquals !== undefined && value === condition.notEquals) return false
  if (condition.greaterThan !== undefined && !(Number(value) > condition.greaterThan)) return false
  if (condition.oneOf !== undefined && !condition.oneOf.includes(value)) return false
  if (condition.and && !conditionMatches(condition.and, values)) return false
  return true
}

export function isFieldVisible(field: OnboardingField, values: Record<string, string>) {
  return conditionMatches(field.visibleWhen, values)
}

export function isFieldRequired(field: OnboardingField, values: Record<string, string>) {
  return Boolean(field.required || (field.requiredWhen && conditionMatches(field.requiredWhen, values)))
}

export function onboardingFieldByKey(key: string) {
  return onboardingSections.flatMap((section) => section.fields).find((field) => field.key === key)
}

export function onboardingOptionLabelKey(fieldKey: string, value: string) {
  return onboardingFieldByKey(fieldKey)?.options?.find((option) => option.value === value)?.labelKey
}

export const onboardingDefaultValues = Object.fromEntries(
  onboardingSections.flatMap((section) => section.fields)
    .filter((field) => field.defaultValue !== undefined)
    .map((field) => [field.key, field.defaultValue!]),
)

export function ageFromBirthDate(iso: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [year, month, day] = iso.split('-').map(Number)
  let age = now.getFullYear() - year
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1
  return age
}

export function selectedValues(raw: string | undefined) {
  return raw?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

export function hasUnmappedAllergen(values: Record<string, string>) {
  return selectedValues(values.allergies).includes(UNMAPPED_ALLERGEN)
}

export function weekdayOptionsForLocale(locale: AppLocale) {
  const field = onboardingFieldByKey('trainingWeekdays')
  const options = field?.options ?? []
  if (locale !== 'fa') return options
  const saturdayFirst = ['6', '0', '1', '2', '3', '4', '5']
  return [...options].sort((left, right) => saturdayFirst.indexOf(left.value) - saturdayFirst.indexOf(right.value))
}

function requiredMessage(locale: AppLocale) {
  return locale === 'fa' ? 'تکمیل این فیلد ضروری است.' : 'This field is required.'
}

export function validateSection(section: OnboardingSection, values: Record<string, string>, locale: AppLocale = 'en') {
  const errors: Record<string, string> = {}
  section.fields.forEach((field) => {
    if (!isFieldVisible(field, values)) return
    const value = values[field.key]?.trim() ?? ''
    if (isFieldRequired(field, values) && !value) {
      errors[field.key] = requiredMessage(locale)
      return
    }
    if (field.key === 'birthDate' && value) {
      const age = ageFromBirthDate(value)
      if (age == null || age < 18) {
        errors[field.key] = locale === 'fa'
          ? 'تاریخ معتبر وارد کن؛ باید حداقل ۱۸ سال داشته باشی.'
          : 'Enter a valid date; you must be at least 18.'
        return
      }
    }
    if (field.key === 'adultConfirmed' && value === 'no') {
      errors[field.key] = locale === 'fa'
        ? 'این سرویس فقط برای افراد ۱۸ ساله و بالاتر است.'
        : 'This service is only for adults aged 18 and older.'
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
      const selectedCount = new Set(selectedValues(value)).size
      const expectedCount = Number(values[field.selectionCountField])
      if (selectedCount !== expectedCount) {
        errors[field.key] = locale === 'fa'
          ? `دقیقاً ${expectedCount} روز را انتخاب کن.`
          : `Select exactly ${expectedCount} days.`
      }
    }
  })
  if (section.key === 'training' && values.trainingDurationPreset === 'custom' && Number(values.trainingDays) > 0) {
    const duration = Number(values.trainingDuration)
    if (!Number.isFinite(duration) || duration < 15 || duration > 120) {
      errors.trainingDuration = locale === 'fa'
        ? 'مدت باید بین ۱۵ تا ۱۲۰ دقیقه باشد.'
        : 'Duration must be between 15 and 120 minutes.'
    }
  }
  return errors
}
