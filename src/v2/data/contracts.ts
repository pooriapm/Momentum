import { z } from 'zod'

const nullableNumber = z.number().finite().nullable()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const nutritionApiSchema = z.object({
  calories: z.number().finite().nonnegative().max(10_000),
  protein_g: z.number().finite().nonnegative().max(1_000),
  carbs_g: z.number().finite().nonnegative().max(1_000),
  fat_g: z.number().finite().nonnegative().max(1_000),
  fiber_g: z.number().finite().nonnegative().max(200),
  confidence: z.enum(['low', 'medium', 'high']),
  source: z.enum(['model_estimate', 'catalog_reference', 'food_label', 'verified_database', 'user_provided']),
})
const targetApiSchema = z.object({
  calories: z.number().positive().max(10_000),
  protein_g: z.number().nonnegative().max(1_000),
  carbs_g: z.number().nonnegative().max(1_000),
  fat_g: z.number().nonnegative().max(1_000),
  fiber_g: z.number().nonnegative().max(200),
  water_ml: z.number().nonnegative().max(20_000),
})
const ingredientApiSchema = z.object({
  ingredient_id: z.string().optional(),
  name: z.string().min(1).max(160),
  amount: z.number().nonnegative().max(100_000),
  unit: z.string().min(1).max(30),
  note: z.string().max(240).nullable(),
})
const recipeApiSchema = z.object({
  prep_minutes: z.number().int().nonnegative().max(240),
  cook_minutes: z.number().int().nonnegative().max(480),
  steps: z.array(z.string().min(1).max(500)).min(1).max(12),
}).nullable()

const dashboardPlanDaySchema = z.object({
  local_date: isoDate,
  day_index: z.number().int().nonnegative(),
  title: z.string().nullable(),
  training_type: z.string(),
  target_strategy: z.object({ mode: z.string(), rationale: z.string() }).nullable(),
  targets: targetApiSchema,
  workout: z.object({
    title: z.string().min(1),
    duration_minutes: z.number().int().positive().max(300),
    intensity: z.enum(['low', 'moderate', 'high']),
    warmup: z.array(z.string()),
    exercises: z.array(z.object({
      exercise_id: z.string().optional(),
      exercise_key: z.string(),
      name: z.string(),
      sets: z.number().int().positive(),
      reps: z.string(),
      rest_seconds: z.number().int().nonnegative(),
      equipment: z.array(z.string()),
      equipment_ids: z.array(z.string()).optional(),
      intensity_note: z.string().nullable(),
      substitution: z.string().nullable(),
      substitution_exercise_id: z.string().nullable().optional(),
    })),
    cooldown: z.array(z.string()),
    safety_note: z.string().nullable(),
  }).nullable(),
  meals: z.array(z.object({
    slot_key: z.string(),
    type: z.string(),
    title: z.string(),
    scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    default_option_key: z.string(),
    selected_option_key: z.string().nullable(),
    completion_status: z.enum(['planned', 'completed', 'skipped']),
    completed_at: z.string().nullable(),
    options: z.array(z.object({
      food_id: z.string().optional(),
      option_key: z.string(),
      title: z.string(),
      ingredients: z.array(ingredientApiSchema),
      nutrition: nutritionApiSchema,
      recipe: recipeApiSchema,
      portable: z.boolean(),
      warnings: z.array(z.string()),
    })).min(1),
  })).min(1),
})

const dashboardPlanSchema = z.object({
  id: z.string().uuid(),
  version_id: z.string().uuid(),
  schema_version: z.string(),
  content_locale: z.enum(['fa-IR', 'en-US']),
  name: z.string().min(1),
  valid_from: isoDate,
  valid_to: isoDate,
  locale: z.enum(['fa-IR', 'en-US']),
  summary: z.string().nullable(),
  grocery_list: z.array(z.object({
    category: z.string().min(1),
    items: z.array(ingredientApiSchema),
  })),
  health_safety_notes: z.array(z.object({
    category: z.string(),
    level: z.string(),
    note: z.string(),
  })),
  day: dashboardPlanDaySchema,
  days: z.array(dashboardPlanDaySchema).min(1).max(31),
})

const checkinSchema = z.object({
  local_date: isoDate,
  weight_kg: nullableNumber,
  waist_cm: nullableNumber,
  sleep_minutes: z.number().int().nonnegative().nullable(),
  hunger_score: z.number().min(1).max(5).nullable(),
  mood_score: z.number().min(1).max(5).nullable(),
  energy_score: z.number().min(1).max(5).nullable(),
  water_ml: z.number().int().nonnegative().nullable(),
  steps: z.number().int().nonnegative().nullable(),
  adherence_percent: z.number().min(0).max(100).nullable(),
})

export const dashboardResponseSchema = z.object({
  dashboard: z.object({
    local_date: isoDate,
    profile: z.object({
      display_name: z.string(),
      date_of_birth: isoDate.nullable(),
      sex: z.string().nullable(),
      height_cm: nullableNumber,
      locale: z.enum(['fa-IR', 'en-US']),
      timezone: z.string(),
      country_code: z.string().length(2).nullable(),
      pricing_market: z.enum(['ir', 'global']),
      unit_system: z.string(),
      onboarding_status: z.string(),
      automation_block_reason: z.string().nullable(),
      ai_country_verified: z.boolean().optional(),
      email_confirmed: z.boolean().optional(),
    }),
    active_goal: z.object({
      id: z.string().uuid(),
      goal_type: z.string(),
      custom_goal: z.string().nullable(),
      start_weight_kg: z.number().positive(),
      target_weight_kg: z.number().positive(),
      journey_start_date: isoDate,
      target_date: isoDate,
      status: z.string(),
    }).nullable(),
    checkin: checkinSchema.nullable(),
    recent_checkins: z.array(checkinSchema).max(31),
    latest_body_weight: z.object({
      id: z.string().uuid(),
      measured_at: z.string(),
      weight_kg: z.number().positive(),
      extraction_status: z.string(),
    }).nullable(),
    entitlement_usage: z.object({
      entitlement: z.object({
        id: z.string().uuid(), source: z.string(), status: z.string(), period_start: z.string(), period_end: z.string(),
      }),
      plan_generation: z.object({ used: z.number(), limit: z.number(), remaining: z.number() }),
      coach_message: z.object({ used: z.number(), limit: z.number(), remaining: z.number() }),
      body_composition_extraction: z.object({ used: z.number(), limit: z.number(), remaining: z.number() }),
    }).nullable(),
    ai_access: z.object({
      plan: z.object({
        state: z.enum(['ready', 'pending_verification', 'region_blocked', 'disabled', 'safety_blocked']),
        reason: z.string(),
      }),
    }),
    plan: dashboardPlanSchema.nullable(),
  }),
})

export const coachHistoryRowsSchema = z.array(z.object({
  id: z.string().uuid(),
  role: z.enum(['assistant', 'user']),
  content: z.string().min(1).max(8_000),
  safety_level: z.enum(['normal', 'caution', 'urgent']),
  suggested_actions: z.array(z.string()).max(4),
  created_at: z.string(),
})).max(100)

const coachCompletedResponseSchema = z.object({
  thread_id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    thread_id: z.string().uuid(),
    content: z.string().min(1).max(8_000),
    safety_level: z.string(),
    created_at: z.string(),
  }),
  suggested_actions: z.array(z.string()).optional(),
  safety: z.object({ level: z.string(), reason: z.string().nullable() }).optional(),
})

export const coachEdgeResponseSchema = z.union([
  coachCompletedResponseSchema,
  z.object({
    status: z.literal('in_progress'),
    idempotent_replay: z.literal(true),
  }),
])

export const onboardingCompletionSchema = z.object({
  onboarding: z.object({
    status: z.enum(['complete', 'automation_blocked']),
    automation_block_reason: z.string().nullable(),
    goal_id: z.string().uuid(),
    country_code: z.string().length(2),
    ai_country_verified: z.boolean(),
  }),
})

export const generationResponseSchema = z.union([
  z.object({
    job: z.object({ id: z.string().uuid(), status: z.string() }),
    plan: z.unknown().optional(),
    idempotent_replay: z.boolean().optional(),
  }),
  z.object({
    job: z.object({
      id: z.string().uuid().optional(),
      status: z.literal('in_progress'),
    }),
    idempotent_replay: z.literal(true),
  }),
])

const extractionObservationSchema = z.object({
  value: z.number().nullable(),
  unit: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
})

export const bodyCompositionAnalysisSchema = z.union([
  z.object({
    measurement: z.object({
      id: z.string().uuid(),
      extraction_status: z.enum(['needs_confirmation', 'confirmed']),
      extraction_result: z.object({
        measurements: z.record(z.string(), extractionObservationSchema),
      }),
    }),
    idempotent_replay: z.boolean().optional(),
  }),
  z.object({ status: z.literal('processing'), idempotent_replay: z.literal(true) }),
])

export const bodyCompositionConfirmationSchema = z.object({
  body_composition: z.object({
    id: z.string().uuid(),
    extraction_status: z.literal('confirmed'),
  }).passthrough(),
})

export const accountExportResponseSchema = z.object({
  export: z.object({
    schema_version: z.literal('momentum-account-export-v1'),
    generated_at: z.string(),
    account: z.object({ id: z.string().uuid(), email: z.string().email().nullable() }),
    data: z.record(z.string(), z.array(z.unknown())),
    note: z.string(),
  }),
})

export const accountDeleteResponseSchema = z.object({ deleted: z.literal(true) })

export const planRevisionResponseSchema = z.object({
  revision: z.object({
    id: z.string().uuid().optional(),
    revision_id: z.string().uuid().optional(),
    status: z.enum(['preview', 'active', 'cancelled', 'expired', 'rolled_back']),
    plan_id: z.string().uuid().optional(),
    from_version_id: z.string().uuid().optional(),
    candidate_version_id: z.string().uuid().optional(),
    active_version_id: z.string().uuid().optional(),
    change_reason: z.object({
      code: z.string().optional(),
      rationale: z.string().optional(),
      user_reason: z.string().nullable().optional(),
    }).passthrough().optional(),
    diff: z.object({
      mode: z.string().optional(),
      changed_workouts: z.number().int().nonnegative().optional(),
      changed_exercises: z.number().int().nonnegative().optional(),
      nutrition_changed: z.boolean().optional(),
      operations: z.array(z.unknown()).optional(),
    }).passthrough().optional(),
    expires_at: z.string().optional(),
    confirmed_at: z.string().nullable().optional(),
    rolled_back_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
  }).passthrough().nullable(),
})

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>
