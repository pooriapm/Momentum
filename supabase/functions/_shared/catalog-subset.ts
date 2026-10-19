import {
  availableEquipmentSlugs,
  exerciseFitsEquipment,
  exercisePromptRows,
} from './exercise-selection.ts'
import { HttpError } from './http.ts'
import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import type { CatalogExercise, CatalogFood, PlanCatalogSnapshot } from './plan-catalog.ts'

export const CATALOG_SUBSET_VERSION = 'momentum-catalog-subset/1.1.0'

export interface CatalogSubsetResult {
  subset_version: typeof CATALOG_SUBSET_VERSION
  catalog: PlanCatalogSnapshot
  food_ids: string[]
  exercise_ids: string[]
  expanded: boolean
  expansion_reason: string | null
}

const MIN_FOODS_PER_MEAL_TYPE = 2
const MIN_EXERCISES = 6
const TARGET_FOODS = 28

const MEAL_TYPES = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'pre_sleep',
] as const

function foodHasAllergen(
  catalog: PlanCatalogSnapshot,
  food: CatalogFood,
  declaredAllergenIds: ReadonlySet<string>,
): boolean {
  if (declaredAllergenIds.size === 0) return false
  for (const ingredientId of food.ingredientIds) {
    const ingredient = catalog.ingredients.get(ingredientId)
    if (!ingredient) continue
    for (const allergenId of ingredient.allergenIds) {
      if (declaredAllergenIds.has(allergenId)) return true
    }
  }
  return false
}

function scoreFood(
  food: CatalogFood,
  snapshot: GenerationProfileSnapshot,
): number {
  let score = 0
  const favorites = new Set(
    snapshot.dietary.favorite_foods.map((item) => item.toLowerCase()),
  )
  const disliked = new Set(
    snapshot.dietary.disliked_foods.map((item) => item.toLowerCase()),
  )
  const name = `${food.name_en} ${food.name_fa}`.toLowerCase()
  for (const fav of favorites) {
    if (fav && name.includes(fav.toLowerCase())) score += 5
  }
  for (const bad of disliked) {
    if (bad && name.includes(bad.toLowerCase())) score -= 8
  }
  if (snapshot.dietary.budget_tier === 'low' && food.portable) score += 1
  if (snapshot.dietary.cuisine_region) {
    const region = snapshot.dietary.cuisine_region.toLowerCase()
    if (name.includes(region) || food.id.includes(region)) score += 3
  }
  score += food.meal_types.length
  return score
}

function cloneSubset(
  full: PlanCatalogSnapshot,
  foodIds: Set<string>,
  exerciseIds: Set<string>,
): PlanCatalogSnapshot {
  const foods = new Map<string, CatalogFood>()
  const exercises = new Map<string, CatalogExercise>()
  const ingredientIds = new Set<string>()
  const equipmentIds = new Set<string>()

  for (const id of foodIds) {
    const food = full.foods.get(id)
    if (!food) continue
    foods.set(id, food)
    for (const ingredientId of food.ingredientIds) ingredientIds.add(ingredientId)
  }
  for (const id of exerciseIds) {
    const exercise = full.exercises.get(id)
    if (!exercise) continue
    exercises.set(id, {
      ...exercise,
      substitutionIds: new Set(
        [...exercise.substitutionIds].filter((sub) => exerciseIds.has(sub)),
      ),
    })
    for (const equipmentId of exercise.equipmentIds) equipmentIds.add(equipmentId)
  }

  const ingredients = new Map(
    [...full.ingredients.entries()].filter(([id]) => ingredientIds.has(id)),
  )

  return {
    releaseId: full.releaseId,
    releaseVersion: full.releaseVersion,
    allergens: full.allergens,
    ingredients,
    foods,
    exercises,
    equipmentIds,
  }
}

function mealTypeCoverage(
  foods: CatalogFood[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const meal of MEAL_TYPES) counts[meal] = 0
  for (const food of foods) {
    for (const meal of food.meal_types) {
      counts[meal] = (counts[meal] ?? 0) + 1
    }
  }
  return counts
}

/**
 * Hard exclusions first, then scored variety. Never silently relaxes allergen or
 * equipment hard constraints. Expands toward full allowlist through defined rules
 * when the subset cannot cover meal types / exercise minimums.
 */
export function selectCatalogSubset(input: {
  catalog: PlanCatalogSnapshot
  snapshot: GenerationProfileSnapshot
  declaredAllergenIds: ReadonlySet<string>
}): CatalogSubsetResult {
  const { catalog, snapshot, declaredAllergenIds } = input
  // Training location + free-text equipment (Persian or English) -> catalog equipment slugs.
  const availableEquipment = availableEquipmentSlugs(catalog, snapshot)

  const safeFoods = [...catalog.foods.values()].filter(
    (food) => !foodHasAllergen(catalog, food, declaredAllergenIds),
  )
  if (safeFoods.length === 0) {
    throw new HttpError(
      422,
      'CATALOG_SUBSET_EMPTY',
      'No foods remain after hard allergen exclusions.',
    )
  }

  const safeExercises = [...catalog.exercises.values()].filter((exercise) =>
    exerciseFitsEquipment(exercise, availableEquipment)
  )
  if (safeExercises.length === 0) {
    throw new HttpError(
      422,
      'CATALOG_SUBSET_EMPTY',
      'No exercises remain after equipment hard exclusions.',
    )
  }

  const rankedFoods = [...safeFoods].sort(
    (a, b) => scoreFood(b, snapshot) - scoreFood(a, snapshot),
  )
  const selectedFoods: CatalogFood[] = []
  const selectedFoodIds = new Set<string>()

  // Ensure meal-type coverage first.
  for (const meal of MEAL_TYPES) {
    const candidates = rankedFoods.filter((food) =>
      food.meal_types.includes(meal) && !selectedFoodIds.has(food.id)
    )
    for (const food of candidates.slice(0, MIN_FOODS_PER_MEAL_TYPE)) {
      selectedFoods.push(food)
      selectedFoodIds.add(food.id)
    }
  }
  for (const food of rankedFoods) {
    if (selectedFoodIds.size >= TARGET_FOODS) break
    if (selectedFoodIds.has(food.id)) continue
    selectedFoods.push(food)
    selectedFoodIds.add(food.id)
  }

  // Every exercise the user can do goes to the model as one compact row; variety is its job.
  const selectedExerciseIds = new Set(safeExercises.map((item) => item.id))

  let expanded = false
  let expansionReason: string | null = null
  const coverage = mealTypeCoverage(selectedFoods)
  const weakMeal = MEAL_TYPES.find((meal) => (coverage[meal] ?? 0) < 1)
  if (weakMeal || selectedExerciseIds.size < MIN_EXERCISES) {
    // Expand within hard-safe allowlist only.
    for (const food of safeFoods) {
      if (selectedFoodIds.size >= Math.min(safeFoods.length, TARGET_FOODS * 2)) break
      selectedFoodIds.add(food.id)
    }
    for (const exercise of safeExercises) {
      selectedExerciseIds.add(exercise.id)
    }
    expanded = true
    expansionReason = weakMeal
      ? `Expanded subset to cover meal type ${weakMeal}.`
      : 'Expanded subset to meet minimum exercise variety.'
  }

  const finalCoverage = mealTypeCoverage(
    [...selectedFoodIds].map((id) => catalog.foods.get(id)!).filter(Boolean),
  )
  const stillWeak = MEAL_TYPES.find((meal) =>
    ['breakfast', 'lunch', 'dinner'].includes(meal) && (finalCoverage[meal] ?? 0) < 1
  )
  if (stillWeak || selectedExerciseIds.size < 1) {
    throw new HttpError(
      422,
      'CATALOG_SUBSET_INSUFFICIENT',
      'Catalog subset cannot support a valid monthly plan under hard constraints.',
    )
  }

  const subset = cloneSubset(catalog, selectedFoodIds, selectedExerciseIds)
  return {
    subset_version: CATALOG_SUBSET_VERSION,
    catalog: subset,
    food_ids: [...selectedFoodIds],
    exercise_ids: [...selectedExerciseIds],
    expanded,
    expansion_reason: expansionReason,
  }
}

export function catalogSubsetPromptContext(
  subset: CatalogSubsetResult,
  full: PlanCatalogSnapshot,
): Record<string, unknown> {
  // Prompt gets the subset; validators still use the full allowlist when needed.
  void full
  return {
    subset_version: subset.subset_version,
    release_id: subset.catalog.releaseId,
    release_version: subset.catalog.releaseVersion,
    food_ids: subset.food_ids,
    foods: [...subset.catalog.foods.values()].map((food) => ({
      id: food.id,
      name_en: food.name_en,
      name_fa: food.name_fa,
      meal_types: food.meal_types,
      portable: food.portable,
      nutrition: food.nutrition,
      ingredient_ids: [...food.ingredientIds],
    })),
    ingredients: [...subset.catalog.ingredients.values()].map((ingredient) => ({
      id: ingredient.id,
      name_en: ingredient.name_en,
      name_fa: ingredient.name_fa,
      default_unit: ingredient.default_unit,
      allergen_ids: [...ingredient.allergenIds],
    })),
    // Use these ids as exercise_id / substitution_exercise_id. Names come from the catalog.
    exercise_columns: ['id', 'movement', 'equipment', 'substitutes'],
    exercises: exercisePromptRows(subset.catalog.exercises.values()),
    equipment_ids: [...subset.catalog.equipmentIds],
  }
}
