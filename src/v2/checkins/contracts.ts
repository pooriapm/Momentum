import { z } from 'zod'

export const redFlagSchema = z.enum([
  'chest_pain',
  'fainting',
  'severe_shortness_of_breath',
  'sudden_weakness_or_numbness',
])

export const safetyLevelSchema = z.enum(['normal', 'caution', 'urgent'])

export const dailyCheckInInputSchema = z.object({
  adherencePercent: z.number().finite().min(0).max(100).optional(),
  energyScore: z.number().int().min(1).max(5),
  hungerScore: z.number().int().min(1).max(5),
  moodScore: z.number().int().min(1).max(5),
  sleepMinutes: z.number().int().min(0).max(1440),
  weightKg: z.number().finite().min(20).max(500).optional(),
  painScore: z.number().int().min(0).max(10),
  painLocation: z.string().trim().max(240).optional(),
  trainingDifficultyScore: z.number().int().min(1).max(5).optional(),
  recoveryScore: z.number().int().min(1).max(5),
  notes: z.string().trim().max(2000).optional(),
  redFlags: z.array(redFlagSchema).max(4).default([]),
}).superRefine((value, context) => {
  if (value.painScore > 0 && !value.painLocation) {
    context.addIssue({
      code: 'custom',
      message: 'pain_location_required',
      path: ['painLocation'],
    })
  }
})

export const weeklyCheckInInputSchema = z.object({
  overallScore: z.number().int().min(1).max(5),
  recoveryTrend: z.enum(['improved', 'stable', 'worse']),
  trainingTrend: z.enum(['easier', 'same', 'harder', 'not_applicable']),
  painTrend: z.enum(['improved', 'stable', 'worse', 'no_pain']),
  circumstancesChanged: z.boolean(),
  conditionChange: z.enum([
    'none',
    'new_condition',
    'medication_change',
    'injury_or_worsening_pain',
    'other',
  ]),
  changeNotes: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  redFlags: z.array(redFlagSchema).max(4).default([]),
}).superRefine((value, context) => {
  if ((value.circumstancesChanged || value.conditionChange !== 'none') && !value.changeNotes) {
    context.addIssue({
      code: 'custom',
      message: 'change_notes_required',
      path: ['changeNotes'],
    })
  }
})

const nullableAverageSchema = z.number().finite().nullable()
const trendPeriodSchema = z.object({
  adherence_percent: nullableAverageSchema,
  pain_score: nullableAverageSchema,
  recovery_score: nullableAverageSchema,
  training_difficulty_score: nullableAverageSchema,
})

export const checkInSafetySchema = z.object({
  level: safetyLevelSchema,
  reasons: z.array(z.string().min(1).max(80)).max(8),
})

export const dailyCheckInResponseSchema = z.object({
  checkin: z.object({
    id: z.string().uuid(),
    local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updated_at: z.string(),
  }),
  safety: checkInSafetySchema,
  idempotent_replay: z.boolean().optional(),
})

export const weeklyCheckInResponseSchema = z.object({
  checkin: z.object({
    id: z.string().uuid(),
    week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updated_at: z.string(),
    trend_summary: z.object({
      current: trendPeriodSchema,
      previous: trendPeriodSchema,
      delta: trendPeriodSchema,
      current_daily_count: z.number().int().nonnegative().max(7),
      previous_daily_count: z.number().int().nonnegative().max(7),
    }),
  }),
  safety: checkInSafetySchema,
  idempotent_replay: z.boolean().optional(),
})

export type DailyCheckInInput = z.input<typeof dailyCheckInInputSchema>
export type WeeklyCheckInInput = z.input<typeof weeklyCheckInInputSchema>
export type CheckInSafety = z.infer<typeof checkInSafetySchema>
export type WeeklyCheckInResult = z.infer<typeof weeklyCheckInResponseSchema>
