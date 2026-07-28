# تمپلیت ساخت برنامه منعطف Momentum — قرارداد آلفا 0.1.0

این فایل را کامل برای ChatGPT بفرست، جای‌خالی‌ها را با اطلاعات خودت پر کن و در صورت
وجود، تصویر یا PDF بادی‌کامپوزیشن را هم کنار همین پیام آپلود کن. پاسخ نهایی باید یک
فایل JSON خام و قابل Import در Momentum باشد.

## ۱) اطلاعات کاربر

- نام: `[نام یا نام مستعار]`
- سن: `[عدد صحیح بین ۱۳ تا ۱۰۰]`
- جنسیت: `[female | male | other | prefer_not_to_say]`
- قد به سانتی‌متر: `[مثال: 175]`
- وزن شروع به کیلوگرم: `[مثال: 82]`
- وزن فعلی به کیلوگرم: `[مثال: 80.5]`
- وزن هدف به کیلوگرم: `[مثال: 74]`
- تاریخ هدف میلادی: `[YYYY-MM-DD]`
- سطح فعالیت روزانه: `[sedentary | light | moderate | high | athlete]`
- هدف اصلی: `[کاهش وزن / افزایش وزن / حفظ وزن / بهبود عملکرد / ...]`
- سرعت تغییر وزن ترجیحی یا محدودیت زمانی: `[توضیح]`

## ۲) بادی‌کامپوزیشن اختیاری

- آیا فایل تصویر/PDF/اسکن کنار این پیام آپلود شده؟ `[بله / خیر]`
- تاریخ اندازه‌گیری در صورت وجود: `[YYYY-MM-DD]`
- توضیح تکمیلی: `[اختیاری]`

اگر فایل بادی‌کامپوزیشن پیوست شده است، فقط اعداد واضح و قابل‌خواندن آن را استخراج و
در محاسبات انرژی، پروتئین و طراحی برنامه لحاظ کن. داده‌ای را حدس نزن. مقادیر موجود
را در `profile.bodyComposition` ثبت کن و مقادیر ناموجود را حذف کن. اگر فایل وجود
ندارد، کل `bodyComposition` را حذف کن. از این اطلاعات تشخیص پزشکی نساز و دستور پزشک
یا متخصص تغذیه را بر پیشنهاد عمومی مقدم بدان.

## ۳) ترجیحات و محدودیت‌ها

- تعداد و نام وعده‌های دلخواه در هر روز: `[مثال: ۴ وعده؛ صبحانه، ناهار، عصرانه، شام]`
- آیا تعداد وعده‌ها بین روزهای تمرین و استراحت فرق دارد؟ `[توضیح]`
- تعداد گزینه دلخواه برای هر وعده: `[مثال: ۳]`
- الگوی غذایی: `[همه‌چیزخوار / گیاه‌خوار / وگان / ...]`
- غذاهای مورد علاقه: `[فهرست]`
- غذاهای نامطلوب: `[فهرست]`
- حساسیت یا عدم تحمل غذایی: `[فهرست؛ اگر نیست خالی]`
- بیماری، ملاحظه پزشکی یا دستور متخصص: `[فهرست؛ اگر نیست خالی]`
- داروهای مرتبط با تغذیه/اشتها/قند خون: `[فهرست؛ اگر نیست خالی]`
- مکمل‌ها: `[نام، مقدار و زمان مصرف؛ اگر نیست خالی]`
- بودجه و دسترسی محلی به مواد غذایی: `[توضیح]`
- زمان، مهارت و تجهیزات آشپزی: `[توضیح]`
- غذاهای قابل‌حمل یا مناسب محل کار: `[توضیح]`
- تعداد دفعات رستوران یا بیرون‌بر: `[توضیح]`
- ساعت خواب، بیداری و برنامه کاری: `[توضیح]`
- آب و قدم روزانه: `[توضیح یا هدف]`
- هر نکته مؤثر دیگر: `[فرهنگ غذایی، روزه، شیفت کاری، گوارش، ...]`

## ۴) ورزش

برای هر روز هفته نوع ورزش، ساعت، مدت و شدت را بنویس:

- `[روز]: [rest | crossfit | full_body | cardio | walk]، [HH:mm]، [دقیقه]، [low | moderate | high]، [توضیح]`

## ۵) وظیفه تو

یک برنامه غذایی منعطف و واقع‌بینانه با محاسبات سازگار با اطلاعات بالا بساز. نکات
زیر الزامی‌اند:

1. خروجی نهایی فقط یک JSON معتبر باشد؛ بدون Markdown، توضیح، کامنت یا code fence.
2. `schemaVersion` دقیقاً `"0.1.0"` و `planVersion` یک نسخه زیر `1.0.0` مانند
   `"0.1.0-alpha.1"` باشد.
3. تاریخ‌ها میلادی و با قالب `YYYY-MM-DD`، زمان‌ها با قالب ۲۴ ساعته `HH:mm` و
   `generatedAt` یک ISO datetime معتبر باشد.
4. هر عضو `days[].meals[]` یک «جایگاه وعده» است و باید چند انتخاب در `options`
   داشته باشد. کاربر فقط یکی از گزینه‌های همان وعده را انتخاب و آماده می‌کند.
5. گزینه‌های یک وعده باید از نظر کالری و پروتئین تا حد ممکن نزدیک باشند تا انتخاب
   آزاد، هدف روز را به‌هم نزند. `defaultOptionId` حتماً شناسه یکی از همان گزینه‌ها باشد.
6. تعداد وعده‌ها را از خواست کاربر بگیر؛ عدد ثابتی تحمیل نکن. تعداد وعده‌ها می‌تواند
   بین روزها متفاوت باشد. برای هر روز ۱ تا ۲۴ وعده و برای هر وعده دست‌کم یک گزینه مجاز است.
7. همه `id`ها کوتاه، یکتا و فقط شامل حروف انگلیسی، عدد، `. _ : -` باشند.
8. همه اعداد JSON با رقم لاتین و بدون واحد متنی باشند. واحد فقط در فیلد `unit` قرار گیرد.
9. لیست مواد، مقدار، تغذیه، زمان و روش آماده‌سازی هر گزینه را کامل و عملی بنویس.
10. برنامه تمرین، روز استراحت، غذاهای محبوب، محدودیت‌ها، بودجه و امکان حمل غذا را
    در انتخاب گزینه‌ها لحاظ کن.
11. کالری و درشت‌مغذی‌ها را با احتیاط و منطقی تخمین بزن. در صورت اطلاعات ناکافی،
    در تصمیم‌های پرریسک محافظه‌کار باش و هیچ تشخیص یا ادعای درمانی ارائه نکن.
12. همه کلیدهای اجباری قرارداد زیر را حتی اگر آرایه‌شان خالی است، در خروجی بگذار.
    هیچ کلید اضافه‌ای خارج از این قرارداد نساز.

## ۶) قرارداد دقیق JSON

ریشه:

```text
{
  schemaVersion: "0.1.0",
  planId: string,
  planName: string,
  planVersion: string زیر 1.0.0,
  generatedAt: ISO datetime,
  validFrom: YYYY-MM-DD,
  validTo: YYYY-MM-DD,
  locale: "fa-IR",
  direction: "rtl",
  unitSystem: "metric",
  profile: ImportedProfile,
  planningContext: PlanningContext,
  author?: string,
  description?: string,
  defaultTargets: DayTargets,
  days: PlanDay[1..60],
  emergencyOptions: EmergencyOption[0..100],
  restaurantGuide?: RestaurantChoice[],
  groceryList?: GroceryCategory[]
}
```

`ImportedProfile`:

```text
{
  name: string,
  age: integer 13..100,
  sex: "female" | "male" | "other" | "prefer_not_to_say",
  heightCm: number 100..250,
  currentWeightKg: number 35..350,
  targetWeightKg: number 35..350,
  startWeightKg: number 35..350,
  goalDate: YYYY-MM-DD,
  activityLevel: "sedentary" | "light" | "moderate" | "high" | "athlete",
  bodyComposition?: {
    measuredAt?: YYYY-MM-DD,
    sourceType?: "image" | "pdf" | "scan" | "manual",
    bodyFatPercent?: number,
    fatMassKg?: number,
    leanMassKg?: number,
    skeletalMuscleMassKg?: number,
    visceralFatRating?: number,
    waistCm?: number,
    basalMetabolicRate?: number,
    notes?: string[]
  }
}
```

`PlanningContext` — تمام آرایه‌ها اجباری‌اند و در صورت نبود اطلاعات `[]` باشند:

```text
{
  requestedMealPattern: string,
  preferredOptionCount: integer 1..12,
  dietaryPattern?: string,
  favoriteFoods: string[],
  dislikedFoods: string[],
  allergies: string[],
  medicalConsiderations: string[],
  medications: string[],
  supplements: string[],
  cookingConstraints: string[],
  lifestyleNotes: string[],
  trainingSchedule: [{
    day: string,
    type: "rest" | "crossfit" | "full_body" | "cardio" | "walk",
    scheduledTime?: HH:mm,
    durationMinutes?: number,
    intensity?: "low" | "moderate" | "high",
    notes?: string
  }]
}
```

`DayTargets`:

```text
{
  calories: number,
  protein: number,
  carbs?: number,
  fat?: number,
  fiber?: number,
  waterMl?: number,
  steps?: number,
  treadmillMinutes?: number
}
```

`PlanDay`:

```text
{
  date: YYYY-MM-DD,
  label?: string,
  trainingType?: "rest" | "crossfit" | "full_body" | "cardio" | "walk",
  targets: DayTargets,
  meals: MealSlot[],
  notes?: string[]
}
```

`MealSlot`:

```text
{
  id: string,
  type: "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" |
        "dinner" | "pre_sleep" | "emergency",
  title: string,
  scheduledTime?: HH:mm,
  xp: number 0..1000,
  required: boolean,
  defaultOptionId: string,
  options: MealOption[]
}
```

اگر کاربر بیش از یک میان‌وعده هم‌نوع خواست، همان `type` را تکرار کن ولی `id` و
`title` یکتا بده؛ مثلاً `snack-1` و `snack-2`.

`MealOption`:

```text
{
  id: string,
  title: string,
  subtitle?: string,
  ingredients: [{
    name: string,
    amount: number,
    unit: "g" | "ml" | "piece" | "tbsp" | "tsp" | "cup" | "slice" | "serving",
    note?: string
  }],
  nutrition: {
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    fiber?: number
  },
  preparation?: string[],
  prepTimeMinutes?: number,
  portable?: boolean,
  restaurantFriendly?: boolean,
  tags?: string[],
  warnings?: string[],
  satietyScore?: 1 | 2 | 3 | 4 | 5
}
```

`EmergencyOption` تمام فیلدهای `MealOption` را دارد و علاوه بر آن:

```text
{
  suitableForHungerLevels: (1 | 2 | 3 | 4 | 5)[],
  minimumMinutesBeforeDinner?: number,
  maximumMinutesBeforeDinner?: number
}
```

`RestaurantChoice`:

```text
{
  id: string,
  category: string,
  title: string,
  orderInstructions: string[],
  estimatedNutrition: Nutrition,
  rating: 1 | 2 | 3 | 4 | 5,
  notes?: string[]
}
```

`GroceryCategory`:

```text
{
  category: string,
  items: [{
    name: string,
    amount?: number,
    unit?: string,
    note?: string
  }]
}
```

اکنون ابتدا داده‌ها را از نظر سازگاری بررسی کن، سپس فقط JSON نهایی را تولید کن.
