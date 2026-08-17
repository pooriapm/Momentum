import type { MomentumPlanView } from './types'

function demoIsoDate(offset: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const demoDates = Array.from({ length: 7 }, (_, index) => demoIsoDate(index))
const demoTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export const demoPlan: MomentumPlanView = {
  localDate: demoDates[0],
  timezone: demoTimezone,
  contentLocale: 'fa',
  userName: { fa: 'آوا', en: 'Ava' },
  dateLabel: { fa: 'روز قدرت · هفته سوم', en: 'Strength day · Week 3' },
  monthlyPlanBrief: {
    fa: 'خوابت کمی کمتر از میانگین بود؛ برنامه را نگه داشتم اما بخش پایانی تمرین را کوتاه‌تر کردم.',
    en: 'Sleep was slightly below your average. I kept the plan but shortened the workout finisher.',
  },
  adjustmentReason: {
    fa: 'هدف امروز بر اساس روز تمرین: ۲۵۰ کالری و ۳۵ گرم کربوهیدرات بیشتر از روز استراحت.',
    en: 'Training-day target: 250 kcal and 35 g carbs above your rest-day baseline.',
  },
  targets: { calories: 2180, protein: 148, carbs: 245, fat: 68 },
  targetStrategy: { fa: 'روز تمرین قدرتی', en: 'Strength training day' },
  meals: [
    {
      id: 'breakfast', label: { fa: 'صبحانه', en: 'Breakfast' }, time: '08:30', options: [
        { id: 'eggs-flatbread', name: { fa: 'املت سبزیجات و نان سنگک', en: 'Vegetable omelet & flatbread' }, description: { fa: 'تخم‌مرغ، فلفل، قارچ، پنیر و یک‌چهارم سنگک', en: 'Eggs, peppers, mushrooms, cheese, and flatbread' }, nutrition: { calories: 430, protein: 28, carbs: 39, fat: 19 }, confidence: 'estimated', cookingMinutes: 12 },
        { id: 'oats', name: { fa: 'اوتمیل دارچینی و ماست', en: 'Cinnamon oats & yogurt' }, description: { fa: 'جو دوسر، ماست یونانی، موز و گردو', en: 'Oats, Greek yogurt, banana, and walnuts' }, nutrition: { calories: 445, protein: 25, carbs: 62, fat: 13 }, confidence: 'verified', cookingMinutes: 6 },
        { id: 'toast', name: { fa: 'تست آووکادو و تخم‌مرغ', en: 'Avocado egg toast' }, description: { fa: 'نان سبوس‌دار، آووکادو، دو تخم‌مرغ', en: 'Wholegrain toast, avocado, and two eggs' }, nutrition: { calories: 420, protein: 24, carbs: 38, fat: 21 }, confidence: 'usda', cookingMinutes: 10 },
      ],
    },
    {
      id: 'lunch', label: { fa: 'ناهار', en: 'Lunch' }, time: '13:30', options: [
        {
          id: 'saffron-chicken',
          name: { fa: 'مرغ زعفرانی، برنج و سالاد شیرازی', en: 'Saffron chicken, rice & Shirazi salad' },
          description: { fa: '۱۶۰ گرم مرغ، برنج باسماتی و سالاد با آب‌لیمو', en: '160 g chicken, basmati rice, and lemon-dressed salad' },
          nutrition: { calories: 620, protein: 48, carbs: 75, fat: 14 },
          confidence: 'estimated',
          confidenceLevel: 'medium',
          nutritionSource: 'model_estimate',
          cookingMinutes: 28,
          ingredients: [
            { name: { fa: 'سینه مرغ', en: 'Chicken breast' }, amount: 160, unit: 'g' },
            { name: { fa: 'برنج باسماتی پخته', en: 'Cooked basmati rice' }, amount: 180, unit: 'g' },
            { name: { fa: 'خیار و گوجه', en: 'Cucumber and tomato' }, amount: 180, unit: 'g' },
          ],
          recipe: {
            prepMinutes: 10,
            cookMinutes: 18,
            steps: [
              { fa: 'مرغ را با زعفران، آب‌لیمو و ادویه مزه‌دار کن.', en: 'Season the chicken with saffron, lemon, and spices.' },
              { fa: 'مرغ را در تابه داغ بپز تا مرکز آن کاملاً پخته شود.', en: 'Cook in a hot pan until the center is fully cooked.' },
              { fa: 'کنار برنج و سالاد شیرازی سرو کن.', en: 'Serve with rice and Shirazi salad.' },
            ],
          },
          warnings: [{ fa: 'مقدارهای تغذیه‌ای برآورد هستند.', en: 'Nutrition values are estimates.' }],
        },
        { id: 'salmon-bowl', name: { fa: 'کاسه سالمون و سیب‌زمینی', en: 'Salmon potato bowl' }, description: { fa: 'سالمون، سیب‌زمینی تنوری، سبزی و سس ماست', en: 'Salmon, roasted potatoes, greens, and yogurt sauce' }, nutrition: { calories: 645, protein: 42, carbs: 63, fat: 25 }, confidence: 'usda', cookingMinutes: 25 },
        { id: 'lentil-beef', name: { fa: 'عدس‌پلو با گوشت کم‌چرب', en: 'Lentil rice with lean beef' }, description: { fa: 'عدس‌پلو، گوشت کم‌چرب، کشمش و سبزی خوردن', en: 'Lentil rice, lean beef, raisins, and fresh herbs' }, nutrition: { calories: 635, protein: 40, carbs: 82, fat: 17 }, confidence: 'estimated', cookingMinutes: 35 },
      ],
    },
    {
      id: 'snack', label: { fa: 'میان‌وعده', en: 'Snack' }, time: '17:00', options: [
        { id: 'yogurt', name: { fa: 'ماست یونانی و میوه', en: 'Greek yogurt & fruit' }, description: { fa: 'ماست یونانی، توت، کمی عسل و تخم کدو', en: 'Greek yogurt, berries, honey, and pumpkin seeds' }, nutrition: { calories: 265, protein: 21, carbs: 31, fat: 7 }, confidence: 'manufacturer', cookingMinutes: 3 },
        { id: 'smoothie', name: { fa: 'اسموتی پروتئین و موز', en: 'Banana protein smoothie' }, description: { fa: 'شیر، موز، پروتئین و دارچین', en: 'Milk, banana, protein, and cinnamon' }, nutrition: { calories: 290, protein: 27, carbs: 39, fat: 4 }, confidence: 'manufacturer', cookingMinutes: 4 },
      ],
    },
    {
      id: 'dinner', label: { fa: 'شام', en: 'Dinner' }, time: '20:30', options: [
        { id: 'turkey-wrap', name: { fa: 'رپ بوقلمون و سبزیجات', en: 'Turkey vegetable wrap' }, description: { fa: 'بوقلمون، نان سبوس‌دار، سبزیجات و سس ماست', en: 'Turkey, wholegrain wrap, vegetables, and yogurt sauce' }, nutrition: { calories: 510, protein: 43, carbs: 54, fat: 15 }, confidence: 'estimated', cookingMinutes: 15 },
        { id: 'herb-frittata', name: { fa: 'کوکوی سبزی پرپروتئین', en: 'High-protein herb frittata' }, description: { fa: 'سبزی، تخم‌مرغ، سفیده، گردو و ماست', en: 'Herbs, eggs, egg whites, walnuts, and yogurt' }, nutrition: { calories: 490, protein: 38, carbs: 31, fat: 24 }, confidence: 'estimated', cookingMinutes: 20 },
        { id: 'tofu-noodles', name: { fa: 'نودل سبزیجات و توفو', en: 'Tofu vegetable noodles' }, description: { fa: 'توفو، نودل برنج، سبزیجات و کنجد', en: 'Tofu, rice noodles, vegetables, and sesame' }, nutrition: { calories: 525, protein: 31, carbs: 68, fat: 16 }, confidence: 'usda', cookingMinutes: 18 },
      ],
    },
  ],
  workout: {
    id: 'lower-strength', name: { fa: 'قدرت پایین‌تنه', en: 'Lower-body strength' }, focus: { fa: 'قدرت · تکنیک · میان‌تنه', en: 'Strength · technique · core' }, durationMinutes: 48, exercises: 6, intensity: 'moderate',
    exerciseItems: [
      { fa: 'اسکوات جام · ۴ × ۸', en: 'Goblet squat · 4 × 8' },
      { fa: 'ددلیفت رومانیایی · ۳ × ۱۰', en: 'Romanian deadlift · 3 × 10' },
      { fa: 'اسپلیت اسکوات · ۳ × ۸ هر پا', en: 'Split squat · 3 × 8/side' },
      { fa: 'هیپ تراست · ۳ × ۱۲', en: 'Hip thrust · 3 × 12' },
      { fa: 'پالوف پرس · ۳ × ۱۲', en: 'Pallof press · 3 × 12' },
      { fa: 'سردکردن تنفسی · ۴ دقیقه', en: 'Breathing cooldown · 4 min' },
    ],
    equipment: [
      { fa: 'دمبل ۱۲ کیلوگرمی', en: '12 kg dumbbell' },
      { fa: 'کش تمرینی', en: 'Resistance band' },
      { fa: 'نیمکت', en: 'Bench' },
    ],
    warmup: [{ fa: 'حرکت نرم و آماده‌سازی مفاصل · ۸ دقیقه', en: 'Mobility and joint preparation · 8 min' }],
    cooldown: [{ fa: 'تنفس و کشش ملایم · ۴ دقیقه', en: 'Breathing and gentle stretches · 4 min' }],
    exerciseDetails: [
      { key: 'goblet-squat', name: { fa: 'اسکوات جام', en: 'Goblet squat' }, sets: 4, reps: '8', restSeconds: 90, substitution: { fa: 'اسکوات با وزن بدن', en: 'Bodyweight squat' }, equipment: [{ fa: 'دمبل ۱۲ کیلوگرمی', en: '12 kg dumbbell' }], adaptation: { fa: 'اگر دمبل ۱۲ کیلوگرمی نداری، دامنه ۸ تا ۱۴ کیلوگرم یا نسخه وزن بدن را انتخاب کن.', en: 'If a 12 kg dumbbell is unavailable, choose 8–14 kg or the bodyweight version.' } },
      { key: 'romanian-deadlift', name: { fa: 'ددلیفت رومانیایی', en: 'Romanian deadlift' }, sets: 3, reps: '10', restSeconds: 90, substitution: { fa: 'پل باسن', en: 'Glute bridge' }, equipment: [{ fa: 'دمبل ۱۲ کیلوگرمی', en: '12 kg dumbbell' }] },
      { key: 'split-squat', name: { fa: 'اسپلیت اسکوات', en: 'Split squat' }, sets: 3, reps: '8/side', restSeconds: 75, substitution: { fa: 'لانج معکوس', en: 'Reverse lunge' } },
      { key: 'hip-thrust', name: { fa: 'هیپ تراست', en: 'Hip thrust' }, sets: 3, reps: '12', restSeconds: 75, substitution: { fa: 'پل باسن', en: 'Glute bridge' }, equipment: [{ fa: 'نیمکت', en: 'Bench' }] },
      { key: 'pallof-press', name: { fa: 'پالوف پرس', en: 'Pallof press' }, sets: 3, reps: '12', restSeconds: 60, substitution: { fa: 'پلانک', en: 'Plank' }, equipment: [{ fa: 'کش تمرینی', en: 'Resistance band' }] },
      { key: 'breathing-cooldown', name: { fa: 'سردکردن تنفسی', en: 'Breathing cooldown' }, sets: 1, reps: '4 min', restSeconds: 0, substitution: null },
    ],
  },
  shoppingGroups: [
    { id: 'protein', name: { fa: 'پروتئین', en: 'Protein' }, items: [
      { fa: 'سینه مرغ · ۷۰۰ گرم', en: 'Chicken breast · 700 g' }, { fa: 'سالمون · ۳۲۰ گرم', en: 'Salmon · 320 g' }, { fa: 'تخم‌مرغ · ۱۲ عدد', en: 'Eggs · 12' }, { fa: 'ماست یونانی · ۹۰۰ گرم', en: 'Greek yogurt · 900 g' },
    ] },
    { id: 'produce', name: { fa: 'میوه و سبزی', en: 'Produce' }, items: [
      { fa: 'خیار · ۶ عدد', en: 'Cucumber · 6' }, { fa: 'گوجه · ۸ عدد', en: 'Tomato · 8' }, { fa: 'سبزی تازه · ۳ دسته', en: 'Fresh herbs · 3 bunches' }, { fa: 'موز · ۶ عدد', en: 'Banana · 6' },
    ] },
    { id: 'pantry', name: { fa: 'مواد خشک', en: 'Pantry' }, items: [
      { fa: 'برنج باسماتی · ۱ کیلو', en: 'Basmati rice · 1 kg' }, { fa: 'جو دوسر · ۵۰۰ گرم', en: 'Oats · 500 g' }, { fa: 'عدس · ۴۰۰ گرم', en: 'Lentils · 400 g' }, { fa: 'گردو · ۱۵۰ گرم', en: 'Walnuts · 150 g' },
    ] },
  ],
  progress: {
    currentWeight: 72.8, startWeight: 76.2, targetWeight: 69, weeklyAdherence: 84, readiness: 82, recovery: 76, streak: 12,
    loggedCalories: 820, sleepMinutes: 425, energyScore: 4,
    entitlementLabel: { fa: 'عضویت Momentum', en: 'Momentum membership' },
    entitlementStatus: 'active',
    productRegion: 'intl',
    recentCheckIns: [
      { date: { fa: 'امروز', en: 'Today' }, score: 82, note: { fa: 'انرژی خوب', en: 'Good energy' }, weight: 72.8 },
      { date: { fa: 'دیروز', en: 'Yesterday' }, score: 74, note: { fa: 'خواب کوتاه', en: 'Short sleep' }, weight: 73.1 },
      { date: { fa: '۲ روز قبل', en: '2 days ago' }, score: 88, note: { fa: 'آماده', en: 'Ready' }, weight: 73.2 },
    ],
  },
}

const demoDayLabels = [
  { fa: 'امروز · روز قدرت', en: 'Today · Strength day' },
  { fa: 'فردا · روز ریکاوری', en: 'Tomorrow · Recovery day' },
  { fa: 'روز هوازی', en: 'Cardio day' },
  { fa: 'روز قدرت بالاتنه', en: 'Upper-body strength day' },
  { fa: 'روز استراحت', en: 'Rest day' },
  { fa: 'روز تمرین ترکیبی', en: 'Mixed training day' },
  { fa: 'روز تعادل و آماده‌سازی', en: 'Balance and prep day' },
]

demoPlan.days = demoDates.map((localDate, index) => {
  const restDay = index === 1 || index === 4
  const targets = restDay
    ? { calories: 1930, protein: 145, carbs: 195, fat: 64 }
    : { ...demoPlan.targets, calories: demoPlan.targets.calories + (index % 3) * 70 }
  return {
    localDate,
    dateLabel: demoDayLabels[index],
    adjustmentReason: restDay
      ? { fa: 'انرژی امروز برای ریکاوری تنظیم شده؛ پروتئین ثابت و کربوهیدرات کمی کمتر است.', en: 'Today is tuned for recovery: protein stays steady while carbohydrates are slightly lower.' }
      : { fa: 'هدف‌های امروز با شدت تمرین و روند ریکاوری هماهنگ شده‌اند.', en: 'Today’s targets are aligned with training intensity and recovery.' },
    targets,
    targetStrategy: restDay ? { fa: 'روز ریکاوری', en: 'Recovery day' } : { fa: 'روز تمرین', en: 'Training day' },
    meals: demoPlan.meals,
    workout: restDay ? null : demoPlan.workout,
  }
})

demoPlan.version = {
  id: 'demo-plan-v2',
  label: 'v2',
  cycle: 2,
  validFrom: demoDates[0],
  validTo: demoIsoDate(30),
  readyAt: `${demoDates[0]}T08:42:00.000Z`,
  source: { fa: 'چرخه دوم تأییدشده', en: 'Confirmed second cycle' },
  active: true,
  changes: [
    { label: { fa: 'تمرین‌ها از ۲ به ۳ روز افزایش یافت', en: 'Training increased from 2 to 3 days' }, detail: { fa: 'بر اساس پایبندی و زمان اعلام‌شده دوره قبل', en: 'Based on prior adherence and confirmed availability' } },
    { label: { fa: 'زمان هر جلسه با هدف ۴۸ دقیقه هماهنگ شد', en: 'Session duration aligned to 48 minutes' }, detail: { fa: 'تغییر صریح کاربر پیش از درخواست', en: 'Explicit user change before the request' } },
    { label: { fa: 'گزینه‌های ناهار بیشتر شد', en: 'More lunch options' }, detail: { fa: 'بدون تغییر در حساسیت‌ها', en: 'Allergy constraints unchanged' } },
  ],
}

demoPlan.history = [
  demoPlan.version,
  {
    id: 'demo-plan-v1',
    label: 'v1',
    cycle: 1,
    validFrom: demoIsoDate(-30),
    validTo: demoIsoDate(-1),
    source: { fa: 'چرخه اول · هدیه برنامه', en: 'First cycle · gifted plan' },
    active: false,
    changes: [],
  },
]
