import { nutritionSchema } from './plan-contract.ts'
import { HttpError } from './http.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import {
  assembleExercise,
  assembleMealOption,
  assembleNutritionFromFoods,
  aggregateGroceryList,
} from './plan-assembly.ts'

export const COMPACT_SCHEMA_VERSION = '1.1.0-compact'
export const COMPACT_EXPANSION_VERSION = 'momentum-compact-expand/1.1.0'

/**
 * Compact provider schema: define meals/workouts once, reference from 30 days.
 * Expanded result must still satisfy the public full-plan contract.
 */
export const compactPlanJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    content_locale: { type: 'string', enum: ['fa-IR', 'en-US'] },
    plan_name: { type: 'string', minLength: 1, maxLength: 240 },
    summary: { type: 'string', minLength: 1, maxLength: 800 },
    schema_version: { type: 'string', const: COMPACT_SCHEMA_VERSION },
    default_targets: {
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
    },
    meal_definitions: {
      type: 'array',
      minItems: 1,
      maxItems: 40,
      items: {
        type: 'object',
        properties: {
          meal_def_id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$',
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
          food_id: {
            type: 'string',
            pattern: '^food:[a-z0-9._-]+@v[1-9][0-9]*$',
          },
          serving_multiplier: { type: 'number', minimum: 0.25, maximum: 4 },
          alt_food_ids: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'string',
              pattern: '^food:[a-z0-9._-]+@v[1-9][0-9]*$',
            },
          },
          note: { type: ['string', 'null'], maxLength: 240 },
        },
        required: [
          'meal_def_id',
          'type',
          'title',
          'scheduled_time',
          'food_id',
          'serving_multiplier',
          'alt_food_ids',
          'note',
        ],
        additionalProperties: false,
      },
    },
    workout_definitions: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          workout_def_id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$',
          },
          title: { type: 'string', minLength: 1, maxLength: 160 },
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
          duration_minutes: { type: 'integer', minimum: 5, maximum: 300 },
          intensity: { type: 'string', enum: ['low', 'moderate', 'high'] },
          exercises: {
            type: 'array',
            minItems: 1,
            maxItems: 12,
            items: {
              type: 'object',
              properties: {
                exercise_id: {
                  type: 'string',
                  pattern: '^exercise:[a-z0-9._-]+@v[1-9][0-9]*$',
                },
                sets: { type: 'integer', minimum: 1, maximum: 20 },
                reps: { type: 'string', minLength: 1, maxLength: 40 },
                rest_seconds: { type: 'integer', minimum: 0, maximum: 600 },
                intensity_note: { type: ['string', 'null'], maxLength: 240 },
                substitution_exercise_id: {
                  type: ['string', 'null'],
                  pattern: '^exercise:[a-z0-9._-]+@v[1-9][0-9]*$',
                },
              },
              required: [
                'exercise_id',
                'sets',
                'reps',
                'rest_seconds',
                'intensity_note',
                'substitution_exercise_id',
              ],
              additionalProperties: false,
            },
          },
          safety_note: { type: ['string', 'null'], maxLength: 400 },
        },
        required: [
          'workout_def_id',
          'title',
          'training_type',
          'duration_minutes',
          'intensity',
          'exercises',
          'safety_note',
        ],
        additionalProperties: false,
      },
    },
    days: {
      type: 'array',
      minItems: MONTHLY_PLAN_DAYS,
      maxItems: MONTHLY_PLAN_DAYS,
      items: {
        type: 'object',
        properties: {
          day_index: { type: 'integer', minimum: 0, maximum: MONTHLY_PLAN_DAYS - 1 },
          title: { type: 'string', minLength: 1, maxLength: 120 },
          meal_def_ids: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'string',
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$',
            },
          },
          workout_def_id: {
            type: ['string', 'null'],
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$',
          },
          target_mode: {
            type: 'string',
            enum: ['balanced', 'training_day', 'rest_day', 'recovery_day'],
          },
          target_rationale: { type: 'string', minLength: 1, maxLength: 300 },
          serving_overrides: {
            type: 'array',
            maxItems: 6,
            items: {
              type: 'object',
              properties: { meal_def_id: { type: 'string' }, multiplier: { type: 'number', minimum: 0.25, maximum: 4 } },
              required: ['meal_def_id', 'multiplier'],
              additionalProperties: false,
            },
          },
          progression_note: { type: ['string', 'null'], maxLength: 240 },
          notes: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string', minLength: 1, maxLength: 300 },
          },
        },
        required: [
          'day_index',
          'title',
          'meal_def_ids',
          'workout_def_id',
          'target_mode',
          'target_rationale',
          'serving_overrides',
          'progression_note',
          'notes',
        ],
        additionalProperties: false,
      },
    },
    emergency_food_ids: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'string',
        pattern: '^food:[a-z0-9._-]+@v[1-9][0-9]*$',
      },
    },
    restaurant_guide: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 160 },
          estimated_nutrition: nutritionSchema,
          order_instructions: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: { type: 'string', minLength: 1, maxLength: 300 },
          },
        },
        required: ['title', 'order_instructions', 'estimated_nutrition'],
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
    'schema_version',
    'default_targets',
    'meal_definitions',
    'workout_definitions',
    'days',
    'emergency_food_ids',
    'restaurant_guide',
    'health_safety_notes',
  ],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) {
    throw new HttpError(422, 'COMPACT_PLAN_INVALID', `Missing compact field: ${field}`)
  }
  return value
}

/**
 * Deterministic expansion: compact provider response → full stored plan.
 * Rejects missing/duplicate days, unknown refs, cyclic defs, invalid portions.
 */
export function expandCompactPlan(
  compact: Record<string, unknown>,
  catalog: PlanCatalogSnapshot,
  locale: 'fa-IR' | 'en-US',
): Record<string, unknown> {
  if (compact.schema_version !== COMPACT_SCHEMA_VERSION) {
    throw new HttpError(
      422,
      'COMPACT_SCHEMA_VERSION_MISMATCH',
      'Compact plan schema version is unsupported.',
    )
  }

  const mealDefs = Array.isArray(compact.meal_definitions) ? compact.meal_definitions : []
  const workoutDefs = Array.isArray(compact.workout_definitions)
    ? compact.workout_definitions
    : []
  const days = Array.isArray(compact.days) ? compact.days : []

  if (days.length !== MONTHLY_PLAN_DAYS) {
    throw new HttpError(422, 'COMPACT_DAY_COVERAGE', 'Compact plan must include exactly 30 days.')
  }

  const mealById = new Map<string, Record<string, unknown>>()
  for (const item of mealDefs) {
    if (!isRecord(item)) {
      throw new HttpError(422, 'COMPACT_PLAN_INVALID', 'Invalid meal definition.')
    }
    const id = requireString(item.meal_def_id, 'meal_def_id')
    if (mealById.has(id)) {
      throw new HttpError(422, 'COMPACT_DUPLICATE_REF', `Duplicate meal definition: ${id}`)
    }
    mealById.set(id, item)
  }

  const workoutById = new Map<string, Record<string, unknown>>()
  for (const item of workoutDefs) {
    if (!isRecord(item)) {
      throw new HttpError(422, 'COMPACT_PLAN_INVALID', 'Invalid workout definition.')
    }
    const id = requireString(item.workout_def_id, 'workout_def_id')
    if (workoutById.has(id)) {
      throw new HttpError(422, 'COMPACT_DUPLICATE_REF', `Duplicate workout definition: ${id}`)
    }
    workoutById.set(id, item)
  }

  const seenDays = new Set<number>()
  const expandedDays: Record<string, unknown>[] = []
  const groceryFoodRefs: Array<{ foodId: string; multiplier: number }> = []

  for (const day of days) {
    if (!isRecord(day)) {
      throw new HttpError(422, 'COMPACT_PLAN_INVALID', 'Invalid day entry.')
    }
    const dayIndex = Number(day.day_index)
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= MONTHLY_PLAN_DAYS) {
      throw new HttpError(422, 'COMPACT_DAY_COVERAGE', 'Invalid day_index.')
    }
    if (seenDays.has(dayIndex)) {
      throw new HttpError(422, 'COMPACT_DAY_COVERAGE', `Duplicate day_index: ${dayIndex}`)
    }
    seenDays.add(dayIndex)

    const mealDefIds = Array.isArray(day.meal_def_ids) ? day.meal_def_ids : []
    if (!Array.isArray(day.serving_overrides)) throw new HttpError(422, 'COMPACT_INVALID_PORTION', 'Overrides must be an array.')
    const overrides = new Map<string, number>()
    for (const override of day.serving_overrides) {
      if (!isRecord(override) || typeof override.meal_def_id !== 'string' ||
          !mealDefIds.includes(override.meal_def_id) || overrides.has(override.meal_def_id) ||
          typeof override.multiplier !== 'number') {
        throw new HttpError(422, 'COMPACT_INVALID_PORTION', 'Invalid or duplicated serving override.')
      }
      overrides.set(override.meal_def_id, override.multiplier)
    }
    const meals: Record<string, unknown>[] = []

    for (const [slotIndex, mealDefIdRaw] of mealDefIds.entries()) {
      const mealDefId = requireString(mealDefIdRaw, 'meal_def_id')
      const def = mealById.get(mealDefId)
      if (!def) {
        throw new HttpError(422, 'COMPACT_UNKNOWN_REF', `Unknown meal definition: ${mealDefId}`)
      }
      const foodId = requireString(def.food_id, 'food_id')
      if (!catalog.foods.has(foodId)) {
        throw new HttpError(422, 'unknown_catalog_id', `Unknown food: ${foodId}`)
      }
      const baseMultiplier = Number(def.serving_multiplier ?? 1)
      const override = overrides.get(mealDefId)
      const multiplier = typeof override === 'number' ? override : baseMultiplier
      if (!Number.isFinite(multiplier) || multiplier < 0.25 || multiplier > 4) {
        throw new HttpError(422, 'COMPACT_INVALID_PORTION', 'Invalid serving multiplier.')
      }

      const primary = assembleMealOption({
        catalog,
        foodId,
        optionKey: `${mealDefId}-primary`,
        locale,
        servingMultiplier: multiplier,
        note: typeof def.note === 'string' ? def.note : null,
      })
      const altIds = Array.isArray(def.alt_food_ids) ? def.alt_food_ids : []
      const options = [primary]
      for (const [altIndex, altIdRaw] of altIds.entries()) {
        const altId = requireString(altIdRaw, 'alt_food_id')
        if (!catalog.foods.has(altId)) {
          throw new HttpError(422, 'unknown_catalog_id', `Unknown food: ${altId}`)
        }
        options.push(assembleMealOption({
          catalog,
          foodId: altId,
          optionKey: `${mealDefId}-alt-${altIndex}`,
          locale,
          servingMultiplier: multiplier,
          note: null,
        }))
      }

      groceryFoodRefs.push({ foodId, multiplier })
      meals.push({
        slot_key: `slot-${dayIndex}-${slotIndex}`,
        type: def.type,
        title: def.title,
        scheduled_time: def.scheduled_time ?? null,
        default_option_key: String(primary.option_key),
        options,
      })
    }

    let workout: Record<string, unknown> | null = null
    let trainingType = 'rest'
    if (day.workout_def_id !== null && day.workout_def_id !== undefined) {
      const workoutDefId = requireString(day.workout_def_id, 'workout_def_id')
      const def = workoutById.get(workoutDefId)
      if (!def) {
        throw new HttpError(
          422,
          'COMPACT_UNKNOWN_REF',
          `Unknown workout definition: ${workoutDefId}`,
        )
      }
      trainingType = String(def.training_type)
      if (trainingType !== 'rest') {
        const exerciseRows = Array.isArray(def.exercises) ? def.exercises : []
        const exercises = exerciseRows.map((row, index) => {
          if (!isRecord(row)) {
            throw new HttpError(422, 'COMPACT_PLAN_INVALID', 'Invalid exercise row.')
          }
          const exerciseId = requireString(row.exercise_id, 'exercise_id')
          if (!catalog.exercises.has(exerciseId)) {
            throw new HttpError(422, 'unknown_catalog_id', `Unknown exercise: ${exerciseId}`)
          }
          return assembleExercise({
            catalog,
            exerciseId,
            exerciseKey: `${workoutDefId}-${index}`,
            locale,
            sets: Number(row.sets),
            reps: String(row.reps),
            restSeconds: Number(row.rest_seconds),
            intensityNote: typeof row.intensity_note === 'string' ? row.intensity_note : null,
            substitutionExerciseId: typeof row.substitution_exercise_id === 'string'
              ? row.substitution_exercise_id
              : null,
          })
        })
        workout = {
          title: def.title,
          duration_minutes: Number(def.duration_minutes),
          intensity: def.intensity,
          warmup: locale === 'fa-IR'
            ? ['۵ دقیقه گرم‌کردن سبک']
            : ['5 minutes light warm-up'],
          exercises,
          cooldown: locale === 'fa-IR'
            ? ['۳ دقیقه سردکردن']
            : ['3 minutes cool-down'],
          safety_note: def.safety_note ?? null,
        }
      }
    }

    const dayNotes = Array.isArray(day.notes)
      ? day.notes.filter((item): item is string => typeof item === 'string')
      : []
    if (typeof day.progression_note === 'string' && day.progression_note) {
      dayNotes.push(day.progression_note)
    }

    const targets = isRecord(compact.default_targets)
      ? { ...compact.default_targets }
      : {
        calories: 2_000,
        protein_g: 100,
        carbs_g: 200,
        fat_g: 70,
        fiber_g: 25,
        water_ml: 2_500,
      }

    expandedDays.push({
      day_index: dayIndex,
      title: day.title,
      training_type: trainingType,
      target_strategy: {
        mode: day.target_mode,
        rationale: day.target_rationale,
      },
      targets,
      workout,
      meals,
      notes: dayNotes.slice(0, 8),
    })
  }

  if (seenDays.size !== MONTHLY_PLAN_DAYS) {
    throw new HttpError(422, 'COMPACT_DAY_COVERAGE', 'Compact plan is missing one or more days.')
  }
  expandedDays.sort((a, b) => Number(a.day_index) - Number(b.day_index))

  const emergencyIds = Array.isArray(compact.emergency_food_ids)
    ? compact.emergency_food_ids
    : []
  const emergency_options = emergencyIds.map((foodIdRaw, index) => {
    const foodId = requireString(foodIdRaw, 'emergency_food_id')
    if (!catalog.foods.has(foodId)) {
      throw new HttpError(422, 'unknown_catalog_id', `Unknown food: ${foodId}`)
    }
    return assembleMealOption({
      catalog,
      foodId,
      optionKey: `emergency-${index}`,
      locale,
      servingMultiplier: 1,
      note: null,
    })
  })

  const restaurantGuide = (Array.isArray(compact.restaurant_guide)
    ? compact.restaurant_guide
    : []).map((item) => {
    if (!isRecord(item)) {
      throw new HttpError(422, 'COMPACT_PLAN_INVALID', 'Invalid restaurant guide item.')
    }
    return {
      title: item.title,
      order_instructions: item.order_instructions,
      estimated_nutrition: item.estimated_nutrition,
    }
  })

  return {
    content_locale: locale,
    plan_name: compact.plan_name,
    summary: compact.summary,
    default_targets: compact.default_targets,
    days: expandedDays,
    emergency_options,
    restaurant_guide: restaurantGuide,
    grocery_list: aggregateGroceryList(catalog, groceryFoodRefs, locale),
    health_safety_notes: Array.isArray(compact.health_safety_notes)
      ? compact.health_safety_notes
      : [],
    _expansion: {
      version: COMPACT_EXPANSION_VERSION,
      compact_schema_version: COMPACT_SCHEMA_VERSION,
      source: 'compact_provider',
    },
  }
}

export function isCompactPlan(value: unknown): boolean {
  return isRecord(value) && value.schema_version === COMPACT_SCHEMA_VERSION
}

export function stripExpansionMetadata(
  plan: Record<string, unknown>,
): Record<string, unknown> {
  const copy = { ...plan }
  delete copy._expansion
  return copy
}

export { assembleNutritionFromFoods }
