import type { AppLocale } from '../../../platform/i18n/catalog'

const guides = {
  dietStyle: {
    fa: 'بگو همه‌چیز می‌خوری یا گیاهی. وعده‌ها از همین انتخاب چیده می‌شوند.',
    en: 'Say whether you eat everything or keep it vegetarian. Meals are built from that.',
  },
  allergies: {
    fa: 'چیزهایی که نباید در غذا باشد را انتخاب کن. برنامه همان‌ها را کنار می‌گذارد.',
    en: 'Pick what must stay out of the food. The plan leaves those out.',
  },
  otherAllergy: {
    fa: 'حساسیتی که در فهرست نیست را بنویس. همان عبارت در ساخت برنامه می‌ماند.',
    en: 'Name an allergy that is not in the list. That wording stays with the plan.',
  },
  favoriteFoods: {
    fa: 'غذاهایی که دوست داری را با ویرگول بنویس. برنامه دور همان‌ها می‌چرخد.',
    en: 'List foods you like, separated by commas. The month is built around them.',
  },
  dislikedFoods: {
    fa: 'چیزهایی که نمی‌خواهی ببینی را بنویس. از وعده‌ها و خرید حذف می‌شوند.',
    en: 'Write what you do not want to see. It is left out of meals and the shopping list.',
  },
  requestedMealCount: {
    fa: 'چند وعده در روز برایت واقعی است. حجم غذا بین همین تعداد تقسیم می‌شود.',
    en: 'Choose how many meals a real day has. The food is split across that number.',
  },
  requestedMealPattern: {
    fa: 'شکل روزت را بنویس، مثلاً ناهار سنگین. چیدمان وعده‌ها از همین الگو می‌آید.',
    en: 'Describe the shape of your day, like a large lunch. Meals follow that pattern.',
  },
  preferredOptionCount: {
    fa: 'برای هر وعده چند انتخاب می‌خواهی. بیشتر یعنی تنوع، کمتر یعنی تصمیم ساده‌تر.',
    en: 'How many choices each meal should offer. More means variety, fewer means a simpler day.',
  },
  cookingConstraints: {
    fa: 'وقت، وسایل، یا مهارتی که نداری را بنویس. دستورها در همان حد می‌مانند.',
    en: 'Write the time, tools, or skill you do not have. Recipes stay inside that limit.',
  },
  foodBudget: {
    fa: 'سطح خرج غذا را انتخاب کن. مواد و خرید با همین سطح تنظیم می‌شود.',
    en: 'Pick how much the food should cost. Ingredients and the shop follow that level.',
  },
  restaurantMealsPerWeek: {
    fa: 'چند وعده بیرون از خانه است. برنامه برای همان وعده‌ها ساده‌تر می‌شود.',
    en: 'How many meals happen away from home. Those meals are kept simpler.',
  },
  restaurantPreferences: {
    fa: 'بیرون چه می‌خوری یا از چه پرهیز می‌کنی. همان محدودیت در وعده‌های رستوران می‌ماند.',
    en: 'Say what you eat out, or what you skip. Restaurant meals keep that limit.',
  },
  groceryPreferences: {
    fa: 'فروشگاه و ریتم خرید را بنویس، مثلاً هفتگی و نزدیک خانه. فهرست خرید همان‌طور چیده می‌شود.',
    en: 'Name the store and how often you shop, like weekly and nearby. The list is arranged that way.',
  },
} as const

export function foodGuide(fieldKey: string, locale: AppLocale) {
  const guide = guides[fieldKey as keyof typeof guides]
  if (!guide) return undefined
  return locale === 'fa' ? guide.fa : guide.en
}
