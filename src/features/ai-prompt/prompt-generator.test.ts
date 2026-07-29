import { describe, expect, it } from 'vitest'
import type { UserProfile } from '../../types/domain'
import {
  buildMomentumAiPrompt,
  getMissingPromptQuestions,
} from './prompt-generator'

const completeProfile: UserProfile = {
  name: 'کاربر نمونه',
  age: 32,
  sex: 'prefer_not_to_say',
  activityLevel: 'moderate',
  heightCm: 175,
  startWeightKg: 82,
  currentWeightKg: 80,
  targetWeightKg: 74,
  journeyStartDate: '2026-07-01',
  goalDate: '2026-11-01',
  planningPreferences: {
    goalType: 'fat_loss',
    dietType: 'همه‌چیزخوار',
    requestedMealPattern: 'سه وعده و دو میان‌وعده',
    preferredOptionCount: 3,
    favoriteFoods: ['غذای ایرانی'],
    dislikedFoods: ['غذای بسیار چرب'],
    allergies: ['ندارد'],
    medicalConsiderations: ['ندارد'],
    medications: ['ندارد'],
    supplements: ['ندارد'],
    lifestyleNotes: ['کار اداری'],
    workSchedule: 'شنبه تا چهارشنبه ۹ تا ۱۷',
    cookingLimitations: ['حداکثر ۳۰ دقیقه'],
    budget: 'متوسط',
    availableEquipment: ['اجاق', 'فر'],
    restaurantMealsPerWeek: 1,
    restaurantPreferences: ['رستوران ایرانی', 'جوجه‌کباب'],
    groceryPreferences: ['خرید جمعه', 'meal-prep هفتگی'],
    trainingSchedule: 'سه جلسه تمرین قدرتی در هفته',
  },
}

describe('external AI prompt generator', () => {
  it('asks only fields that are missing', () => {
    const incomplete = {
      ...completeProfile,
      age: undefined,
      planningPreferences: {
        ...completeProfile.planningPreferences,
        budget: undefined,
      },
    }

    expect(
      getMissingPromptQuestions(incomplete).map((question) => question.path),
    ).toEqual(['age', 'planningPreferences.budget'])
  })

  it('builds a complete schema v2 package without calling an AI service', () => {
    const prompt = buildMomentumAiPrompt(completeProfile)

    expect(prompt).toContain('"schemaVersion": "0.2.0"')
    expect(prompt).toContain('nutritionConfidence')
    expect(prompt).toContain('targetStrategy')
    expect(prompt).toContain('Do not guess missing values.')
    expect(prompt).toContain('پاسخ نهایی فقط یک JSON معتبر باشد')
    expect(prompt).toContain('"measuredAt": "YYYY-MM-DD"')
    expect(prompt).toContain('"type": "walk"')
    expect(prompt).toContain('`rest | crossfit | full_body | cardio | walk`')
    expect(prompt).toContain('رشته متنی در این آرایه ممنوع است')
    expect(prompt).toContain('نوع جدیدی مانند `craving_control_snack`')
    expect(prompt).toContain('Waist-Hip Ratio را به آن تبدیل نکن')
    expect(prompt).toContain('تا وقتی اطلاعات ضروری کامل نشده‌اند')
    expect(prompt).toContain('همه سؤال‌ها را در همان یک پیام بپرس')
    expect(prompt).toContain('بهینه‌سازی توکن بدون افت کیفیت')
    expect(prompt).toContain(
      'برای کاهش توکن، تعداد وعده‌ها، تعداد گزینه‌های درخواستی',
    )
    expect(prompt).toContain('`restaurantGuide` اجباری و غیرخالی است')
    expect(prompt).toContain('`groceryList` اجباری و غیرخالی است')
    expect(prompt).toContain('ترجیحات رستوران و سفارش')
    expect(prompt).toContain('ترجیحات لیست خرید')
  })
})
