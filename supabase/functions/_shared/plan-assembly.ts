import { HttpError } from './http.ts'
import type { PlanCatalogSnapshot } from './plan-catalog.ts'

export function assembleMealOption(input: {
  catalog: PlanCatalogSnapshot
  foodId: string
  optionKey: string
  locale: 'fa-IR' | 'en-US'
  servingMultiplier: number
  note: string | null
}): Record<string, unknown> {
  const food = input.catalog.foods.get(input.foodId)
  if (!food) {
    throw new HttpError(422, 'unknown_catalog_id', `Unknown food: ${input.foodId}`)
  }
  const ingredients = [...food.ingredientIds].map((ingredientId) => {
    const ingredient = input.catalog.ingredients.get(ingredientId)
    if (!ingredient) {
      throw new HttpError(
        422,
        'unknown_catalog_id',
        `Unknown ingredient: ${ingredientId}`,
      )
    }
    return {
      ingredient_id: ingredient.id,
      name: input.locale === 'fa-IR' ? ingredient.name_fa : ingredient.name_en,
      amount: Math.round(1 * input.servingMultiplier * 100) / 100,
      unit: ingredient.default_unit,
      note: input.note,
    }
  })
  if (ingredients.length === 0) {
    throw new HttpError(
      422,
      'catalog_food_incomplete',
      `Food ${input.foodId} is missing governed ingredients; catalog review required.`,
    )
  }

  return {
    food_id: food.id,
    option_key: input.optionKey,
    title: input.locale === 'fa-IR' ? food.name_fa : food.name_en,
    ingredients,
    // Public plan contract requires option nutrition to match catalog food exactly.
    // Portion changes are expressed via ingredient amounts and day targets/overrides.
    nutrition: {
      ...food.nutrition,
      confidence: 'high' as const,
      source: 'catalog_reference' as const,
    },
    recipe: null,
    warnings: input.servingMultiplier !== 1
      ? [`serving_multiplier:${input.servingMultiplier}`]
      : [],
    portable: food.portable,
  }
}

export function assembleExercise(input: {
  catalog: PlanCatalogSnapshot
  exerciseId: string
  exerciseKey: string
  locale: 'fa-IR' | 'en-US'
  sets: number
  reps: string
  restSeconds: number
  intensityNote: string | null
  substitutionExerciseId: string | null
}): Record<string, unknown> {
  const item = input.catalog.exercises.get(input.exerciseId)
  if (!item) {
    throw new HttpError(422, 'unknown_catalog_id', `Unknown exercise: ${input.exerciseId}`)
  }
  let substitutionId = input.substitutionExerciseId
  if (substitutionId && !input.catalog.exercises.has(substitutionId)) {
    throw new HttpError(
      422,
      'invalid_exercise_substitution',
      `Unknown substitution: ${substitutionId}`,
    )
  }
  if (!substitutionId) {
    substitutionId = [...item.substitutionIds][0] ?? null
  }
  const substitution = substitutionId ? input.catalog.exercises.get(substitutionId) : undefined
  return {
    exercise_id: item.id,
    exercise_key: input.exerciseKey,
    name: input.locale === 'fa-IR' ? item.name_fa : item.name_en,
    sets: input.sets,
    reps: input.reps,
    rest_seconds: input.restSeconds,
    equipment: [...item.equipmentIds],
    equipment_ids: [...item.equipmentIds],
    intensity_note: input.intensityNote,
    substitution: substitution
      ? (input.locale === 'fa-IR' ? substitution.name_fa : substitution.name_en)
      : null,
    substitution_exercise_id: substitutionId,
  }
}

export function assembleNutritionFromFoods(
  catalog: PlanCatalogSnapshot,
  refs: Array<{ foodId: string; multiplier: number }>,
) {
  const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  for (const ref of refs) {
    const food = catalog.foods.get(ref.foodId)
    if (!food) continue
    totals.calories += food.nutrition.calories * ref.multiplier
    totals.protein_g += food.nutrition.protein_g * ref.multiplier
    totals.carbs_g += food.nutrition.carbs_g * ref.multiplier
    totals.fat_g += food.nutrition.fat_g * ref.multiplier
    totals.fiber_g += food.nutrition.fiber_g * ref.multiplier
  }
  return {
    calories: Math.round(totals.calories),
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
    fiber_g: Math.round(totals.fiber_g * 10) / 10,
    confidence: 'high' as const,
    source: 'catalog_reference' as const,
  }
}

export function aggregateGroceryList(
  catalog: PlanCatalogSnapshot,
  refs: Array<{ foodId: string; multiplier: number }>,
  locale: 'fa-IR' | 'en-US',
): Array<Record<string, unknown>> {
  const amounts = new Map<string, { amount: number; unit: string; name: string }>()
  for (const ref of refs) {
    const food = catalog.foods.get(ref.foodId)
    if (!food) continue
    for (const ingredientId of food.ingredientIds) {
      const ingredient = catalog.ingredients.get(ingredientId)
      if (!ingredient) continue
      const existing = amounts.get(ingredientId)
      const add = ref.multiplier
      if (existing) {
        existing.amount += add
      } else {
        amounts.set(ingredientId, {
          amount: add,
          unit: ingredient.default_unit,
          name: locale === 'fa-IR' ? ingredient.name_fa : ingredient.name_en,
        })
      }
    }
  }
  const items = [...amounts.entries()].map(([ingredient_id, value]) => ({
    ingredient_id,
    name: value.name,
    amount: Math.round(value.amount * 100) / 100,
    unit: value.unit,
    note: null,
  }))
  if (items.length === 0) {
    throw new HttpError(
      422,
      'catalog_food_incomplete',
      'Grocery aggregation found no governed ingredients; catalog review required.',
    )
  }
  return [{
    category: locale === 'fa-IR' ? 'مواد اولیه' : 'Ingredients',
    items: items.slice(0, 40),
  }]
}
