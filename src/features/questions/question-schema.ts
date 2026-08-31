import type { TargetStrategyType } from '../../types/domain'
import { parseLocalizedNumber } from '../../lib/numbers/localized-number'

export type QuestionInputType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'list'

export interface QuestionOption {
  value: string
  label: string
}

export interface SchemaQuestion {
  id: string
  path: string
  group: string
  label: string
  question: string
  inputType: QuestionInputType
  required: boolean
  options?: QuestionOption[]
  placeholder?: string
  minimum?: number
  maximum?: number
  suffix?: string
  layout?: 'default' | 'full'
  requiredMessage?: string
  rangeMessage?: string
}

const sexOptions: QuestionOption[] = [
  { value: 'female', label: 'زن' },
  { value: 'male', label: 'مرد' },
  { value: 'other', label: 'سایر' },
  { value: 'prefer_not_to_say', label: 'ترجیح می‌دهم نگویم' },
]

const activityOptions: QuestionOption[] = [
  { value: 'sedentary', label: 'کم‌تحرک' },
  { value: 'light', label: 'فعالیت سبک' },
  { value: 'moderate', label: 'فعالیت متوسط' },
  { value: 'high', label: 'فعالیت زیاد' },
  { value: 'athlete', label: 'ورزشکار' },
]

const strategyTypes: Array<{
  value: TargetStrategyType
  label: string
}> = [
  { value: 'training_day', label: 'روز تمرین' },
  { value: 'rest_day', label: 'روز استراحت' },
  { value: 'crossfit_day', label: 'روز کراس‌فیت' },
  { value: 'cardio_day', label: 'روز هوازی' },
  { value: 'refeed_day', label: 'روز Refeed' },
  { value: 'diet_break', label: 'Diet Break' },
  { value: 'custom', label: 'سفارشی' },
]

export const onboardingProfileQuestions: SchemaQuestion[] = [
  {
    id: 'onboarding-name',
    path: 'name',
    group: 'profile',
    label: 'نام',
    question: 'نام شما چیست؟',
    inputType: 'text',
    required: true,
    layout: 'full',
    requiredMessage: 'نام را وارد کنید.',
  },
  {
    id: 'onboarding-height',
    path: 'heightCm',
    group: 'profile',
    label: 'قد',
    question: 'قد شما چند سانتی‌متر است؟',
    inputType: 'number',
    required: true,
    minimum: 100,
    maximum: 250,
    suffix: 'سانتی‌متر',
    requiredMessage: 'قد را وارد کنید.',
    rangeMessage: 'قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشد.',
  },
  {
    id: 'onboarding-current-weight',
    path: 'currentWeightKg',
    group: 'profile',
    label: 'وزن فعلی',
    question: 'وزن فعلی شما چند کیلوگرم است؟',
    inputType: 'number',
    required: true,
    minimum: 35,
    maximum: 350,
    suffix: 'کیلوگرم',
    requiredMessage: 'وزن فعلی را وارد کنید.',
    rangeMessage: 'وزن فعلی باید بین ۳۵ تا ۳۵۰ کیلوگرم باشد.',
  },
  {
    id: 'onboarding-target-weight',
    path: 'targetWeightKg',
    group: 'profile',
    label: 'وزن هدف',
    question: 'وزن هدف شما چند کیلوگرم است؟',
    inputType: 'number',
    required: true,
    minimum: 35,
    maximum: 350,
    suffix: 'کیلوگرم',
    layout: 'full',
    requiredMessage: 'وزن هدف را وارد کنید.',
    rangeMessage: 'وزن هدف باید بین ۳۵ تا ۳۵۰ کیلوگرم باشد.',
  },
]

const importQuestions: SchemaQuestion[] = [
  {
    id: 'import-age',
    path: 'profile.age',
    group: 'profile',
    label: 'سن',
    question: 'سن کاربر چند سال است؟',
    inputType: 'number',
    required: true,
    minimum: 13,
    maximum: 100,
  },
  {
    id: 'import-sex',
    path: 'profile.sex',
    group: 'profile',
    label: 'جنسیت',
    question: 'جنسیت کاربر چیست؟',
    inputType: 'select',
    required: true,
    options: sexOptions,
  },
  {
    id: 'import-activity',
    path: 'profile.activityLevel',
    group: 'profile',
    label: 'سطح فعالیت',
    question: 'سطح فعالیت روزانه کاربر چقدر است؟',
    inputType: 'select',
    required: true,
    options: activityOptions,
  },
  {
    id: 'import-meal-pattern',
    path: 'planningContext.requestedMealPattern',
    group: 'preferences',
    label: 'الگوی وعده‌ها',
    question: 'الگوی وعده‌های روزانه چگونه باشد؟',
    inputType: 'text',
    required: true,
    placeholder: 'مثلاً روز تمرین ۵ وعده و روز استراحت ۳ وعده',
  },
  {
    id: 'import-option-count',
    path: 'planningContext.preferredOptionCount',
    group: 'preferences',
    label: 'تعداد انتخاب‌ها',
    question: 'برای هر وعده چند گزینه غذایی لازم است؟',
    inputType: 'number',
    required: true,
    minimum: 1,
    maximum: 12,
  },
  ...[
    ['favoriteFoods', 'غذاهای مورد علاقه', 'غذاهای مورد علاقه را بنویس.'],
    ['dislikedFoods', 'غذاهای نامطلوب', 'غذاهایی که کاربر دوست ندارد را بنویس.'],
    ['allergies', 'حساسیت‌ها', 'حساسیت‌های غذایی را بنویس؛ اگر ندارد «ندارد» وارد کن.'],
    [
      'medicalConsiderations',
      'ملاحظات پزشکی',
      'ملاحظات پزشکی مرتبط را بنویس؛ اگر ندارد «ندارد» وارد کن.',
    ],
    ['medications', 'داروها', 'داروهای مرتبط را بنویس؛ اگر ندارد «ندارد» وارد کن.'],
    ['supplements', 'مکمل‌ها', 'مکمل‌های مصرفی را بنویس؛ اگر ندارد «ندارد» وارد کن.'],
    [
      'cookingConstraints',
      'محدودیت آشپزی',
      'محدودیت‌های زمانی یا اجرایی آشپزی را بنویس.',
    ],
    ['lifestyleNotes', 'سبک زندگی', 'نکات مهم سبک زندگی را بنویس.'],
  ].map(
    ([field, label, question]): SchemaQuestion => ({
      id: `import-${field}`,
      path: `planningContext.${field}`,
      group: 'preferences',
      label,
      question,
      inputType: 'list',
      required: true,
      placeholder: 'هر مورد را در یک خط بنویس',
    }),
  ),
]

export function getImportCompletionQuestion(path: string) {
  const exact = importQuestions.find((question) => question.path === path)
  if (exact) return exact

  const strategyMatch = path.match(/^days\[(\d+)\]\.targetStrategy$/)
  if (!strategyMatch) return undefined

  const dayNumber = Number(strategyMatch[1]) + 1
  return {
    id: `import-day-${dayNumber}-strategy`,
    path,
    group: 'targets',
    label: `استراتژی روز ${dayNumber}`,
    question: `استراتژی هدف روز ${dayNumber} چیست؟`,
    inputType: 'select',
    required: true,
    options: strategyTypes,
  } satisfies SchemaQuestion
}

export const promptQuestions: SchemaQuestion[] = [
  {
    id: 'profile-age',
    path: 'age',
    group: 'profile',
    label: 'سن',
    question: 'سن شما چند سال است؟',
    inputType: 'number',
    required: true,
    minimum: 13,
    maximum: 100,
  },
  {
    id: 'profile-sex',
    path: 'sex',
    group: 'profile',
    label: 'جنسیت',
    question: 'جنسیت شما چیست؟',
    inputType: 'select',
    required: true,
    options: sexOptions,
  },
  {
    id: 'profile-activity',
    path: 'activityLevel',
    group: 'profile',
    label: 'سطح فعالیت',
    question: 'سطح فعالیت روزانه شما چقدر است؟',
    inputType: 'select',
    required: true,
    options: activityOptions,
  },
  {
    id: 'goal-type',
    path: 'planningPreferences.goalType',
    group: 'goal',
    label: 'هدف اصلی',
    question: 'هدف اصلی شما از برنامه غذایی چیست؟',
    inputType: 'select',
    required: true,
    options: [
      { value: 'fat_loss', label: 'کاهش چربی' },
      { value: 'muscle_gain', label: 'افزایش عضله' },
      { value: 'maintenance', label: 'حفظ وزن' },
      { value: 'performance', label: 'بهبود عملکرد ورزشی' },
      { value: 'custom', label: 'هدف سفارشی' },
    ],
  },
  {
    id: 'diet-type',
    path: 'planningPreferences.dietType',
    group: 'preferences',
    label: 'نوع رژیم',
    question: 'الگوی غذایی یا نوع رژیم مورد نظر شما چیست؟',
    inputType: 'text',
    required: true,
    placeholder: 'مثلاً همه‌چیزخوار، گیاه‌خوار یا بدون گلوتن',
  },
  {
    id: 'custom-goal',
    path: 'planningPreferences.customGoal',
    group: 'goal',
    label: 'توضیح هدف',
    question: 'هدف سفارشی خود را دقیق‌تر توضیح دهید.',
    inputType: 'textarea',
    required: true,
  },
  {
    id: 'meal-pattern',
    path: 'planningPreferences.requestedMealPattern',
    group: 'preferences',
    label: 'الگوی وعده‌ها',
    question: 'در روز معمولاً چند وعده و میان‌وعده می‌خواهید؟',
    inputType: 'text',
    required: true,
  },
  {
    id: 'preferred-option-count',
    path: 'planningPreferences.preferredOptionCount',
    group: 'preferences',
    label: 'گزینه‌های هر وعده',
    question: 'برای هر وعده چند انتخاب جایگزین می‌خواهید؟',
    inputType: 'number',
    required: true,
    minimum: 1,
    maximum: 12,
  },
  ...[
    ['favoriteFoods', 'غذاهای مورد علاقه', 'غذاهای مورد علاقه‌تان را وارد کنید.'],
    ['dislikedFoods', 'غذاهای نامطلوب', 'چه غذاهایی را دوست ندارید؟'],
    ['allergies', 'حساسیت‌ها', 'حساسیت‌های غذایی را وارد کنید؛ اگر ندارید «ندارد».'],
    [
      'medicalConsiderations',
      'ملاحظات پزشکی',
      'ملاحظات پزشکی مرتبط را وارد کنید؛ اگر ندارید «ندارد».',
    ],
    ['medications', 'داروها', 'داروهای مرتبط را وارد کنید؛ اگر ندارید «ندارد».'],
    ['supplements', 'مکمل‌ها', 'مکمل‌های مصرفی را وارد کنید؛ اگر ندارید «ندارد».'],
    ['cookingLimitations', 'محدودیت آشپزی', 'محدودیت‌های آشپزی شما چیست؟'],
    ['availableEquipment', 'تجهیزات', 'چه تجهیزات آشپزی در دسترس دارید؟'],
    [
      'restaurantPreferences',
      'ترجیحات رستوران',
      'چه نوع رستوران‌ها، غذاها و سفارش‌هایی را ترجیح می‌دهید و چه محدودیتی دارید؟',
    ],
    [
      'groceryPreferences',
      'ترجیحات خرید',
      'برای خرید هفتگی چه فروشگاه، زمان‌بندی، مواد موجود یا ترجیحی دارید؟',
    ],
    ['lifestyleNotes', 'سبک زندگی', 'چه نکاتی از سبک زندگی باید در برنامه لحاظ شود؟'],
  ].map(
    ([field, label, question]): SchemaQuestion => ({
      id: `prompt-${field}`,
      path: `planningPreferences.${field}`,
      group: 'preferences',
      label,
      question,
      inputType: 'list',
      required: true,
      placeholder: 'هر مورد را در یک خط بنویس',
    }),
  ),
  {
    id: 'work-schedule',
    path: 'planningPreferences.workSchedule',
    group: 'lifestyle',
    label: 'برنامه کاری',
    question: 'ساعات و الگوی کاری شما چگونه است؟',
    inputType: 'textarea',
    required: true,
  },
  {
    id: 'budget',
    path: 'planningPreferences.budget',
    group: 'lifestyle',
    label: 'بودجه',
    question: 'محدوده بودجه غذایی شما چگونه است؟',
    inputType: 'text',
    required: true,
  },
  {
    id: 'restaurant-frequency',
    path: 'planningPreferences.restaurantMealsPerWeek',
    group: 'lifestyle',
    label: 'وعده بیرون',
    question: 'معمولاً چند وعده در هفته بیرون از خانه غذا می‌خورید؟',
    inputType: 'number',
    required: true,
    minimum: 0,
    maximum: 21,
  },
  {
    id: 'training-schedule',
    path: 'planningPreferences.trainingSchedule',
    group: 'training',
    label: 'برنامه تمرین',
    question: 'برنامه ماهانه تمرین را توضیح دهید.',
    inputType: 'textarea',
    required: true,
    placeholder: 'مثلاً شنبه کراس‌فیت ساعت ۱۸، دوشنبه پیاده‌روی ۴۵ دقیقه',
  },
]

function pathSegments(path: string) {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
}

export function getValueAtPath(value: unknown, path: string): unknown {
  return pathSegments(path).reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)
}

export function isPromptQuestionApplicable(
  question: SchemaQuestion,
  source: unknown,
) {
  if (question.id === 'custom-goal') {
    return (
      getValueAtPath(source, 'planningPreferences.goalType') === 'custom'
    )
  }

  if (question.id === 'training-schedule') {
    const activity = getValueAtPath(source, 'activityLevel')
    const goal = getValueAtPath(source, 'planningPreferences.goalType')
    return (
      activity !== 'sedentary' ||
      goal === 'performance' ||
      goal === 'muscle_gain'
    )
  }

  return true
}

export function setValueAtPath(
  source: unknown,
  path: string,
  value: unknown,
) {
  const clone = structuredClone(source) as Record<string, unknown>
  const segments = pathSegments(path)
  let current = clone

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }

    const next = current[segment]
    if (!next || typeof next !== 'object') {
      current[segment] = {}
    }
    current = current[segment] as Record<string, unknown>
  })

  return clone
}

export function parseQuestionValue(
  question: SchemaQuestion,
  rawValue: string,
) {
  if (question.inputType === 'number') {
    return parseLocalizedNumber(rawValue)
  }
  if (question.inputType === 'list') {
    return rawValue
      .split(/\n|،|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (question.path.endsWith('.targetStrategy')) {
    return { type: rawValue }
  }
  return rawValue.trim()
}

export function validateQuestionInput(
  question: SchemaQuestion,
  rawValue: string,
) {
  if (question.required && !rawValue.trim()) {
    return question.requiredMessage ?? `${question.label} را وارد کنید.`
  }

  if (question.inputType !== 'number' || !rawValue.trim()) return undefined

  const value = parseLocalizedNumber(rawValue)
  if (!Number.isFinite(value)) {
    return question.requiredMessage ?? `${question.label} را درست وارد کنید.`
  }

  if (
    (question.minimum !== undefined && value < question.minimum) ||
    (question.maximum !== undefined && value > question.maximum)
  ) {
    return (
      question.rangeMessage ??
      `${question.label} باید بین ${question.minimum} تا ${question.maximum} باشد.`
    )
  }

  return undefined
}
