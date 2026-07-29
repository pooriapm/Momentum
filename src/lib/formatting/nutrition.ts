export const UNIT_LABELS: Record<string, string> = {
  g: 'گرم',
  ml: 'میلی‌لیتر',
  piece: 'عدد',
  tbsp: 'قاشق غذاخوری',
  tsp: 'قاشق چای‌خوری',
  cup: 'پیمانه',
  slice: 'برش',
  serving: 'سروینگ',
}

export const TRAINING_LABELS: Record<string, string> = {
  rest: 'استراحت',
  crossfit: 'کراس‌فیت',
  full_body: 'فول‌بادی',
  cardio: 'هوازی',
  walk: 'پیاده‌روی',
}

export function formatNutritionNumber(value: number) {
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1,
  }).format(value)
}
