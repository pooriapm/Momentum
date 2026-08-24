import { z } from 'zod'

const boundedText = (maximum: number) => z.string().trim().max(maximum)
const boundedList = z.array(boundedText(160).min(1)).max(50)

export const trainingScheduleItemSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  activityType: z.enum(['strength', 'crossfit', 'full_body', 'cardio', 'walk', 'mobility', 'other']),
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(10).max(300),
})

export const accountSettingsUpdateSchema = z.object({
  displayName: boundedText(120).min(1),
  sex: z.enum(['female', 'male', 'other', 'prefer_not_to_say']),
  heightCm: z.number().finite().min(100).max(250),
  locale: z.enum(['fa-IR', 'en-US']),
  unitSystem: z.enum(['auto', 'metric', 'us_customary']),
  goalType: z.enum(['fat_loss', 'muscle_gain', 'maintenance', 'performance', 'custom']),
  customGoal: boundedText(1000).optional(),
  targetWeightKg: z.number().finite().min(35).max(350),
  dietaryPattern: boundedText(200).min(1),
  favoriteFoods: boundedList,
  allergies: boundedList,
  availableEquipment: boundedList,
  workSchedule: boundedText(1000),
  cuisineRegion: z.enum(['iran', 'middle_east', 'international']),
  schedule: z.array(trainingScheduleItemSchema).max(7),
}).superRefine((value, context) => {
  if (value.goalType === 'custom' && !value.customGoal) {
    context.addIssue({ code: 'custom', message: 'custom_goal_required', path: ['customGoal'] })
  }
  if (new Set(value.schedule.map((item) => item.weekday)).size !== value.schedule.length) {
    context.addIssue({ code: 'custom', message: 'duplicate_schedule_day', path: ['schedule'] })
  }
})

const storedScheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  activity_type: z.string(),
  local_start_time: z.string().nullable(),
  duration_minutes: z.number().int().nullable(),
})

export const accountSettingsResponseSchema = z.object({
  settings: z.object({
    profile: z.object({
      display_name: z.string(),
      date_of_birth: z.string().nullable(),
      sex: z.string().nullable(),
      height_cm: z.number().nullable(),
      locale: z.enum(['fa-IR', 'en-US']),
      timezone: z.string(),
      unit_system: z.enum(['auto', 'metric', 'us_customary']),
      product_region: z.enum(['ir', 'intl']).optional(),
      country_code: z.string().length(2).nullable(),
      pricing_market: z.string(),
      ai_country_verified: z.boolean(),
      health_data_consent_at: z.string().nullable(),
      health_consent_version: z.string().nullable(),
      analytics_consent_at: z.string().nullable().optional(),
      analytics_consent_version: z.literal('analytics-v1').nullable().optional(),
      terms_version: z.string().nullable().optional(),
      privacy_version: z.string().nullable().optional(),
      payment_method_status: z.enum(['not_collected', 'pending', 'stub_recorded']).optional(),
    }),
    goal: z.object({
      goal_type: z.string(),
      custom_goal: z.string().nullable(),
      start_weight_kg: z.number(),
      target_weight_kg: z.number(),
    }).nullable(),
    dietary: z.object({
      dietary_pattern: z.string().nullable(),
      favorite_foods: z.array(z.string()),
      allergies: z.array(z.string()),
      available_equipment: z.array(z.string()),
      work_schedule: z.string().nullable(),
      cuisine_region: z.enum(['iran', 'middle_east', 'international']),
    }).nullable(),
    schedule: z.array(storedScheduleSchema).max(7),
  }),
})

export const accountSettingsUpdateResponseSchema = z.object({
  settings: z.object({
    updated: z.literal(true),
    plan_review_required: z.boolean(),
    changed_sections: z.array(z.string()),
  }),
})

export const consentWithdrawalResponseSchema = z.object({
  withdrawal: z.object({
    withdrawn: z.literal(true),
    plan_review_required: z.literal(true),
  }),
})

export const analyticsConsentResponseSchema = z.object({
  analytics: z.object({
    enabled: z.boolean(),
    version: z.literal('analytics-v1').nullable(),
  }),
})

export type AccountSettingsUpdate = z.infer<typeof accountSettingsUpdateSchema>
export type AccountSettings = z.infer<typeof accountSettingsResponseSchema>['settings']
