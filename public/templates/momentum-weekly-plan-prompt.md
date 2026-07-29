# Momentum — تمپلیت عمومی تولید برنامه 0.2.0

این فایل را کامل کنید و برای ChatGPT یا هر مدل زبانی دیگری بفرستید. Momentum هیچ
اتصال داخلی به هوش مصنوعی ندارد؛ مدل بیرون از سایت اجرا می‌شود و پاسخ JSON آن را
بعداً در Momentum Import می‌کنید.

## دستور اجباری برای ChatGPT — ابتدا اطلاعات را کامل کن

قبل از ساخت برنامه، تمام این پیام و فایل‌های پیوست را یک‌بار بررسی کن. هر جای‌خالی،
placeholder مانند `[متن]` یا `[عدد]`، پاسخ نامشخص و اطلاعات متناقض را missing در
نظر بگیر. هیچ مقدار شخصی، پزشکی، زمانی یا تغذیه‌ای را حدس نزن.

تا زمانی که تمام اطلاعات ضروری زیر کامل نشده‌اند، JSON یا برنامه غذایی تولید نکن:

- نام یا نام مستعار، سن، جنسیت، قد، وزن شروع، وزن فعلی و وزن هدف
- هدف اصلی، تاریخ هدف و سطح فعالیت
- تاریخ شروع برنامه و تاریخ پایان یا تعداد دقیق روزها
- نوع رژیم، تعداد و نام وعده‌ها و تعداد گزینه‌های هر وعده
- غذاهای مورد علاقه و نامطلوب
- حساسیت‌ها، ملاحظات پزشکی، داروها و مکمل‌ها
- برنامه کار و خواب، بودجه و دسترسی به مواد غذایی
- محدودیت آشپزی و تجهیزات موجود
- تعداد وعده‌های بیرون، هدف آب و قدم
- نوع رستوران‌ها و غذاهای معمول، سفارش‌های محبوب و محدودیت‌های سفارش
- شیوه و زمان خرید، فروشگاه یا دسترسی محلی، مواد موجود و ترجیح خرید عمده/meal-prep
- برنامه تمرین هر روز یا اعلام صریح نداشتن تمرین

پاسخ صریح «ندارد»، «بدون محدودیت» یا «فرقی ندارد» معتبر است. Body Composition
اختیاری است؛ اگر وجود ندارد برای تولید فایل مانع ایجاد نکن.

اگر اطلاعات ناقص است، پاسخ اول فقط باید یک مجموعه سؤال کوتاه باشد:

1. تمام سؤال‌های باقی‌مانده را در همان یک پیام بپرس.
2. چند سؤال مرتبط را زیر یک شماره گروه‌بندی کن تا کاربر بتواند با همان شماره پاسخ دهد.
3. اطلاعاتی را که قبلاً در متن یا پیوست وجود دارد دوباره نپرس.
4. در مرحله سؤال‌ها schema، مثال JSON، روش محاسبه یا خلاصه اطلاعات کاربر را تکرار نکن.
5. از کاربر بخواه پاسخ‌ها را کوتاه و با همان شماره‌ها بفرستد و سپس منتظر بمان.
6. بعد از دریافت پاسخ، اگر مورد ضروری دیگری باقی مانده یا تناقضی وجود دارد، همه
   موارد باقی‌مانده را یک‌جا و در یک پیام کوتاه دیگر بپرس.

فقط بعد از کامل‌شدن تمام اطلاعات ضروری، بدون مقدمه و توضیح، JSON نهایی را تولید کن.

### بهینه‌سازی مصرف توکن بدون افت کیفیت

- فقط بازه زمانی درخواستی را تولید کن.
- prompt، schema یا جواب‌های کاربر را در پاسخ تکرار نکن.
- IDها، notes و مراحل را کوتاه ولی دقیق و کاربردی بنویس.
- فیلدهای اختیاری خالی را حذف کن؛ فیلدها و آرایه‌های اجباری را نگه دار.
- یک دستور را هم‌زمان در `preparation` و `recipe.steps` تکرار نکن.
- از whitespace، خطوط خالی و توضیح اضافی در JSON نهایی پرهیز کن.
- برای صرفه‌جویی در توکن، تعداد وعده‌ها، گزینه‌ها، مواد اولیه، nutrition،
  confidence یا جزئیات ضروری recipe را کم نکن.

## اطلاعات کاربر

- نام یا نام مستعار: `[متن]`
- سن: `[۱۳ تا ۱۰۰]`
- جنسیت: `[female | male | other | prefer_not_to_say]`
- قد به سانتی‌متر: `[عدد]`
- وزن شروع به کیلوگرم: `[عدد]`
- وزن فعلی به کیلوگرم: `[عدد]`
- وزن هدف به کیلوگرم: `[عدد]`
- تاریخ هدف: `[YYYY-MM-DD]`
- سطح فعالیت: `[sedentary | light | moderate | high | athlete]`
- هدف: `[کاهش چربی | افزایش عضله | حفظ وزن | عملکرد | توضیح سفارشی]`
- تاریخ شروع برنامه: `[YYYY-MM-DD]`
- تاریخ پایان یا تعداد روزهای برنامه: `[YYYY-MM-DD یا تعداد روز]`

## ترجیحات و سبک زندگی

- نوع رژیم: `[مثلاً همه‌چیزخوار]`
- تعداد و نام وعده‌ها در روزهای مختلف: `[توضیح]`
- تعداد گزینه جایگزین برای هر وعده: `[۱ تا ۱۲]`
- غذاهای مورد علاقه: `[فهرست]`
- غذاهای نامطلوب: `[فهرست]`
- حساسیت‌ها: `[فهرست یا ندارد]`
- ملاحظات پزشکی: `[فهرست یا ندارد]`
- داروها: `[فهرست یا ندارد]`
- مکمل‌ها: `[فهرست یا ندارد]`
- برنامه کاری و ساعات خواب: `[توضیح]`
- محدودیت زمان/مهارت آشپزی: `[توضیح]`
- بودجه: `[توضیح]`
- تجهیزات آشپزی: `[فهرست]`
- تعداد وعده‌های بیرون از خانه در هفته: `[عدد]`
- نوع رستوران‌ها، غذاها و سفارش‌های معمول: `[فهرست]`
- محدودیت سفارش رستورانی: `[بودجه، حساسیت، حجم پرس یا ندارد]`
- روز و شیوه خرید هفتگی: `[توضیح]`
- فروشگاه یا محدودیت دسترسی به مواد: `[توضیح]`
- مواد غذایی موجود در خانه: `[فهرست یا ندارد]`
- ترجیح خرید عمده یا meal-prep: `[توضیح]`
- نکات دیگر سبک زندگی: `[توضیح]`

## ورزش

برای هر روز، نوع، ساعت، مدت و شدت تمرین را بنویسید:

- `[روز]: [rest | crossfit | full_body | cardio | walk]، [HH:mm]، [دقیقه]، [low | moderate | high]`

## گزارش Body Composition اختیاری

در صورت وجود، تصویر یا PDF مربوط به InBody، Tanita یا Scan را کنار این پیام برای
مدل خارجی پیوست کنید.

If a body composition report is attached, extract only values that are clearly readable.
Do not guess missing values.
Use extracted values for calorie and protein calculations.
If no report exists, ignore this section.

`profile.bodyComposition` را فقط در صورت وجود داده واضح بساز. مقدار ناخوانا یا
ناموجود را حدس نزن. این object سخت‌گیرانه است و فقط کلیدهای زیر را می‌پذیرد:

```json
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
```

- `sourceType` فقط `image | pdf | scan | manual` باشد.
- Test Date → `measuredAt`
- Percent Body Fat/PBF → `bodyFatPercent`
- Body Fat Mass → `fatMassKg`
- Fat Free Mass → `leanMassKg`
- SMM → `skeletalMuscleMassKg`
- Visceral Fat Level → `visceralFatRating`
- BMR → `basalMetabolicRate`
- `waistCm` فقط دور کمر است؛ Waist-Hip Ratio را به آن تبدیل نکن.
- وزن گزارش، BMI، Total Body Water، Protein، Minerals، InBody Score و
  Waist-Hip Ratio را در صورت نیاز به‌صورت متن داخل `notes` بنویس؛ برایشان کلید
  جدید نساز.

## ساختار اجباری برنامه تمرین

`planningContext.trainingSchedule` باید آرایه object باشد، نه آرایه string:

```json
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
```

`type` فقط `rest | crossfit | full_body | cardio | walk` و `intensity` فقط
`low | moderate | high` باشد. برای دو تمرین مستقل در یک روز دو object بساز. اگر
فقط مدت کلی تمرین ترکیبی مشخص است، نوع اصلی را در `type` و فعالیت دوم را در
`notes` بنویس؛ type ترکیبی جدید نساز.

## وظیفه مدل

یک برنامه غذایی منعطف، عملی و سازگار با اطلاعات بالا تولید کن. پاسخ نهایی باید فقط
یک JSON معتبر باشد؛ هیچ توضیح، code fence یا متن دیگری قبل و بعد آن ننویس.

قواعد:

1. `schemaVersion` دقیقاً `"0.2.0"` و `planVersion` زیر `1.0.0` باشد.
2. تعداد وعده‌ها ثابت نیست و باید از خواست کاربر پیروی کند.
3. هر وعده می‌تواند هر تعداد گزینه داشته باشد و کاربر دقیقاً یکی را انتخاب می‌کند.
4. گزینه‌های یک وعده از نظر کالری و پروتئین تا حد ممکن هم‌ارزش باشند.
5. تمام IDها در scope خود یکتا باشند و `defaultOptionId` یکی از IDهای همان وعده باشد.
6. همه تاریخ‌ها `YYYY-MM-DD`، زمان‌ها `HH:mm` و اعداد با رقم لاتین باشند.
7. همه روزها داخل بازه `validFrom` تا `validTo` و بدون تاریخ تکراری باشند.
8. هیچ مقدار تغذیه‌ای منفی یا غیرمنطقی تولید نکن.
9. حساسیت، ملاحظات پزشکی، بودجه، تجهیزات، کار و محدودیت آشپزی را رعایت کن.
10. خروجی نباید کلیدی خارج از قرارداد زیر داشته باشد.

## نوع وعده

`days[].meals[].type` فقط یکی از موارد زیر باشد:

- `breakfast`
- `morning_snack`
- `lunch`
- `afternoon_snack`
- `dinner`
- `pre_sleep`
- `emergency`

نوعی مانند `craving_control_snack`، `brunch` یا `post_workout` نساز. برای وعده
سفارشی نزدیک‌ترین type مجاز را استفاده کن و مفهوم دقیق را در `id` و `title` نگه
دار. مثلاً «میان‌وعده کنترل هوس» باید type برابر `afternoon_snack` داشته باشد.
تکرار یک type با ID متفاوت در یک روز مجاز است.

## هدف‌های پویا

`defaultTargets` هدف پایه است. هر روز یک `targetStrategy` دارد و adjustmentها نسبت
به هدف پایه اعمال می‌شوند. `targets` در سطح روز فقط override دستی است و پس از
strategy اولویت دارد.

مقادیر مجاز `type`:

- `training_day`
- `rest_day`
- `crossfit_day`
- `cardio_day`
- `refeed_day`
- `diet_break`
- `custom`

نمونه:

```json
{
  "targetStrategy": {
    "type": "training_day",
    "calorieAdjustment": 250,
    "proteinAdjustment": 20,
    "carbAdjustment": 40
  },
  "targets": {
    "waterMl": 3000
  }
}
```

## اطمینان تغذیه و Recipe

هر `MealOption` باید `nutritionConfidence` و `nutritionSource` داشته باشد.

مقادیر مجاز confidence:

- `estimated`
- `verified`
- `usda`
- `manufacturer`

اگر خود مدل مقدار را تخمین زده، `"estimated"` و `"AI"` بنویسد. Recipe اختیاری
است؛ اگر وجود دارد `steps` و `difficulty` الزامی‌اند و difficulty فقط
`easy | medium | hard` است.

## قرارداد خروجی

```json
{
  "schemaVersion": "0.2.0",
  "planId": "unique-plan-id",
  "planName": "نام برنامه",
  "planVersion": "0.2.0-alpha.1",
  "generatedAt": "2026-01-01T08:00:00Z",
  "validFrom": "2026-01-01",
  "validTo": "2026-01-07",
  "locale": "fa-IR",
  "direction": "rtl",
  "unitSystem": "metric",
  "profile": {
    "name": "...",
    "age": 30,
    "sex": "prefer_not_to_say",
    "heightCm": 175,
    "currentWeightKg": 80,
    "targetWeightKg": 75,
    "startWeightKg": 80,
    "goalDate": "2026-04-01",
    "activityLevel": "moderate",
    "bodyComposition": {
      "measuredAt": "2026-01-01",
      "sourceType": "scan",
      "bodyFatPercent": 25,
      "fatMassKg": 20,
      "leanMassKg": 60,
      "skeletalMuscleMassKg": 32,
      "visceralFatRating": 10,
      "waistCm": 90,
      "basalMetabolicRate": 1700,
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
        "scheduledTime": "08:00",
        "durationMinutes": 30,
        "intensity": "low",
        "notes": "اختیاری"
      }
    ]
  },
  "defaultTargets": {
    "calories": 2000,
    "protein": 140,
    "carbs": 210,
    "fat": 65,
    "fiber": 28,
    "waterMl": 2500,
    "steps": 8000
  },
  "days": [
    {
      "date": "2026-01-01",
      "label": "روز تمرین",
      "trainingType": "full_body",
      "targetStrategy": {
        "type": "training_day",
        "calorieAdjustment": 200,
        "proteinAdjustment": 10,
        "carbAdjustment": 35
      },
      "targets": {
        "waterMl": 3000
      },
      "meals": [
        {
          "id": "day-1-lunch",
          "type": "lunch",
          "title": "ناهار",
          "scheduledTime": "13:30",
          "xp": 15,
          "required": true,
          "defaultOptionId": "day-1-lunch-a",
          "options": [
            {
              "id": "day-1-lunch-a",
              "title": "مرغ و برنج",
              "ingredients": [
                { "name": "مرغ پخته", "amount": 180, "unit": "g" },
                { "name": "برنج پخته", "amount": 180, "unit": "g" }
              ],
              "nutrition": {
                "calories": 620,
                "protein": 55,
                "carbs": 70,
                "fat": 14,
                "fiber": 5
              },
              "nutritionConfidence": "estimated",
              "nutritionSource": "AI",
              "recipe": {
                "steps": ["مرغ را گریل کنید.", "همراه برنج سرو کنید."],
                "tips": ["مرغ را از شب قبل مزه‌دار کنید."],
                "estimatedCookingTime": 25,
                "difficulty": "easy"
              }
            }
          ]
        }
      ],
      "notes": []
    }
  ],
  "emergencyOptions": [],
  "restaurantGuide": [
    {
      "id": "restaurant-choice-1",
      "category": "رستوران ایرانی",
      "title": "انتخاب متعادل",
      "orderInstructions": ["دستور سفارش کوتاه و دقیق"],
      "estimatedNutrition": {
        "calories": 600,
        "protein": 45,
        "carbs": 65,
        "fat": 18,
        "fiber": 8
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
          "name": "مرغ",
          "amount": 1000,
          "unit": "گرم",
          "note": "مقدار نمونه؛ برای بازه واقعی دوباره محاسبه شود"
        }
      ]
    }
  ]
}
```

برای برنامه نهایی، تمام روزهای بازه و تمام وعده‌های خواسته‌شده را کامل کن. JSON
نمونه بالا فقط شکل قرارداد را نشان می‌دهد. قبل از پاسخ نهایی، بدون نوشتن توضیح،
کنترل کن که Body Composition کلید اضافه ندارد، trainingSchedule فقط object دارد و
MealSlot فقط از typeهای مجاز استفاده می‌کند.

`restaurantGuide` و `groceryList` همیشه اجباری و غیرخالی‌اند:

- حداقل ۳ انتخاب رستورانی متناسب با ترجیحات، بودجه، حساسیت‌ها و سفارش‌های معمول
  کاربر بساز؛ حتی اگر تعداد وعده بیرون کم باشد.
- لیست خرید را برای کل بازه و بر اساس `defaultOptionId` هر وعده محاسبه و دسته‌بندی
  کن. برای گزینه‌های جایگزین فقط یادداشت تعویض کوتاه اضافه کن تا خرید همه گزینه‌ها
  هم‌زمان و غیرواقعی نشود.
