import { getTodayIso } from '../../lib/dates/jalali'
import type {
  UserProfile,
  WeeklyMealPlan,
} from '../../types/domain'
import {
  getValueAtPath,
  isPromptQuestionApplicable,
  promptQuestions,
} from '../questions/question-schema'

const sexLabels = {
  female: 'زن',
  male: 'مرد',
  other: 'سایر',
  prefer_not_to_say: 'ترجیح می‌دهم نگویم',
} as const

const activityLabels = {
  sedentary: 'کم‌تحرک',
  light: 'فعالیت سبک',
  moderate: 'فعالیت متوسط',
  high: 'فعالیت زیاد',
  athlete: 'ورزشکار',
} as const

const goalLabels = {
  fat_loss: 'کاهش چربی',
  muscle_gain: 'افزایش عضله',
  maintenance: 'حفظ وزن',
  performance: 'بهبود عملکرد ورزشی',
  custom: 'هدف سفارشی',
} as const

function isMissing(value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function getMissingPromptQuestions(profile: UserProfile) {
  return promptQuestions.filter(
    (question) =>
      question.required &&
      isPromptQuestionApplicable(question, profile) &&
      isMissing(getValueAtPath(profile, question.path)),
  )
}

function scheduleToText(plan?: WeeklyMealPlan) {
  if (!plan || plan.planningContext.trainingSchedule.length === 0) {
    return undefined
  }

  return plan.planningContext.trainingSchedule
    .map((item) =>
      [
        item.day,
        item.type,
        item.scheduledTime,
        item.durationMinutes
          ? `${item.durationMinutes} دقیقه`
          : undefined,
        item.intensity,
        item.notes,
      ]
        .filter(Boolean)
        .join(' · '),
    )
    .join('\n')
}

export function mergeProfileWithPlanContext(
  profile: UserProfile,
  plan?: WeeklyMealPlan,
): UserProfile {
  const context = plan?.planningContext
  const existing = profile.planningPreferences ?? {}
  const inferredGoal =
    profile.targetWeightKg < profile.currentWeightKg
      ? 'fat_loss'
      : profile.targetWeightKg > profile.currentWeightKg
        ? 'muscle_gain'
        : 'maintenance'

  return {
    ...profile,
    age: profile.age ?? plan?.profile.age,
    sex: profile.sex ?? plan?.profile.sex,
    activityLevel:
      profile.activityLevel ?? plan?.profile.activityLevel,
    bodyComposition:
      profile.bodyComposition ?? plan?.profile.bodyComposition,
    planningPreferences: {
      goalType: existing.goalType ?? inferredGoal,
      customGoal: existing.customGoal,
      dietType: existing.dietType ?? context?.dietaryPattern,
      requestedMealPattern:
        existing.requestedMealPattern ?? context?.requestedMealPattern,
      preferredOptionCount:
        existing.preferredOptionCount ?? context?.preferredOptionCount,
      favoriteFoods: existing.favoriteFoods ?? context?.favoriteFoods,
      dislikedFoods: existing.dislikedFoods ?? context?.dislikedFoods,
      allergies: existing.allergies ?? context?.allergies,
      medicalConsiderations:
        existing.medicalConsiderations ??
        context?.medicalConsiderations,
      medications: existing.medications ?? context?.medications,
      supplements: existing.supplements ?? context?.supplements,
      lifestyleNotes:
        existing.lifestyleNotes ?? context?.lifestyleNotes,
      workSchedule: existing.workSchedule ?? context?.workSchedule,
      cookingLimitations:
        existing.cookingLimitations ?? context?.cookingConstraints,
      budget: existing.budget ?? context?.budget,
      availableEquipment:
        existing.availableEquipment ?? context?.availableEquipment,
      restaurantMealsPerWeek:
        existing.restaurantMealsPerWeek ??
        context?.restaurantMealsPerWeek,
      restaurantPreferences:
        existing.restaurantPreferences ??
        context?.restaurantPreferences,
      groceryPreferences:
        existing.groceryPreferences ??
        context?.groceryPreferences,
      trainingSchedule:
        existing.trainingSchedule ?? scheduleToText(plan),
    },
  }
}

function list(values?: string[]) {
  return values && values.length > 0 ? values.join('، ') : 'ندارد'
}

export function buildMomentumAiPrompt(profile: UserProfile) {
  const preferences = profile.planningPreferences
  if (!preferences || getMissingPromptQuestions(profile).length > 0) {
    throw new Error('اطلاعات لازم برای ساخت پرامپت کامل نیست.')
  }

  const bodyComposition = profile.bodyComposition
    ? JSON.stringify(profile.bodyComposition, null, 2)
    : 'گزارشی ثبت نشده است.'

  return `# Momentum — Personalized Meal Plan Generation Package

این پرامپت توسط Momentum و فقط روی دستگاه کاربر ساخته شده است. یک برنامه غذایی شخصی‌سازی‌شده تولید کن که مستقیماً در Momentum قابل Import باشد.

## نقش و محدودیت

- نقش تو تولیدکننده برنامه است؛ Momentum فقط فایل را اعتبارسنجی، نمایش و اجرا می‌کند.
- کاربر نباید JSON را دستی ویرایش کند.
- پاسخ نهایی فقط یک JSON معتبر باشد؛ هیچ توضیح، Markdown fence یا متن دیگری قبل و بعد آن ننویس.
- schemaVersion خروجی باید دقیقاً \`0.2.0\` باشد.
- اگر اطلاعات پزشکی نیازمند تصمیم تخصصی است، هشدار روشن بنویس و مقدار پزشکی را حدس نزن.

## پروتکل الزامی تکمیل اطلاعات

پیش از تولید برنامه، تمام اطلاعات این پیام و پیوست‌های گفتگو را یک‌بار بررسی کن.
هر مقدار خالی، نامشخص، متناقض، دارای placeholder مانند \`[...]\` یا پاسخ‌داده‌نشده
را missing در نظر بگیر. مقدار را حدس نزن و تا وقتی اطلاعات ضروری کامل نشده‌اند
هیچ JSON، برنامه نمونه یا محاسبه نهایی تولید نکن.

اطلاعات ضروری:

- پروفایل: نام یا نام مستعار، سن، جنسیت، قد، وزن شروع، وزن فعلی، وزن هدف، تاریخ هدف، سطح فعالیت و هدف اصلی.
- بازه برنامه: تاریخ شروع و پایان یا تعداد دقیق روزهای برنامه.
- الگوی غذا: نوع رژیم، تعداد و نام وعده‌ها در روزهای مختلف و تعداد گزینه هر وعده.
- ترجیحات: غذاهای محبوب و نامطلوب، حساسیت‌ها، ملاحظات پزشکی، داروها و مکمل‌ها.
- شرایط اجرا: برنامه کار و خواب، محدودیت آشپزی، تجهیزات، بودجه و دسترسی غذایی.
- راهنمای رستوران: تعداد وعده‌های بیرون، نوع رستوران و غذاهای معمول، سفارش‌های محبوب و محدودیت سفارش.
- لیست خرید: روز و شیوه خرید، فروشگاه یا دسترسی محلی، مواد موجود در خانه و ترجیح خرید عمده یا meal-prep.
- فعالیت: برنامه تمرین هر روز یا اعلام صریح نداشتن تمرین، به‌علاوه هدف آب و قدم در صورت اهمیت برای کاربر.

برای مواردی که کاربر ندارد، پاسخ صریح «ندارد»، «بدون محدودیت» یا «فرقی ندارد»
یک پاسخ کامل محسوب می‌شود. Body Composition اختیاری است و نبودنش Import را متوقف
نمی‌کند.

اگر حتی یک مورد ضروری missing است:

1. پاسخ اولت فقط یک پیام کوتاه شامل تمام سؤال‌های باقی‌مانده باشد.
2. چند سؤال مرتبط را در یک بند شماره‌دار گروه‌بندی کن؛ همه سؤال‌ها را در همان یک پیام بپرس تا رفت‌وبرگشت و مصرف توکن کم شود.
3. چیزی را که قبلاً از کاربر یا پیوست‌ها می‌دانی دوباره نپرس.
4. schema، مثال JSON، توضیح روش محاسبه یا خلاصه پاسخ‌های کاربر را در مرحله سؤال‌ها تکرار نکن.
5. در پایان از کاربر بخواه پاسخ‌ها را با همان شماره‌ها و به‌شکل کوتاه بفرستد، سپس منتظر پاسخ بمان.
6. بعد از پاسخ، دوباره فقط missingها و تناقض‌ها را بررسی کن. اگر چیزی باقی مانده، همه موارد باقی‌مانده را یک‌جا در یک پیام کوتاه دیگر بپرس.

فقط وقتی تمام اطلاعات ضروری کامل شد وارد مرحله تولید شو. در آن مرحله دیگر سؤال،
مقدمه یا توضیح ننویس و فقط JSON نهایی معتبر را برگردان.

## بهینه‌سازی توکن بدون افت کیفیت

- بازه‌ای بیشتر از درخواست کاربر تولید نکن و هیچ بخش این پرامپت یا پاسخ‌های کاربر را بازنویسی نکن.
- IDها، notes و متن مراحل را کوتاه اما دقیق و عملی نگه دار.
- فیلد اختیاریِ بدون داده را حذف کن؛ آرایه‌ها و فیلدهای اجباری قرارداد را حذف نکن.
- اطلاعات یکسان را در \`preparation\` و \`recipe.steps\` تکرار نکن؛ اگر recipe وجود دارد همان کافی است.
- از خطوط خالی، whitespace و توضیح غیرضروری در JSON نهایی پرهیز کن، ولی صحت JSON و جزئیات تغذیه‌ای را حفظ کن.
- برای کاهش توکن، تعداد وعده‌ها، تعداد گزینه‌های درخواستی، ingredients، nutrition، confidence یا جزئیات ضروری recipe را کم نکن.

## پروفایل کاربر

- نام: ${profile.name}
- سن: ${profile.age}
- جنسیت: ${profile.sex ? sexLabels[profile.sex] : ''}
- قد: ${profile.heightCm} سانتی‌متر
- وزن شروع: ${profile.startWeightKg} کیلوگرم
- وزن فعلی: ${profile.currentWeightKg} کیلوگرم
- وزن هدف: ${profile.targetWeightKg} کیلوگرم
- تاریخ هدف: ${profile.goalDate}
- سطح فعالیت: ${profile.activityLevel ? activityLabels[profile.activityLevel] : ''}
- هدف اصلی: ${preferences.goalType ? goalLabels[preferences.goalType] : ''}
- توضیح هدف سفارشی: ${preferences.customGoal ?? 'ندارد'}

## سبک زندگی و ترجیحات

- نوع رژیم: ${preferences.dietType}
- الگوی وعده‌ها: ${preferences.requestedMealPattern}
- تعداد گزینه برای هر وعده: ${preferences.preferredOptionCount}
- غذاهای مورد علاقه: ${list(preferences.favoriteFoods)}
- غذاهای نامطلوب: ${list(preferences.dislikedFoods)}
- حساسیت‌ها: ${list(preferences.allergies)}
- ملاحظات پزشکی: ${list(preferences.medicalConsiderations)}
- داروها: ${list(preferences.medications)}
- مکمل‌ها: ${list(preferences.supplements)}
- برنامه کاری: ${preferences.workSchedule}
- نکات سبک زندگی: ${list(preferences.lifestyleNotes)}
- محدودیت آشپزی: ${list(preferences.cookingLimitations)}
- بودجه: ${preferences.budget}
- تجهیزات در دسترس: ${list(preferences.availableEquipment)}
- وعده‌های بیرون در هفته: ${preferences.restaurantMealsPerWeek}
- ترجیحات رستوران و سفارش: ${list(preferences.restaurantPreferences)}
- ترجیحات لیست خرید: ${list(preferences.groceryPreferences)}
- برنامه تمرین:

${preferences.trainingSchedule ?? 'فعالیت برنامه‌ریزی‌شده‌ای ثبت نشده است.'}

## Body Composition — اختیاری

اطلاعات فعلی ذخیره‌شده:

\`\`\`json
${bodyComposition}
\`\`\`

اگر کاربر همراه این پرامپت فایل InBody، Tanita، PDF، تصویر یا Scan فرستاده است، دقیقاً از این قانون پیروی کن:

> If a body composition report is attached, extract only values that are clearly readable.
> Do not guess missing values.
> Use extracted values for calorie and protein calculations.
> If no report exists, ignore this section.

\`bodyComposition\` را فقط وقتی در JSON قرار بده که حداقل یک مقدار به‌وضوح قابل خواندن باشد. هیچ مقدار ناقص یا ناخوانا را حدس نزن.

قرارداد این object سخت‌گیرانه است. فقط کلیدهای زیر مجازند و ساختن هر کلید دیگری باعث رد شدن فایل می‌شود:

\`\`\`json
{
  "measuredAt": "YYYY-MM-DD",
  "sourceType": "image",
  "bodyFatPercent": 0,
  "fatMassKg": 0,
  "leanMassKg": 0,
  "skeletalMuscleMassKg": 0,
  "visceralFatRating": 0,
  "waistCm": 0,
  "basalMetabolicRate": 0,
  "notes": []
}
\`\`\`

- \`sourceType\` فقط یکی از \`image | pdf | scan | manual\` باشد.
- Test Date را به \`measuredAt\`، Percent Body Fat/PBF را به \`bodyFatPercent\`، Body Fat Mass را به \`fatMassKg\`، Fat Free Mass را به \`leanMassKg\`، SMM را به \`skeletalMuscleMassKg\`، Visceral Fat Level را به \`visceralFatRating\` و BMR را به \`basalMetabolicRate\` نگاشت کن.
- \`waistCm\` فقط دور کمر بر حسب سانتی‌متر است؛ Waist-Hip Ratio را به آن تبدیل نکن.
- وزن گزارش، BMI، Total Body Water، Protein، Minerals، InBody Score و Waist-Hip Ratio کلید مستقل ندارند. اگر واضح و مفید بودند، هرکدام را به‌شکل متن داخل \`notes\` بنویس؛ کلید جدید نساز.
- کلیدی که مقدار واضح ندارد را کاملاً حذف کن.

## قرارداد برنامه تمرین

\`planningContext.trainingSchedule\` همیشه آرایه‌ای از object است؛ رشته متنی در این آرایه ممنوع است:

\`\`\`json
[
  {
    "day": "شنبه",
    "type": "walk",
    "scheduledTime": "08:00",
    "durationMinutes": 30,
    "intensity": "low",
    "notes": "اختیاری"
  }
]
\`\`\`

- \`type\` فقط یکی از \`rest | crossfit | full_body | cardio | walk\` باشد.
- \`intensity\` فقط یکی از \`low | moderate | high\` باشد.
- زمان فقط \`HH:mm\` و مدت فقط عدد دقیقه باشد؛ واحد را داخل عدد ننویس.
- برای دو تمرین مستقل در یک روز، دو object با همان \`day\` بساز.
- اگر گزارش فقط یک مدت کلی برای تمرین ترکیبی داده و تقسیم مدت مشخص نیست، نوع اصلی را در \`type\` و فعالیت دوم را در \`notes\` بنویس؛ type ترکیبی جدید نساز.

## منطق هدف‌های پویا

\`defaultTargets\` پایه برنامه است. هر روز می‌تواند \`targetStrategy\` داشته باشد:

- \`training_day\`
- \`rest_day\`
- \`crossfit_day\`
- \`cardio_day\`
- \`refeed_day\`
- \`diet_break\`
- \`custom\`

Adjustmentها نسبت به defaultTargets محاسبه می‌شوند. اگر \`targets\` داخل همان روز نوشته شود، فقط override دستی همان فیلدهاست و باید پس از strategy اعمال شود.

نمونه:

\`\`\`json
{
  "targetStrategy": {
    "type": "training_day",
    "calorieAdjustment": 250,
    "proteinAdjustment": 20,
    "carbAdjustment": 40
  },
  "targets": {
    "protein": 150
  }
}
\`\`\`

## قرارداد MealOption

هر گزینه باید شامل مواد اولیه، nutrition و metadata اطمینان باشد:

\`\`\`json
{
  "id": "unique-option-id",
  "title": "نام غذا",
  "ingredients": [
    { "name": "ماده", "amount": 100, "unit": "g" }
  ],
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "nutritionConfidence": "estimated",
  "nutritionSource": "AI",
  "recipe": {
    "steps": ["مرحله اول"],
    "tips": ["نکته اختیاری"],
    "estimatedCookingTime": 15,
    "difficulty": "easy"
  }
}
\`\`\`

\`nutritionConfidence\` فقط یکی از این مقادیر باشد:
\`estimated\`، \`verified\`، \`usda\`، \`manufacturer\`.

اگر محاسبه توسط خودت انجام شده، \`estimated\` و منبع \`AI\` بنویس. اگر از برچسب محصول استفاده شده \`manufacturer\` و نام محصول/سازنده را در nutritionSource بنویس. recipe اختیاری است؛ اگر وجود دارد steps و difficulty الزامی‌اند.

## قرارداد MealSlot و نوع وعده

\`days[].meals[].type\` فقط یکی از مقادیر زیر باشد:

- \`breakfast\`
- \`morning_snack\`
- \`lunch\`
- \`afternoon_snack\`
- \`dinner\`
- \`pre_sleep\`
- \`emergency\`

نوع جدیدی مانند \`craving_control_snack\`، \`brunch\` یا \`post_workout\` نساز. برای
یک وعده سفارشی نزدیک‌ترین type مجاز را استفاده کن و مفهوم دقیق را در \`id\` و
\`title\` نگه دار. مثال: «میان‌وعده کنترل هوس» باید type برابر
\`afternoon_snack\`، ولی title برابر «میان‌وعده کنترل هوس» داشته باشد. تکرار یک type
در یک روز مجاز است، به‌شرط اینکه id هر وعده یکتا باشد.

## ساختار کامل خروجی

\`\`\`json
{
  "schemaVersion": "0.2.0",
  "planId": "unique-plan-id",
  "planName": "نام برنامه",
  "planVersion": "0.2.0-alpha.1",
  "generatedAt": "ISO-8601 datetime",
  "validFrom": "YYYY-MM-DD",
  "validTo": "YYYY-MM-DD",
  "locale": "fa-IR",
  "direction": "rtl",
  "unitSystem": "metric",
  "profile": {
    "name": "...",
    "age": 0,
    "sex": "prefer_not_to_say",
    "heightCm": 0,
    "currentWeightKg": 0,
    "targetWeightKg": 0,
    "startWeightKg": 0,
    "goalDate": "YYYY-MM-DD",
    "activityLevel": "moderate",
    "bodyComposition": {
      "measuredAt": "YYYY-MM-DD",
      "sourceType": "scan",
      "bodyFatPercent": 0,
      "fatMassKg": 0,
      "leanMassKg": 0,
      "skeletalMuscleMassKg": 0,
      "visceralFatRating": 0,
      "waistCm": 0,
      "basalMetabolicRate": 0,
      "notes": []
    }
  },
  "planningContext": {
    "requestedMealPattern": "...",
    "preferredOptionCount": 3,
    "dietaryPattern": "...",
    "favoriteFoods": [],
    "dislikedFoods": [],
    "allergies": [],
    "medicalConsiderations": [],
    "medications": [],
    "supplements": [],
    "cookingConstraints": [],
    "workSchedule": "...",
    "budget": "...",
    "availableEquipment": [],
    "restaurantMealsPerWeek": 0,
    "restaurantPreferences": [],
    "groceryPreferences": [],
    "lifestyleNotes": [],
    "trainingSchedule": [
      {
        "day": "شنبه",
        "type": "walk",
        "scheduledTime": "HH:mm",
        "durationMinutes": 0,
        "intensity": "low",
        "notes": "اختیاری"
      }
    ]
  },
  "defaultTargets": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0,
    "waterMl": 0,
    "steps": 0
  },
  "days": [],
  "emergencyOptions": [],
  "restaurantGuide": [
    {
      "id": "restaurant-choice-1",
      "category": "رستوران ایرانی",
      "title": "انتخاب متعادل",
      "orderInstructions": ["دستور سفارش کوتاه و دقیق"],
      "estimatedNutrition": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0
      },
      "rating": 4,
      "notes": []
    }
  ],
  "groceryList": [
    {
      "category": "پروتئین",
      "items": [
        {
          "name": "نام ماده",
          "amount": 0,
          "unit": "گرم",
          "note": "اختیاری"
        }
      ]
    }
  ]
}
\`\`\`

## قوانین اعتبارسنجی

1. تمام IDها در scope خود یکتا باشند.
2. \`defaultOptionId\` دقیقاً ID یکی از options همان وعده باشد.
3. تاریخ همه روزها داخل validFrom و validTo و بدون تکرار باشد.
4. هر روز حداقل یک وعده و هر وعده حداقل یک گزینه داشته باشد.
5. هیچ مقدار nutrition منفی یا خارج از بازه منطقی نباشد.
6. تعداد وعده‌ها و گزینه‌ها از خواست کاربر پیروی کند؛ همه روزها مجبور به تعداد یکسان نیستند.
7. روزهای تمرین، استراحت، Refeed و Diet Break از targetStrategy مناسب استفاده کنند.
8. target adjustmentها را با دلیل منطقی و بر اساس پروفایل، هدف و تمرین تعیین کن.
9. برای تمام گزینه‌ها nutritionConfidence و nutritionSource بنویس.
10. محدودیت‌های پزشکی، حساسیت‌ها، بودجه، تجهیزات، کار و آشپزی را رعایت کن.
11. برنامه باید چند انتخاب واقعی برای هر وعده بدهد تا کاربر فقط یکی را انتخاب و ثبت کند.
12. برنامه باید حداقل یک گزینه emergency داشته باشد.
13. \`restaurantGuide\` اجباری و غیرخالی است؛ حداقل ۳ انتخاب متناسب با ترجیحات، بودجه، حساسیت‌ها و رستوران‌های معمول کاربر بساز، حتی اگر مصرف رستوران کم باشد.
14. \`groceryList\` اجباری و غیرخالی است؛ مقدارهای لازم کل بازه را بر اساس defaultOptionId هر وعده جمع‌بندی و برای گزینه‌های جایگزین فقط نکته تعویض کوتاه اضافه کن.
15. هیچ objectی کلید اضافه خارج از قرارداد نداشته باشد؛ Momentum objectها را به‌شکل strict اعتبارسنجی می‌کند.
16. قبل از پاسخ، بدون نمایش توضیح، کنترل کن که bodyComposition فقط کلیدهای مجاز، trainingSchedule فقط object، MealSlot فقط typeهای مجاز و restaurantGuide و groceryList هر دو غیرخالی باشند.

اکنون JSON نهایی را تولید کن.
`
}

export function downloadMomentumPrompt(profile: UserProfile) {
  const content = buildMomentumAiPrompt(profile)
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/markdown;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `momentum-ai-prompt-${getTodayIso()}.md`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
