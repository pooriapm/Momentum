import { z } from 'zod'
import type { WeeklyMealPlan } from '../../../types/domain'

const requiredText = (label: string, max = 240) =>
  z
    .string({ error: `${label} باید متن باشد.` })
    .trim()
    .min(1, `${label} نمی‌تواند خالی باشد.`)
    .max(max, `${label} بیش از حد طولانی است.`)

const idSchema = requiredText('شناسه', 120).regex(
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/,
  'شناسه فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره، زیرخط یا دونقطه باشد.',
)

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ باید با قالب YYYY-MM-DD باشد.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    )
  }, 'تاریخ معتبر نیست.')

const nonNegativeNumber = (label: string) =>
  z
    .number({ error: `${label} باید عدد باشد.` })
    .finite(`${label} باید عدد محدود باشد.`)
    .nonnegative(`${label} باید بزرگ‌تر یا مساوی صفر باشد.`)

const nutritionSchema = z
  .object({
    calories: nonNegativeNumber('کالری'),
    protein: nonNegativeNumber('پروتئین'),
    carbs: nonNegativeNumber('کربوهیدرات'),
    fat: nonNegativeNumber('چربی'),
    fiber: nonNegativeNumber('فیبر').optional(),
  })
  .strict()

const ingredientSchema = z
  .object({
    name: requiredText('نام ماده غذایی'),
    amount: nonNegativeNumber('مقدار ماده غذایی'),
    unit: z.enum(['g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving'], {
      error: 'واحد ماده غذایی معتبر نیست.',
    }),
    note: requiredText('توضیح ماده غذایی', 500).optional(),
  })
  .strict()

const mealOptionBase = {
  id: idSchema,
  title: requiredText('عنوان گزینه'),
  subtitle: requiredText('زیرعنوان گزینه', 500).optional(),
  ingredients: z.array(ingredientSchema).min(1, 'هر گزینه باید حداقل یک ماده غذایی داشته باشد.'),
  nutrition: nutritionSchema,
  preparation: z.array(requiredText('مرحله آماده‌سازی', 500)).max(30).optional(),
  prepTimeMinutes: nonNegativeNumber('زمان آماده‌سازی').max(1440).optional(),
  portable: z.boolean().optional(),
  restaurantFriendly: z.boolean().optional(),
  tags: z.array(requiredText('برچسب', 80)).max(30).optional(),
  warnings: z.array(requiredText('هشدار', 300)).max(30).optional(),
  satietyScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
}

const mealOptionSchema = z.object(mealOptionBase).strict()

const mealSlotSchema = z
  .object({
    id: idSchema,
    type: z.enum(
      [
        'breakfast',
        'morning_snack',
        'lunch',
        'afternoon_snack',
        'dinner',
        'pre_sleep',
        'emergency',
      ],
      { error: 'نوع وعده معتبر نیست.' },
    ),
    title: requiredText('عنوان وعده'),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'زمان وعده باید با قالب HH:mm باشد.')
      .optional(),
    xp: nonNegativeNumber('امتیاز وعده').max(1000),
    required: z.boolean({ error: 'required باید true یا false باشد.' }),
    defaultOptionId: idSchema,
    options: z.array(mealOptionSchema).min(1, 'هر وعده باید حداقل یک گزینه داشته باشد.'),
  })
  .strict()
  .superRefine((slot, context) => {
    const optionIds = slot.options.map((option) => option.id)

    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'شناسه گزینه‌ها در یک وعده نباید تکراری باشد.',
      })
    }

    if (!optionIds.includes(slot.defaultOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['defaultOptionId'],
        message: 'گزینه پیش‌فرض باید در فهرست options وجود داشته باشد.',
      })
    }
  })

const dayTargetsSchema = z
  .object({
    calories: nonNegativeNumber('کالری هدف'),
    protein: nonNegativeNumber('پروتئین هدف'),
    carbs: nonNegativeNumber('کربوهیدرات هدف').optional(),
    fat: nonNegativeNumber('چربی هدف').optional(),
    fiber: nonNegativeNumber('فیبر هدف').optional(),
    waterMl: nonNegativeNumber('آب هدف').optional(),
    steps: nonNegativeNumber('قدم هدف').optional(),
    treadmillMinutes: nonNegativeNumber('زمان تردمیل').optional(),
  })
  .strict()

const planDaySchema = z
  .object({
    date: isoDateSchema,
    label: requiredText('برچسب روز', 300).optional(),
    trainingType: z.enum(['rest', 'crossfit', 'full_body', 'cardio', 'walk']).optional(),
    targets: dayTargetsSchema,
    meals: z
      .array(mealSlotSchema)
      .min(1, 'هر روز باید حداقل یک وعده داشته باشد.')
      .max(24, 'تعداد وعده‌های یک روز نمی‌تواند بیشتر از ۲۴ باشد.'),
    notes: z.array(requiredText('یادداشت روز', 500)).max(30).optional(),
  })
  .strict()
  .superRefine((day, context) => {
    const mealIds = day.meals.map((meal) => meal.id)

    if (new Set(mealIds).size !== mealIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['meals'],
        message: 'شناسه وعده‌ها در یک روز نباید تکراری باشد.',
      })
    }
  })

const emergencyOptionSchema = z
  .object({
    ...mealOptionBase,
    suitableForHungerLevels: z
      .array(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]))
      .min(1, 'حداقل یک سطح گرسنگی لازم است.'),
    minimumMinutesBeforeDinner: nonNegativeNumber('حداقل فاصله تا شام').optional(),
    maximumMinutesBeforeDinner: nonNegativeNumber('حداکثر فاصله تا شام').optional(),
  })
  .strict()

const restaurantChoiceSchema = z
  .object({
    id: idSchema,
    category: requiredText('دسته رستوران'),
    title: requiredText('عنوان انتخاب رستورانی'),
    orderInstructions: z
      .array(requiredText('راهنمای سفارش', 500))
      .min(1, 'حداقل یک راهنمای سفارش لازم است.'),
    estimatedNutrition: nutritionSchema,
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    notes: z.array(requiredText('یادداشت رستوران', 500)).max(30).optional(),
  })
  .strict()

const groceryItemSchema = z
  .object({
    name: requiredText('نام قلم خرید'),
    amount: nonNegativeNumber('مقدار قلم خرید').optional(),
    unit: requiredText('واحد قلم خرید', 50).optional(),
    note: requiredText('یادداشت قلم خرید', 300).optional(),
  })
  .strict()

const profileWeightSchema = (label: string) =>
  z
    .number({ error: `${label} باید عدد باشد.` })
    .finite(`${label} باید عدد محدود باشد.`)
    .min(35, `${label} باید حداقل ۳۵ کیلوگرم باشد.`)
    .max(350, `${label} نمی‌تواند بیشتر از ۳۵۰ کیلوگرم باشد.`)

const optionalMetric = (label: string, maximum: number) =>
  nonNegativeNumber(label).max(maximum, `${label} از بازه قابل قبول خارج است.`).optional()

const bodyCompositionSchema = z
  .object({
    measuredAt: isoDateSchema.optional(),
    sourceType: z.enum(['image', 'pdf', 'scan', 'manual']).optional(),
    bodyFatPercent: optionalMetric('درصد چربی بدن', 80),
    fatMassKg: optionalMetric('توده چربی', 350),
    leanMassKg: optionalMetric('توده بدون چربی', 350),
    skeletalMuscleMassKg: optionalMetric('توده عضله اسکلتی', 250),
    visceralFatRating: optionalMetric('شاخص چربی احشایی', 100),
    waistCm: optionalMetric('دور کمر', 300),
    basalMetabolicRate: optionalMetric('متابولیسم پایه', 10_000),
    notes: z.array(requiredText('یادداشت ترکیب بدن', 500)).max(30).optional(),
  })
  .strict()

const importedProfileSchema = z
  .object({
    name: requiredText('نام کاربر', 120),
    age: z
      .number({ error: 'سن باید عدد باشد.' })
      .int('سن باید عدد صحیح باشد.')
      .min(13, 'سن باید حداقل ۱۳ سال باشد.')
      .max(100, 'سن نمی‌تواند بیشتر از ۱۰۰ سال باشد.'),
    sex: z.enum(['female', 'male', 'other', 'prefer_not_to_say'], {
      error: 'جنسیت معتبر نیست.',
    }),
    heightCm: z
      .number({ error: 'قد باید عدد باشد.' })
      .finite('قد باید عدد محدود باشد.')
      .min(100, 'قد باید حداقل ۱۰۰ سانتی‌متر باشد.')
      .max(250, 'قد نمی‌تواند بیشتر از ۲۵۰ سانتی‌متر باشد.'),
    currentWeightKg: profileWeightSchema('وزن فعلی'),
    targetWeightKg: profileWeightSchema('وزن هدف'),
    startWeightKg: profileWeightSchema('وزن شروع'),
    goalDate: isoDateSchema,
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'high', 'athlete'], {
      error: 'سطح فعالیت معتبر نیست.',
    }),
    bodyComposition: bodyCompositionSchema.optional(),
  })
  .strict()

const contextTextList = (label: string) =>
  z.array(requiredText(label, 300)).max(50, `${label} بیش از حد طولانی است.`)

const trainingScheduleSchema = z
  .object({
    day: requiredText('روز تمرین', 80),
    type: z.enum(['rest', 'crossfit', 'full_body', 'cardio', 'walk']),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'زمان تمرین باید با قالب HH:mm باشد.')
      .optional(),
    durationMinutes: nonNegativeNumber('مدت تمرین').max(1440).optional(),
    intensity: z.enum(['low', 'moderate', 'high']).optional(),
    notes: requiredText('یادداشت تمرین', 500).optional(),
  })
  .strict()

const planningContextSchema = z
  .object({
    requestedMealPattern: requiredText('الگوی وعده‌های درخواستی', 500),
    preferredOptionCount: z
      .number({ error: 'تعداد گزینه ترجیحی باید عدد باشد.' })
      .int('تعداد گزینه ترجیحی باید عدد صحیح باشد.')
      .min(1, 'برای هر وعده حداقل یک گزینه لازم است.')
      .max(12, 'تعداد گزینه ترجیحی هر وعده نمی‌تواند بیشتر از ۱۲ باشد.'),
    dietaryPattern: requiredText('الگوی غذایی', 200).optional(),
    favoriteFoods: contextTextList('غذاهای مورد علاقه'),
    dislikedFoods: contextTextList('غذاهای نامطلوب'),
    allergies: contextTextList('حساسیت‌های غذایی'),
    medicalConsiderations: contextTextList('ملاحظات پزشکی'),
    medications: contextTextList('داروها'),
    supplements: contextTextList('مکمل‌ها'),
    cookingConstraints: contextTextList('محدودیت‌های آشپزی'),
    lifestyleNotes: contextTextList('نکات سبک زندگی'),
    trainingSchedule: z.array(trainingScheduleSchema).max(31),
  })
  .strict()

export const weeklyMealPlanSchema = z
  .object({
    schemaVersion: z.literal('0.1.0', {
      error: 'schemaVersion این نسخه آلفا باید دقیقاً 0.1.0 باشد.',
    }),
    planId: idSchema,
    planName: requiredText('نام برنامه'),
    planVersion: requiredText('نسخه برنامه', 80).regex(
      /^0\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
      'نسخه برنامه در دوره آلفا باید Semantic Version و کوچک‌تر از 1.0.0 باشد.',
    ),
    generatedAt: z.iso.datetime({
      offset: true,
      error: 'generatedAt باید تاریخ و زمان ISO معتبر باشد.',
    }),
    validFrom: isoDateSchema,
    validTo: isoDateSchema,
    locale: z.literal('fa-IR', { error: 'locale باید fa-IR باشد.' }),
    direction: z.literal('rtl', { error: 'direction باید rtl باشد.' }),
    unitSystem: z.literal('metric', { error: 'unitSystem باید metric باشد.' }),
    profile: importedProfileSchema,
    planningContext: planningContextSchema,
    author: requiredText('نام نویسنده', 200).optional(),
    description: requiredText('توضیحات برنامه', 1000).optional(),
    defaultTargets: dayTargetsSchema,
    days: z.array(planDaySchema).min(1, 'برنامه باید حداقل یک روز داشته باشد.').max(60),
    emergencyOptions: z.array(emergencyOptionSchema).max(100),
    restaurantGuide: z.array(restaurantChoiceSchema).max(100).optional(),
    groceryList: z
      .array(
        z
          .object({
            category: requiredText('دسته لیست خرید'),
            items: z.array(groceryItemSchema).min(1, 'هر دسته خرید باید حداقل یک قلم داشته باشد.'),
          })
          .strict(),
      )
      .max(100)
      .optional(),
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.validFrom > plan.validTo) {
      context.addIssue({
        code: 'custom',
        path: ['validTo'],
        message: 'validTo نباید قبل از validFrom باشد.',
      })
    }

    const dayDates = plan.days.map((day) => day.date)

    if (new Set(dayDates).size !== dayDates.length) {
      context.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'تاریخ روزهای برنامه نباید تکراری باشد.',
      })
    }

    plan.days.forEach((day, index) => {
      if (day.date < plan.validFrom || day.date > plan.validTo) {
        context.addIssue({
          code: 'custom',
          path: ['days', index, 'date'],
          message: 'تاریخ روز خارج از بازه اعلام‌شده برنامه است.',
        })
      }
    })
  })

export interface PlanValidationResult {
  success: boolean
  data?: WeeklyMealPlan
  errors: Array<{ path: string; message: string }>
  warnings: string[]
}

function findUnsafeText(value: unknown, path = ''): Array<{ path: string; message: string }> {
  if (typeof value === 'string') {
    if (/javascript\s*:|<\s*script/i.test(value)) {
      return [{ path: path || 'root', message: 'متن یا نشانی ناامن در فایل پیدا شد.' }]
    }
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findUnsafeText(item, `${path}[${index}]`))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      findUnsafeText(item, path ? `${path}.${key}` : key),
    )
  }

  return []
}

export function validateWeeklyMealPlan(value: unknown): PlanValidationResult {
  const unsafeErrors = findUnsafeText(value)

  if (unsafeErrors.length > 0) {
    return { success: false, errors: unsafeErrors, warnings: [] }
  }

  const result = weeklyMealPlanSchema.safeParse(value)

  if (!result.success) {
    return {
      success: false,
      data: undefined,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.reduce<string>(
          (current, segment) =>
            typeof segment === 'number'
              ? `${current}[${segment}]`
              : current
                ? `${current}.${String(segment)}`
                : String(segment),
          '',
        ),
        message: issue.message,
      })),
      warnings: [],
    }
  }

  const warnings: string[] = []
  const plan = result.data as WeeklyMealPlan
  const coverageDays =
    Math.floor(
      (new Date(`${plan.validTo}T00:00:00Z`).getTime() -
        new Date(`${plan.validFrom}T00:00:00Z`).getTime()) /
        86_400_000,
    ) + 1

  if (plan.days.length < coverageDays) {
    warnings.push('برای بعضی روزهای بازه اعلام‌شده، برنامه غذایی تعریف نشده است.')
  }

  if (plan.emergencyOptions.length === 0) {
    warnings.push('گزینه‌ای برای گرسنگی اضطراری در فایل وجود ندارد.')
  }

  return { success: true, data: plan, errors: [], warnings }
}
