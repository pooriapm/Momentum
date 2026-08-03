import { HttpError } from './http.ts'

const nutritionSchema = {
  type: 'object',
  properties: {
    calories: { type: 'number', minimum: 0, maximum: 10_000 },
    protein_g: { type: 'number', minimum: 0, maximum: 1_000 },
    carbs_g: { type: 'number', minimum: 0, maximum: 1_000 },
    fat_g: { type: 'number', minimum: 0, maximum: 1_000 },
    fiber_g: { type: 'number', minimum: 0, maximum: 200 },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    source: {
      type: 'string',
      enum: ['model_estimate'],
    },
  },
  required: [
    'calories',
    'protein_g',
    'carbs_g',
    'fat_g',
    'fiber_g',
    'confidence',
    'source',
  ],
  additionalProperties: false,
} as const

const targetSchema = {
  type: 'object',
  properties: {
    calories: { type: 'number', minimum: 1_200, maximum: 6_000 },
    protein_g: { type: 'number', minimum: 0, maximum: 1_000 },
    carbs_g: { type: 'number', minimum: 0, maximum: 1_000 },
    fat_g: { type: 'number', minimum: 0, maximum: 1_000 },
    fiber_g: { type: 'number', minimum: 0, maximum: 200 },
    water_ml: { type: 'number', minimum: 0, maximum: 20_000 },
  },
  required: ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'water_ml'],
  additionalProperties: false,
} as const

const ingredientSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 160 },
    amount: { type: 'number', minimum: 0, maximum: 100_000 },
    unit: {
      type: 'string',
      enum: ['g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving'],
    },
    note: { type: ['string', 'null'], maxLength: 240 },
  },
  required: ['name', 'amount', 'unit', 'note'],
  additionalProperties: false,
} as const

const recipeSchema = {
  type: ['object', 'null'],
  properties: {
    prep_minutes: { type: 'integer', minimum: 0, maximum: 240 },
    cook_minutes: { type: 'integer', minimum: 0, maximum: 480 },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: { type: 'string', minLength: 1, maxLength: 500 },
    },
  },
  required: ['prep_minutes', 'cook_minutes', 'steps'],
  additionalProperties: false,
} as const

const optionSchema = {
  type: 'object',
  properties: {
    option_key: {
      type: 'string',
      pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$',
    },
    title: { type: 'string', minLength: 1, maxLength: 240 },
    ingredients: {
      type: 'array',
      minItems: 1,
      maxItems: 30,
      items: ingredientSchema,
    },
    nutrition: nutritionSchema,
    recipe: recipeSchema,
    warnings: {
      type: 'array',
      maxItems: 10,
      items: { type: 'string', minLength: 1, maxLength: 300 },
    },
    portable: { type: 'boolean' },
  },
  required: [
    'option_key',
    'title',
    'ingredients',
    'nutrition',
    'recipe',
    'warnings',
    'portable',
  ],
  additionalProperties: false,
} as const

const targetStrategySchema = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['balanced', 'training_day', 'rest_day', 'recovery_day'],
    },
    rationale: { type: 'string', minLength: 1, maxLength: 300 },
  },
  required: ['mode', 'rationale'],
  additionalProperties: false,
} as const

const exerciseSchema = {
  type: 'object',
  properties: {
    exercise_key: {
      type: 'string',
      pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$',
    },
    name: { type: 'string', minLength: 1, maxLength: 160 },
    sets: { type: 'integer', minimum: 1, maximum: 20 },
    reps: { type: 'string', minLength: 1, maxLength: 40 },
    rest_seconds: { type: 'integer', minimum: 0, maximum: 600 },
    equipment: {
      type: 'array',
      maxItems: 12,
      items: { type: 'string', minLength: 1, maxLength: 100 },
    },
    intensity_note: { type: ['string', 'null'], maxLength: 240 },
    substitution: { type: ['string', 'null'], maxLength: 240 },
  },
  required: [
    'exercise_key',
    'name',
    'sets',
    'reps',
    'rest_seconds',
    'equipment',
    'intensity_note',
    'substitution',
  ],
  additionalProperties: false,
} as const

const workoutSchema = {
  type: ['object', 'null'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 160 },
    duration_minutes: { type: 'integer', minimum: 5, maximum: 300 },
    intensity: { type: 'string', enum: ['low', 'moderate', 'high'] },
    warmup: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string', minLength: 1, maxLength: 240 },
    },
    exercises: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: exerciseSchema,
    },
    cooldown: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string', minLength: 1, maxLength: 240 },
    },
    safety_note: { type: ['string', 'null'], maxLength: 400 },
  },
  required: [
    'title',
    'duration_minutes',
    'intensity',
    'warmup',
    'exercises',
    'cooldown',
    'safety_note',
  ],
  additionalProperties: false,
} as const

export const generatedPlanJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    content_locale: { type: 'string', enum: ['fa-IR', 'en-US'] },
    plan_name: { type: 'string', minLength: 1, maxLength: 240 },
    summary: { type: 'string', minLength: 1, maxLength: 800 },
    default_targets: targetSchema,
    days: {
      type: 'array',
      minItems: 3,
      maxItems: 14,
      items: {
        type: 'object',
        properties: {
          day_index: { type: 'integer', minimum: 0, maximum: 13 },
          title: { type: 'string', minLength: 1, maxLength: 120 },
          training_type: {
            type: 'string',
            enum: [
              'rest',
              'strength',
              'crossfit',
              'full_body',
              'cardio',
              'walk',
              'mobility',
              'other',
            ],
          },
          target_strategy: targetStrategySchema,
          targets: targetSchema,
          workout: workoutSchema,
          meals: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                slot_key: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$',
                },
                type: {
                  type: 'string',
                  enum: [
                    'breakfast',
                    'morning_snack',
                    'lunch',
                    'afternoon_snack',
                    'dinner',
                    'pre_sleep',
                  ],
                },
                title: { type: 'string', minLength: 1, maxLength: 160 },
                scheduled_time: {
                  type: ['string', 'null'],
                  pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
                },
                default_option_key: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$',
                },
                options: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 4,
                  items: optionSchema,
                },
              },
              required: [
                'slot_key',
                'type',
                'title',
                'scheduled_time',
                'default_option_key',
                'options',
              ],
              additionalProperties: false,
            },
          },
          notes: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string', minLength: 1, maxLength: 300 },
          },
        },
        required: [
          'day_index',
          'title',
          'training_type',
          'target_strategy',
          'targets',
          'workout',
          'meals',
          'notes',
        ],
        additionalProperties: false,
      },
    },
    emergency_options: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: optionSchema,
    },
    restaurant_guide: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 160 },
          order_instructions: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: { type: 'string', minLength: 1, maxLength: 300 },
          },
          estimated_nutrition: nutritionSchema,
        },
        required: ['title', 'order_instructions', 'estimated_nutrition'],
        additionalProperties: false,
      },
    },
    grocery_list: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', minLength: 1, maxLength: 120 },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 40,
            items: ingredientSchema,
          },
        },
        required: ['category', 'items'],
        additionalProperties: false,
      },
    },
    health_safety_notes: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['allergy', 'medical', 'nutrition', 'training', 'general'],
          },
          level: { type: 'string', enum: ['info', 'caution', 'clinician_review'] },
          note: { type: 'string', minLength: 1, maxLength: 400 },
        },
        required: ['category', 'level', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'content_locale',
    'plan_name',
    'summary',
    'default_targets',
    'days',
    'emergency_options',
    'restaurant_guide',
    'grocery_list',
    'health_safety_notes',
  ],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertNutrition(value: unknown): void {
  if (!isRecord(value)) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated nutrition is invalid.')
  }
  const ranges: Record<string, [number, number]> = {
    calories: [0, 10_000],
    protein_g: [0, 1_000],
    carbs_g: [0, 1_000],
    fat_g: [0, 1_000],
    fiber_g: [0, 200],
  }
  for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
    const number = value[key]
    if (
      typeof number !== 'number' ||
      !Number.isFinite(number) ||
      number < minimum ||
      number > maximum
    ) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated nutrition is invalid.')
    }
  }
  if (!['low', 'medium', 'high'].includes(String(value.confidence))) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated nutrition confidence is invalid.')
  }
  if (value.source !== 'model_estimate') {
    throw new HttpError(502, 'invalid_plan_output', 'Generated nutrition source is invalid.')
  }

  const macroCalories = Number(value.protein_g) * 4 +
    Number(value.carbs_g) * 4 + Number(value.fat_g) * 9
  const tolerance = Math.max(120, Number(value.calories) * 0.25)
  if (Math.abs(macroCalories - Number(value.calories)) > tolerance) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated nutrition totals are inconsistent.')
  }
}

function assertTarget(value: unknown, minimumCalories: number): void {
  if (!isRecord(value)) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated targets are invalid.')
  }
  const ranges: Record<string, [number, number]> = {
    calories: [minimumCalories, 6_000],
    protein_g: [0, 1_000],
    carbs_g: [0, 1_000],
    fat_g: [0, 1_000],
    fiber_g: [0, 200],
    water_ml: [0, 20_000],
  }
  for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
    const number = value[key]
    if (
      typeof number !== 'number' ||
      !Number.isFinite(number) ||
      number < minimum ||
      number > maximum
    ) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated targets are invalid.')
    }
  }
  const macroCalories = Number(value.protein_g) * 4 +
    Number(value.carbs_g) * 4 + Number(value.fat_g) * 9
  const tolerance = Math.max(180, Number(value.calories) * 0.25)
  if (Math.abs(macroCalories - Number(value.calories)) > tolerance) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated target totals are inconsistent.')
  }
}

function normalizeFoodTerm(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function assertNoDeclaredAllergens(
  option: Record<string, unknown>,
  normalizedAllergens: string[],
): void {
  if (!Array.isArray(option.ingredients)) return
  for (const ingredient of option.ingredients) {
    if (!isRecord(ingredient) || typeof ingredient.name !== 'string') continue
    const ingredientName = normalizeFoodTerm(ingredient.name)
    if (
      normalizedAllergens.some((allergen) =>
        allergen.length >= 2 && (
          ingredientName === allergen ||
          ingredientName.includes(` ${allergen} `) ||
          ingredientName.startsWith(`${allergen} `) ||
          ingredientName.endsWith(` ${allergen}`)
        )
      )
    ) {
      throw new HttpError(
        502,
        'allergen_in_generated_plan',
        'Generated plan contains a declared allergen.',
      )
    }
  }
}

function assertWorkout(value: unknown): void {
  if (value === null) return
  if (
    !isRecord(value) ||
    !Number.isInteger(value.duration_minutes) ||
    Number(value.duration_minutes) < 5 ||
    Number(value.duration_minutes) > 300 ||
    !Array.isArray(value.exercises) ||
    value.exercises.length < 1 ||
    value.exercises.length > 20
  ) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated workout is invalid.')
  }

  const exerciseKeys = new Set<string>()
  for (const exercise of value.exercises) {
    if (
      !isRecord(exercise) ||
      typeof exercise.exercise_key !== 'string' ||
      !Number.isInteger(exercise.sets) ||
      Number(exercise.sets) < 1 ||
      Number(exercise.sets) > 20 ||
      typeof exercise.reps !== 'string' ||
      !Number.isInteger(exercise.rest_seconds) ||
      Number(exercise.rest_seconds) < 0 ||
      Number(exercise.rest_seconds) > 600 ||
      exerciseKeys.has(exercise.exercise_key)
    ) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated workout exercise is invalid.')
    }
    exerciseKeys.add(exercise.exercise_key)
  }
}

export function assertGeneratedPlan(
  value: unknown,
  requestedDays: number,
  requestedLocale: 'fa-IR' | 'en-US',
  safety: { minimumCalories?: number; allergies?: string[] } = {},
): asserts value is Record<string, unknown> {
  if (
    !isRecord(value) ||
    typeof value.plan_name !== 'string' ||
    value.content_locale !== requestedLocale
  ) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated plan is invalid.')
  }
  const minimumCalories = Math.max(1_200, Math.min(6_000, safety.minimumCalories ?? 1_200))
  const normalizedAllergens = (safety.allergies ?? [])
    .map(normalizeFoodTerm)
    .filter(Boolean)
  assertTarget(value.default_targets, minimumCalories)
  if (!Array.isArray(value.days) || value.days.length !== requestedDays) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated plan has the wrong number of days.')
  }

  const dayIndexes = new Set<number>()
  for (const rawDay of value.days) {
    if (!isRecord(rawDay) || !Number.isInteger(rawDay.day_index)) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated plan day is invalid.')
    }
    const dayIndex = rawDay.day_index as number
    if (dayIndex < 0 || dayIndex >= requestedDays || dayIndexes.has(dayIndex)) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated plan day indexes are invalid.')
    }
    dayIndexes.add(dayIndex)
    assertTarget(rawDay.targets, minimumCalories)
    assertWorkout(rawDay.workout)
    if (!Array.isArray(rawDay.meals) || rawDay.meals.length < 1 || rawDay.meals.length > 8) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated meals are invalid.')
    }

    const slotKeys = new Set<string>()
    let dayDefaultCalories = 0
    for (const rawMeal of rawDay.meals) {
      if (!isRecord(rawMeal) || typeof rawMeal.slot_key !== 'string') {
        throw new HttpError(502, 'invalid_plan_output', 'Generated meal slot is invalid.')
      }
      if (slotKeys.has(rawMeal.slot_key)) {
        throw new HttpError(502, 'invalid_plan_output', 'Generated meal slot keys are duplicated.')
      }
      slotKeys.add(rawMeal.slot_key)
      if (
        !Array.isArray(rawMeal.options) || rawMeal.options.length < 1 || rawMeal.options.length > 4
      ) {
        throw new HttpError(502, 'invalid_plan_output', 'Generated meal options are invalid.')
      }

      const optionKeys = new Set<string>()
      let defaultCalories: number | undefined
      for (const rawOption of rawMeal.options) {
        if (!isRecord(rawOption) || typeof rawOption.option_key !== 'string') {
          throw new HttpError(502, 'invalid_plan_output', 'Generated meal option is invalid.')
        }
        if (optionKeys.has(rawOption.option_key)) {
          throw new HttpError(502, 'invalid_plan_output', 'Generated option keys are duplicated.')
        }
        optionKeys.add(rawOption.option_key)
        assertNutrition(rawOption.nutrition)
        assertNoDeclaredAllergens(rawOption, normalizedAllergens)
        if (
          rawOption.option_key === rawMeal.default_option_key &&
          isRecord(rawOption.nutrition)
        ) {
          defaultCalories = Number(rawOption.nutrition.calories)
        }
      }
      if (!optionKeys.has(String(rawMeal.default_option_key))) {
        throw new HttpError(502, 'invalid_plan_output', 'Generated default option is invalid.')
      }
      if (!Number.isFinite(defaultCalories)) {
        throw new HttpError(
          502,
          'invalid_plan_output',
          'Generated default option nutrition is invalid.',
        )
      }
      dayDefaultCalories += Number(defaultCalories)
    }
    const targetCalories = isRecord(rawDay.targets) ? Number(rawDay.targets.calories) : Number.NaN
    const dayTolerance = Math.max(250, targetCalories * 0.25)
    if (Math.abs(dayDefaultCalories - targetCalories) > dayTolerance) {
      throw new HttpError(
        502,
        'invalid_plan_output',
        'Default meals do not match the daily calorie target.',
      )
    }
  }

  if (!Array.isArray(value.emergency_options)) {
    throw new HttpError(502, 'invalid_plan_output', 'Generated emergency options are invalid.')
  }
  for (const option of value.emergency_options) {
    if (!isRecord(option)) {
      throw new HttpError(502, 'invalid_plan_output', 'Generated emergency option is invalid.')
    }
    assertNutrition(option.nutrition)
    assertNoDeclaredAllergens(option, normalizedAllergens)
  }
}
