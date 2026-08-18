import type { AppLocale } from '../../platform/i18n/catalog'
import {
  D11_STEP_ORDER,
  TRAINING_DURATION_PRESETS,
  hasUnmappedAllergen,
  isFieldRequired,
  isFieldVisible,
  onboardingDefaultValues,
  onboardingSections,
  type OnboardingField,
  type OnboardingSection,
  type OnboardingStepKey,
  validateSection,
} from './schema'

export type HealthScreeningOutcome = 'incomplete' | 'eligible' | 'blocked' | 'urgent'

export function healthScreeningOutcome(values: Record<string, string>): HealthScreeningOutcome {
  const health = onboardingSections.find((section) => section.key === 'health')!
  if (Object.keys(validateSection(health, values)).length > 0) return 'incomplete'
  if (values.urgentSymptoms === 'yes') return 'urgent'
  if (
    values.pregnancyOrBreastfeeding === 'yes' ||
    values.eatingDisorderHistory === 'yes' ||
    values.highRiskCondition === 'yes'
  ) {
    return 'blocked'
  }
  return 'eligible'
}

export function isHealthCollectingStopped(values: Record<string, string>) {
  const outcome = healthScreeningOutcome(values)
  return outcome === 'blocked' || outcome === 'urgent'
}

function hasBodyInput(values: Record<string, string>) {
  return Boolean(
    values.bodySkipped === 'yes' ||
    values.bodyFatPercent ||
    values.waistCm ||
    values.bodyReportPath ||
    values.bodyReportId ||
    values.bodySource,
  )
}

function isFieldFilled(field: OnboardingField, values: Record<string, string>) {
  const value = values[field.key]?.trim() ?? ''
  if (field.kind === 'checkbox') return value === 'yes'
  return value.length > 0
}

function sectionProgressUnits(section: OnboardingSection, values: Record<string, string>) {
  if (section.key === 'review') return { filled: 0, total: 1 }
  if (section.key === 'body') return { filled: hasBodyInput(values) ? 1 : 0, total: 1 }
  const fields = section.fields.filter((field) => isFieldVisible(field, values) && isFieldRequired(field, values))
  if (fields.length === 0) return { filled: 0, total: 1 }
  return {
    filled: fields.filter((field) => isFieldFilled(field, values)).length,
    total: fields.length,
  }
}

export function onboardingProgressPercent(step: OnboardingStepKey, values: Record<string, string>, locale: AppLocale = 'en') {
  const currentIndex = Math.max(0, D11_STEP_ORDER.indexOf(step))
  let earned = 0
  let total = 0

  for (const [index, section] of onboardingSections.entries()) {
    const units = sectionProgressUnits(section, values)
    total += units.total
    if (section.key === 'review') {
      if (index <= currentIndex) earned += units.total
      continue
    }
    if (index < currentIndex || isSectionComplete(section.key, values, locale)) {
      earned += units.total
      continue
    }
    if (index === currentIndex) earned += units.filled
  }

  if (total <= 0) return 0
  return Math.min(100, Math.round((earned / total) * 100))
}

export function isSectionComplete(step: OnboardingStepKey, values: Record<string, string>, locale: AppLocale = 'en') {
  const section = onboardingSections.find((item) => item.key === step)
  if (!section) return false
  if (step === 'review') return false
  if (step === 'body') return hasBodyInput(values)
  if (step === 'health' && isHealthCollectingStopped(values)) return true
  return Object.keys(validateSection(section, values, locale)).length === 0
}

export function canVisitStep(step: OnboardingStepKey, values: Record<string, string>, locale: AppLocale = 'en') {
  const targetIndex = D11_STEP_ORDER.indexOf(step)
  if (targetIndex <= 0) return true
  const basicsComplete = isSectionComplete('basics', values, locale)
  if (!basicsComplete) return step === 'basics'
  const outcome = healthScreeningOutcome(values)
  if (outcome === 'blocked' || outcome === 'urgent') return step === 'basics' || step === 'health'
  for (const candidate of D11_STEP_ORDER.slice(0, targetIndex)) {
    if (candidate === 'body') continue
    if (!isSectionComplete(candidate, values, locale)) return false
  }
  return true
}

export function earliestIncompleteStep(values: Record<string, string>, locale: AppLocale = 'en'): OnboardingStepKey {
  if (!isSectionComplete('basics', values, locale)) return 'basics'
  const outcome = healthScreeningOutcome(values)
  if (outcome !== 'eligible') return 'health'
  for (const step of D11_STEP_ORDER) {
    if (step === 'review') return 'review'
    if (isSectionComplete(step, values, locale)) continue
    return step
  }
  return 'review'
}

export function nextOnboardingStep(step: OnboardingStepKey): OnboardingStepKey {
  const index = D11_STEP_ORDER.indexOf(step)
  return D11_STEP_ORDER[Math.min(index + 1, D11_STEP_ORDER.length - 1)]
}

export function previousOnboardingStep(step: OnboardingStepKey): OnboardingStepKey {
  const index = D11_STEP_ORDER.indexOf(step)
  return D11_STEP_ORDER[Math.max(index - 1, 0)]
}

export function resolvedTrainingDuration(values: Record<string, string>) {
  const preset = values.trainingDurationPreset
  if (preset && (TRAINING_DURATION_PRESETS as readonly string[]).includes(preset)) return preset
  return values.trainingDuration || onboardingDefaultValues.trainingDuration
}

export function prepareCompletionValues(values: Record<string, string>) {
  const next = { ...values }
  if (next.goalType && next.goalType !== 'maintenance' && !next.targetWeightKg?.trim()) {
    next.targetWeightKg = next.weightKg
  }
  if (next.trainingDays && Number(next.trainingDays) > 0) {
    next.trainingDuration = resolvedTrainingDuration(next)
  }
  return next
}

export function hasMeaningfulDraft(values: Record<string, string>) {
  return Object.entries(values).some(([key, value]) => {
    if (!value?.trim()) return false
    if (onboardingDefaultValues[key] === value) return false
    if (key === 'onboardingFlowId' || key === 'locale' || key === 'timezone') return false
    return true
  })
}

export function generationBlockedReason(values: Record<string, string>, locale: AppLocale = 'en') {
  const fa = locale === 'fa'
  const outcome = healthScreeningOutcome(values)
  if (outcome === 'urgent') {
    return fa
      ? 'اگر علامت شدید یا ناگهانی داری با خدمات اضطراری محل زندگی تماس بگیر. هیچ درخواست ماهانه‌ای مصرف نشده است.'
      : 'Contact local emergency services for severe or sudden symptoms. No monthly request has been used.'
  }
  if (outcome === 'blocked') {
    return fa
      ? 'پاسخ ثبت‌شده به ارزیابی یک متخصص سلامت دارای صلاحیت نیاز دارد. هیچ درخواست ماهانه‌ای مصرف نشده است.'
      : 'The reported answer needs assessment by a qualified health professional. No monthly request has been consumed.'
  }
  if (hasUnmappedAllergen(values)) {
    return fa
      ? 'گزینه «سایر» ساخت برنامه را تا مسیر انسانی متوقف می‌کند.'
      : 'Other blocks generation until a mapped catalog path exists.'
  }
  return ''
}
