import { HttpError } from './http.ts'
import { assembleMealOption, assembleNutritionFromFoods } from './plan-assembly.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'
import { assertGeneratedPlan } from './plan-contract.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import { classifyValidationFailure, type ValidationFailureCategory } from './usage-accounting.ts'

export type RepairKind =
  | 'recalculate_nutrition'
  | 'replace_invalid_meal'
  | 'replace_invalid_workout'
  | 'persist_saved_response'
  | 'bounded_full_retry'
  | 'escalate_review'
  | 'none'

export interface RepairDecision {
  kind: RepairKind
  category: ValidationFailureCategory
  reason: string
  /** When true, a new provider call may be used within attempt budget. */
  allowsProviderRetry: boolean
}

export function classifyRepair(input: {
  errorCode: string
  hasSavedValidResponse: boolean
  attemptCount: number
  maxAttempts: number
}): RepairDecision {
  const category = classifyValidationFailure(input.errorCode)

  if (input.errorCode === 'PLAN_IMPORT_FAILED' && input.hasSavedValidResponse) {
    return {
      kind: 'persist_saved_response',
      category,
      reason: 'Database failure after a valid provider response; retry persistence only.',
      allowsProviderRetry: false,
    }
  }

  if (category === 'nutrition_arithmetic') {
    return {
      kind: 'recalculate_nutrition',
      category,
      reason: 'Recalculate nutrition from authoritative catalog values.',
      allowsProviderRetry: false,
    }
  }

  if (category === 'catalog_reference' || category === 'allergen') {
    return {
      kind: 'replace_invalid_meal',
      category,
      reason: 'Replace the smallest invalid meal component from the allowlist.',
      allowsProviderRetry: false,
    }
  }

  if (category === 'equipment') {
    return {
      kind: 'replace_invalid_workout',
      category,
      reason: 'Replace incompatible exercises from the allowlist.',
      allowsProviderRetry: false,
    }
  }

  if (input.attemptCount < input.maxAttempts) {
    return {
      kind: 'bounded_full_retry',
      category,
      reason: 'Broad failure; bounded full retry within cycle attempt budget.',
      allowsProviderRetry: true,
    }
  }

  return {
    kind: 'escalate_review',
    category,
    reason: 'Exhausted repair budget; escalate without unlimited regeneration.',
    allowsProviderRetry: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Deterministic repairs only when the correction is unambiguous.
 * Always revalidate the complete expanded plan afterward.
 */
export function applyDeterministicRepair(input: {
  plan: Record<string, unknown>
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  declaredAllergenIds: ReadonlySet<string>
  decision: RepairDecision
  minimumCalories?: number
}): Record<string, unknown> {
  const { decision } = input
  if (decision.kind === 'none' || decision.kind === 'bounded_full_retry' ||
    decision.kind === 'escalate_review' || decision.kind === 'persist_saved_response') {
    return input.plan
  }

  const plan = structuredClone(input.plan)
  const days = Array.isArray(plan.days) ? plan.days : []

  if (decision.kind === 'recalculate_nutrition') {
    for (const day of days) {
      if (!isRecord(day) || !Array.isArray(day.meals)) continue
      for (const meal of day.meals) {
        if (!isRecord(meal) || !Array.isArray(meal.options)) continue
        for (const option of meal.options) {
          if (!isRecord(option) || typeof option.food_id !== 'string') continue
          const food = input.catalog.foods.get(option.food_id)
          if (!food) continue
          option.nutrition = assembleNutritionFromFoods(input.catalog, [{
            foodId: food.id,
            multiplier: Number(option.serving_multiplier ?? 1),
          }])
          option.title = input.locale === 'fa-IR' ? food.name_fa : food.name_en
        }
      }
    }
  }

  if (decision.kind === 'replace_invalid_meal') {
    const fallbackFood = [...input.catalog.foods.values()].find((food) => {
      for (const ingredientId of food.ingredientIds) {
        const ingredient = input.catalog.ingredients.get(ingredientId)
        if (!ingredient) continue
        for (const allergenId of ingredient.allergenIds) {
          if (input.declaredAllergenIds.has(allergenId)) return false
        }
      }
      return true
    })
    if (!fallbackFood) {
      throw new HttpError(
        422,
        'PLAN_REPAIR_FAILED',
        'No safe fallback meal is available for repair.',
      )
    }
    for (const day of days) {
      if (!isRecord(day) || !Array.isArray(day.meals)) continue
      for (const meal of day.meals) {
        if (!isRecord(meal) || !Array.isArray(meal.options)) continue
        meal.options = meal.options.map((option, index) => {
          if (!isRecord(option) || typeof option.food_id !== 'string') {
            return assembleMealOption({
              catalog: input.catalog,
              foodId: fallbackFood.id,
              optionKey: `repair-${index}`,
              locale: input.locale,
              servingMultiplier: 1,
              note: 'deterministic_repair',
            })
          }
          if (!input.catalog.foods.has(option.food_id)) {
            return assembleMealOption({
              catalog: input.catalog,
              foodId: fallbackFood.id,
              optionKey: String(option.option_key ?? `repair-${index}`),
              locale: input.locale,
              servingMultiplier: 1,
              note: 'deterministic_repair',
            })
          }
          return option
        })
      }
    }
  }

  if (decision.kind === 'replace_invalid_workout') {
    const fallback = [...input.catalog.exercises.values()][0]
    for (const day of days) {
      if (!isRecord(day) || !isRecord(day.workout) || !Array.isArray(day.workout.exercises)) {
        continue
      }
      day.workout.exercises = day.workout.exercises.map((exercise, index) => {
        if (!isRecord(exercise)) return exercise
        const id = String(exercise.exercise_id ?? '')
        if (input.catalog.exercises.has(id) || !fallback) return exercise
        return {
          ...exercise,
          exercise_id: fallback.id,
          name: input.locale === 'fa-IR' ? fallback.name_fa : fallback.name_en,
          equipment: [...fallback.equipmentIds],
          equipment_ids: [...fallback.equipmentIds],
          exercise_key: `repair-ex-${index}`,
        }
      })
    }
  }

  assertGeneratedPlan(plan, MONTHLY_PLAN_DAYS, input.locale, {
    catalog: input.catalog,
    declaredAllergenIds: input.declaredAllergenIds,
    minimumCalories: input.minimumCalories ?? 1_200,
  })
  return plan
}

export { assembleNutritionFromFoods }
