import type { MealOption, WeeklyMealPlan } from '../../../types/domain'

export type PlanHealthSeverity = 'positive' | 'notice' | 'warning'

export interface PlanHealthInsight {
  id: string
  title: string
  message: string
  suggestion?: string
  severity: PlanHealthSeverity
  impact: number
}

export interface PlanHealthScore {
  score: number
  label: string
  insights: PlanHealthInsight[]
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function defaultOptions(plan: WeeklyMealPlan): MealOption[] {
  return plan.days.flatMap((day) =>
    day.meals.map(
      (meal) =>
        meal.options.find((option) => option.id === meal.defaultOptionId) ??
        meal.options[0],
    ),
  )
}

function minutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export function analyzePlanHealth(plan: WeeklyMealPlan): PlanHealthScore {
  const insights: PlanHealthInsight[] = []
  const ordinaryDays = plan.days.filter(
    (day) =>
      day.targetStrategy?.type !== 'refeed_day' &&
      day.targetStrategy?.type !== 'diet_break',
  )
  const calorieTargets = ordinaryDays.map((day) => day.targets.calories)
  const calorieAverage = average(calorieTargets)
  const calorieRange =
    calorieTargets.length > 0
      ? Math.max(...calorieTargets) - Math.min(...calorieTargets)
      : 0
  const calorieVariation =
    calorieAverage > 0 ? calorieRange / calorieAverage : 0

  if (calorieVariation > 0.35) {
    insights.push({
      id: 'calorie-variation',
      title: 'نوسان زیاد کالری',
      message: 'اختلاف کالری روزهای عادی بیشتر از ۳۵٪ میانگین برنامه است.',
      suggestion:
        'از ChatGPT بخواه دلیل نوسان هر روز را توضیح دهد یا بازه کالری را متعادل‌تر کند.',
      severity: 'warning',
      impact: 14,
    })
  } else if (calorieVariation > 0.2) {
    insights.push({
      id: 'calorie-variation',
      title: 'نوسان قابل توجه کالری',
      message: 'هدف کالری روزها کمی بیشتر از حد معمول تغییر می‌کند.',
      suggestion: 'هماهنگی روزهای تمرین و استراحت را دوباره بررسی کن.',
      severity: 'notice',
      impact: 7,
    })
  } else {
    insights.push({
      id: 'calorie-balance',
      title: 'ریتم کالری متعادل',
      message: 'نوسان کالری روزهای عادی کنترل‌شده است.',
      severity: 'positive',
      impact: 0,
    })
  }

  const proteinPerKg =
    average(plan.days.map((day) => day.targets.protein)) /
    plan.profile.currentWeightKg

  if (proteinPerKg < 1.2) {
    insights.push({
      id: 'protein',
      title: 'پروتئین پایین',
      message: 'میانگین پروتئین روزانه نسبت به وزن فعلی پایین به نظر می‌رسد.',
      suggestion:
        'هدف پروتئین را با هدف بدنی، وضعیت پزشکی و توصیه متخصص دوباره بررسی کن.',
      severity: 'warning',
      impact: 16,
    })
  } else if (proteinPerKg > 3.5) {
    insights.push({
      id: 'protein',
      title: 'پروتئین بسیار بالا',
      message: 'میانگین پروتئین بیش از ۳٫۵ گرم به‌ازای هر کیلو وزن بدن است.',
      suggestion:
        'از ChatGPT بخواه منطق این مقدار را توضیح دهد و در صورت نیاز کاهش دهد.',
      severity: 'warning',
      impact: 12,
    })
  } else {
    insights.push({
      id: 'protein',
      title: 'پروتئین هماهنگ',
      message: 'مقدار پروتئین با وزن فعلی در بازه قابل قبول برنامه‌ریزی قرار دارد.',
      severity: 'positive',
      impact: 0,
    })
  }

  const fiberValues = plan.days.map((day) => {
    if (day.targets.fiber !== undefined) return day.targets.fiber
    return day.meals.reduce((total, meal) => {
      const option =
        meal.options.find((candidate) => candidate.id === meal.defaultOptionId) ??
        meal.options[0]
      return total + (option.nutrition.fiber ?? 0)
    }, 0)
  })
  const averageFiber = average(fiberValues)

  if (averageFiber === 0) {
    insights.push({
      id: 'fiber',
      title: 'فیبر قابل ارزیابی نیست',
      message: 'برای هدف روز یا گزینه‌های پیش‌فرض، مقدار فیبر ثبت نشده است.',
      suggestion: 'از ChatGPT بخواه فیبر هر گزینه و هدف روزانه را اضافه کند.',
      severity: 'notice',
      impact: 5,
    })
  } else if (averageFiber < 20) {
    insights.push({
      id: 'fiber',
      title: 'فیبر پایین',
      message: 'میانگین فیبر برنامه کمتر از ۲۰ گرم در روز است.',
      suggestion: 'سبزیجات، حبوبات، میوه یا غلات کامل بیشتری بررسی شود.',
      severity: 'warning',
      impact: 10,
    })
  } else {
    insights.push({
      id: 'fiber',
      title: 'فیبر مناسب',
      message: 'میانگین فیبر روزانه در سطح مناسبی قرار دارد.',
      severity: 'positive',
      impact: 0,
    })
  }

  const shortMealGaps = plan.days.flatMap((day) => {
    const times = day.meals
      .flatMap((meal) => (meal.scheduledTime ? [minutes(meal.scheduledTime)] : []))
      .sort((first, second) => first - second)
    return times
      .slice(1)
      .map((time, index) => time - times[index])
      .filter((gap) => gap < 90)
  }).length

  if (shortMealGaps > 0) {
    insights.push({
      id: 'meal-spacing',
      title: 'فاصله کوتاه بین بعضی وعده‌ها',
      message: `${shortMealGaps} فاصله کمتر از ۹۰ دقیقه در برنامه پیدا شد.`,
      suggestion: 'زمان‌بندی وعده‌های نزدیک را با برنامه کاری و تمرین تطبیق بده.',
      severity: 'notice',
      impact: Math.min(8, shortMealGaps * 2),
    })
  } else {
    insights.push({
      id: 'meal-spacing',
      title: 'فاصله وعده‌ها منطقی است',
      message: 'فاصله زمانی ثبت‌شده بین وعده‌ها کمتر از ۹۰ دقیقه نیست.',
      severity: 'positive',
      impact: 0,
    })
  }

  const options = defaultOptions(plan)
  const uniqueTitles = new Set(options.map((option) => option.title.trim().toLowerCase()))
  const diversityRatio = options.length > 0 ? uniqueTitles.size / options.length : 0
  if (options.length >= 6 && diversityRatio < 0.5) {
    insights.push({
      id: 'diversity',
      title: 'تنوع غذایی محدود',
      message: 'بیش از نیمی از گزینه‌های پیش‌فرض در روزهای مختلف تکرار شده‌اند.',
      suggestion: 'نسخه بعدی را با مواد اولیه و منابع پروتئینی متنوع‌تر درخواست کن.',
      severity: 'notice',
      impact: 7,
    })
  } else {
    insights.push({
      id: 'diversity',
      title: 'تنوع مناسب',
      message: 'گزینه‌های پیش‌فرض تکرار غیرعادی ندارند.',
      severity: 'positive',
      impact: 0,
    })
  }

  const estimatedCount = plan.days
    .flatMap((day) => day.meals)
    .flatMap((meal) => meal.options)
    .filter((option) => option.nutritionConfidence === 'estimated').length
  const allOptionCount = plan.days
    .flatMap((day) => day.meals)
    .reduce((total, meal) => total + meal.options.length, 0)
  if (allOptionCount > 0 && estimatedCount / allOptionCount > 0.75) {
    insights.push({
      id: 'confidence',
      title: 'بیشتر مقادیر تغذیه‌ای برآوردی‌اند',
      message: 'بیش از ۷۵٪ گزینه‌ها از داده تخمینی استفاده می‌کنند.',
      suggestion:
        'برای مواد بسته‌بندی‌شده از برچسب سازنده و برای مواد پایه از منبع معتبر استفاده شود.',
      severity: 'notice',
      impact: 6,
    })
  }

  const penalty = insights.reduce((total, insight) => total + insight.impact, 0)
  const score = Math.max(0, Math.min(100, 100 - penalty))
  const label =
    score >= 90
      ? 'عالی'
      : score >= 75
        ? 'خوب'
        : score >= 60
          ? 'نیازمند بررسی'
          : 'نیازمند اصلاح'

  return { score, label, insights }
}

export function createPlanImprovementPrompt(
  plan: WeeklyMealPlan,
  analysis: PlanHealthScore,
) {
  const issues = analysis.insights.filter(
    (insight) => insight.severity !== 'positive',
  )

  return `# درخواست بازبینی برنامه Momentum

برنامه «${plan.planName}» پس از بررسی داخل Momentum امتیاز ${analysis.score} از ۱۰۰ گرفته است.

لطفاً برنامه را با حفظ ساختار schemaVersion ${plan.schemaVersion} بازبینی کن و فقط JSON معتبر نهایی را برگردان.

## موارد نیازمند بررسی

${issues
  .map(
    (issue, index) =>
      `${index + 1}. **${issue.title}** — ${issue.message}${issue.suggestion ? `\n   پیشنهاد: ${issue.suggestion}` : ''}`,
  )
  .join('\n')}

## قوانین

- اطلاعات کاربر، حساسیت‌ها، محدودیت‌های پزشکی و ترجیحات غذایی را حفظ کن.
- هیچ مقدار پزشکی یا ترکیب بدنی را حدس نزن.
- targetStrategy روزهای تمرین، استراحت و روزهای ویژه را حفظ و منطقی کن.
- برای هر MealOption مقدار nutritionConfidence و nutritionSource بنویس.
- شناسه‌ها یکتا و defaultOptionId عضو options باشد.
- پاسخ نهایی فقط یک JSON معتبر و قابل Import در Momentum باشد.
`
}
