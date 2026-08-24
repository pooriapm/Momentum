import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.ts'

export interface CatalogNutrition {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface CatalogIngredient {
  id: string
  name_en: string
  name_fa: string
  default_unit: string
  allergenIds: ReadonlySet<string>
}

export const CATALOG_UNITS = [
  'g',
  'ml',
  'piece',
  'tbsp',
  'tsp',
  'cup',
  'slice',
  'serving',
] as const

export type CatalogUnit = typeof CATALOG_UNITS[number]

export interface CatalogFood {
  id: string
  name_en: string
  name_fa: string
  meal_types: readonly string[]
  portable: boolean
  nutrition: CatalogNutrition
  ingredientIds: ReadonlySet<string>
}

export interface CatalogExercise {
  id: string
  name_en: string
  name_fa: string
  equipmentIds: ReadonlySet<string>
  substitutionIds: ReadonlySet<string>
}

export interface PlanCatalogSnapshot {
  releaseId: string
  releaseVersion: number
  allergens: ReadonlyMap<string, { terms: ReadonlySet<string> }>
  ingredients: ReadonlyMap<string, CatalogIngredient>
  foods: ReadonlyMap<string, CatalogFood>
  equipmentIds: ReadonlySet<string>
  exercises: ReadonlyMap<string, CatalogExercise>
}

export interface PlanCatalogRows {
  releases: readonly Record<string, unknown>[]
  allergens: readonly Record<string, unknown>[]
  ingredients: readonly Record<string, unknown>[]
  ingredientAllergens: readonly Record<string, unknown>[]
  foods: readonly Record<string, unknown>[]
  foodIngredients: readonly Record<string, unknown>[]
  equipment: readonly Record<string, unknown>[]
  exercises: readonly Record<string, unknown>[]
  exerciseEquipment: readonly Record<string, unknown>[]
  substitutions: readonly Record<string, unknown>[]
}

const MAX_CATALOG_ROWS = 5_000
const CATALOG_UNIT_SET = new Set<string>(CATALOG_UNITS)
const MEAL_TYPE_SET = new Set([
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'pre_sleep',
])

type CatalogKind = 'allergen' | 'ingredient' | 'food' | 'equipment' | 'exercise'

function configurationError(): never {
  throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
}

function releaseVersion(releaseId: string): number {
  const match = /@v([1-9][0-9]*)$/.exec(releaseId)
  if (!match) configurationError()
  return Number(match[1])
}

function assertCatalogId(id: string, kind: CatalogKind, version: number): void {
  const match = new RegExp(`^${kind}:[a-z0-9._-]+@v([1-9][0-9]*)$`).exec(id)
  if (!match || Number(match[1]) !== version) configurationError()
}

function addUniqueId(ids: Set<string>, id: string): void {
  if (ids.has(id)) configurationError()
  ids.add(id)
}

function requiredPositiveNumber(row: Record<string, unknown>, key: string): number {
  const value = requiredNumber(row, key)
  if (value <= 0) configurationError()
  return value
}

function normalizedTerm(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^‌\p{L}\p{N}]+/gu, ' ').trim()
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== 'string' || !value) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
  }
  return value
}

function requiredNumber(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key])
  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
  }
  return value
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > MAX_CATALOG_ROWS) {
    throw new HttpError(503, 'catalog_unavailable', 'Plan catalog is unavailable.')
  }
  if (value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
  }
  return value as Record<string, unknown>[]
}

export function createPlanCatalogSnapshot(rows: PlanCatalogRows): PlanCatalogSnapshot {
  if (rows.releases.length !== 1) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'One active catalog is required.')
  }
  const releaseId = requiredString(rows.releases[0] ?? {}, 'id')
  const activeReleaseVersion = releaseVersion(releaseId)

  const allergens = new Map<string, { terms: ReadonlySet<string> }>()
  for (const row of rows.allergens) {
    const id = requiredString(row, 'id')
    assertCatalogId(id, 'allergen', activeReleaseVersion)
    if (
      allergens.has(id) || !Array.isArray(row.aliases) ||
      row.aliases.some((item) => typeof item !== 'string')
    ) {
      configurationError()
    }
    const aliases = row.aliases as string[]
    const terms = new Set(
      [
        requiredString(row, 'slug'),
        requiredString(row, 'name_en'),
        requiredString(row, 'name_fa'),
        ...aliases,
      ].map(normalizedTerm).filter(Boolean),
    )
    allergens.set(id, { terms })
  }

  const allergenIdsByIngredient = new Map<string, Set<string>>()
  for (const row of rows.ingredientAllergens) {
    const ingredientId = requiredString(row, 'ingredient_id')
    const allergenId = requiredString(row, 'allergen_id')
    if (!allergens.has(allergenId)) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
    const values = allergenIdsByIngredient.get(ingredientId) ?? new Set<string>()
    if (values.has(allergenId)) configurationError()
    values.add(allergenId)
    allergenIdsByIngredient.set(ingredientId, values)
  }

  const ingredients = new Map<string, CatalogIngredient>()
  for (const row of rows.ingredients) {
    const id = requiredString(row, 'id')
    const defaultUnit = requiredString(row, 'default_unit')
    assertCatalogId(id, 'ingredient', activeReleaseVersion)
    if (ingredients.has(id) || !CATALOG_UNIT_SET.has(defaultUnit)) configurationError()
    ingredients.set(id, {
      id,
      name_en: requiredString(row, 'name_en'),
      name_fa: requiredString(row, 'name_fa'),
      default_unit: defaultUnit,
      allergenIds: allergenIdsByIngredient.get(id) ?? new Set(),
    })
  }
  for (const ingredientId of allergenIdsByIngredient.keys()) {
    if (!ingredients.has(ingredientId)) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
  }

  const ingredientIdsByFood = new Map<string, Set<string>>()
  for (const row of rows.foodIngredients) {
    const foodId = requiredString(row, 'food_id')
    const ingredientId = requiredString(row, 'ingredient_id')
    if (!ingredients.has(ingredientId)) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
    const ingredient = ingredients.get(ingredientId)
    const unit = requiredString(row, 'unit')
    requiredPositiveNumber(row, 'amount')
    if (!ingredient || unit !== ingredient.default_unit) configurationError()
    const values = ingredientIdsByFood.get(foodId) ?? new Set<string>()
    if (values.has(ingredientId)) configurationError()
    values.add(ingredientId)
    ingredientIdsByFood.set(foodId, values)
  }

  const foods = new Map<string, CatalogFood>()
  for (const row of rows.foods) {
    const id = requiredString(row, 'id')
    assertCatalogId(id, 'food', activeReleaseVersion)
    if (
      foods.has(id) || !Array.isArray(row.meal_types) ||
      row.meal_types.some((item) => typeof item !== 'string')
    ) {
      configurationError()
    }
    const mealTypes = row.meal_types as string[]
    if (
      new Set(mealTypes).size !== mealTypes.length ||
      mealTypes.some((item) => !MEAL_TYPE_SET.has(item))
    ) {
      configurationError()
    }
    const ingredientIds = ingredientIdsByFood.get(id)
    if (!ingredientIds?.size || !mealTypes.length) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
    foods.set(id, {
      id,
      name_en: requiredString(row, 'name_en'),
      name_fa: requiredString(row, 'name_fa'),
      meal_types: mealTypes,
      portable: row.portable === true,
      nutrition: {
        calories: requiredNumber(row, 'calories'),
        protein_g: requiredNumber(row, 'protein_g'),
        carbs_g: requiredNumber(row, 'carbs_g'),
        fat_g: requiredNumber(row, 'fat_g'),
        fiber_g: requiredNumber(row, 'fiber_g'),
      },
      ingredientIds,
    })
  }
  for (const foodId of ingredientIdsByFood.keys()) {
    if (!foods.has(foodId)) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
  }

  const equipmentIds = new Set<string>()
  for (const row of rows.equipment) {
    const id = requiredString(row, 'id')
    assertCatalogId(id, 'equipment', activeReleaseVersion)
    addUniqueId(equipmentIds, id)
  }
  const equipmentIdsByExercise = new Map<string, Set<string>>()
  for (const row of rows.exerciseEquipment) {
    const exerciseId = requiredString(row, 'exercise_id')
    const equipmentId = requiredString(row, 'equipment_id')
    if (!equipmentIds.has(equipmentId)) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
    const values = equipmentIdsByExercise.get(exerciseId) ?? new Set<string>()
    if (values.has(equipmentId)) configurationError()
    values.add(equipmentId)
    equipmentIdsByExercise.set(exerciseId, values)
  }
  const substitutionsByExercise = new Map<string, Set<string>>()
  for (const row of rows.substitutions) {
    const exerciseId = requiredString(row, 'exercise_id')
    const substituteId = requiredString(row, 'substitute_exercise_id')
    if (exerciseId === substituteId) configurationError()
    const values = substitutionsByExercise.get(exerciseId) ?? new Set<string>()
    if (values.has(substituteId)) configurationError()
    values.add(substituteId)
    substitutionsByExercise.set(exerciseId, values)
  }

  const exercises = new Map<string, CatalogExercise>()
  for (const row of rows.exercises) {
    const id = requiredString(row, 'id')
    assertCatalogId(id, 'exercise', activeReleaseVersion)
    if (exercises.has(id)) configurationError()
    const exerciseEquipment = equipmentIdsByExercise.get(id)
    if (!exerciseEquipment?.size) configurationError()
    exercises.set(id, {
      id,
      name_en: requiredString(row, 'name_en'),
      name_fa: requiredString(row, 'name_fa'),
      equipmentIds: exerciseEquipment,
      substitutionIds: substitutionsByExercise.get(id) ?? new Set(),
    })
  }
  for (const [exerciseId, substitutionIds] of substitutionsByExercise) {
    if (!exercises.has(exerciseId) || [...substitutionIds].some((id) => !exercises.has(id))) {
      throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is invalid.')
    }
  }
  for (const exerciseId of equipmentIdsByExercise.keys()) {
    if (!exercises.has(exerciseId)) configurationError()
  }

  if (!foods.size || !ingredients.size || !exercises.size) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'Plan catalog is empty.')
  }
  return {
    releaseId,
    releaseVersion: activeReleaseVersion,
    allergens,
    ingredients,
    foods,
    equipmentIds,
    exercises,
  }
}

export function resolveDeclaredAllergenIds(
  catalog: PlanCatalogSnapshot,
  declaredAllergies: readonly string[],
): ReadonlySet<string> {
  const resolved = new Set<string>()
  for (const allergy of declaredAllergies) {
    const normalized = normalizedTerm(allergy)
    if (!normalized) continue
    const matches = [...catalog.allergens.entries()]
      .filter(([, value]) => value.terms.has(normalized))
      .map(([id]) => id)
    if (matches.length !== 1) {
      throw new HttpError(
        409,
        'unmapped_declared_allergen',
        'A declared allergy is not mapped to the governed allergen catalog.',
      )
    }
    resolved.add(matches[0] as string)
  }
  return resolved
}

export function planCatalogPromptContext(catalog: PlanCatalogSnapshot): Record<string, unknown> {
  return {
    release_id: catalog.releaseId,
    release_version: catalog.releaseVersion,
    foods: [...catalog.foods.values()].map((food) => ({
      id: food.id,
      name_en: food.name_en,
      name_fa: food.name_fa,
      meal_types: food.meal_types,
      portable: food.portable,
      nutrition: food.nutrition,
      ingredient_ids: [...food.ingredientIds],
    })),
    ingredients: [...catalog.ingredients.values()].map((ingredient) => ({
      id: ingredient.id,
      name_en: ingredient.name_en,
      name_fa: ingredient.name_fa,
      default_unit: ingredient.default_unit,
      allergen_ids: [...ingredient.allergenIds],
    })),
    exercises: [...catalog.exercises.values()].map((exercise) => ({
      id: exercise.id,
      name_en: exercise.name_en,
      name_fa: exercise.name_fa,
      equipment_ids: [...exercise.equipmentIds],
      substitution_ids: [...exercise.substitutionIds],
    })),
    equipment_ids: [...catalog.equipmentIds],
  }
}

export async function loadPlanCatalog(admin: SupabaseClient): Promise<PlanCatalogSnapshot> {
  const releases = await admin.from('catalog_releases').select('id').eq('status', 'active').limit(2)
  if (releases.error) {
    throw new HttpError(503, 'catalog_unavailable', 'Plan catalog is unavailable.')
  }
  const releaseRows = records(releases.data)
  if (releaseRows.length !== 1) {
    throw new HttpError(503, 'catalog_configuration_invalid', 'One active catalog is required.')
  }
  const releaseId = requiredString(releaseRows[0] ?? {}, 'id')
  const [
    allergens,
    ingredients,
    ingredientAllergens,
    foods,
    foodIngredients,
    equipment,
    exercises,
    exerciseEquipment,
    substitutions,
  ] = await Promise.all([
    admin.from('allergen_catalog').select('id,slug,name_en,name_fa,aliases')
      .eq('catalog_release_id', releaseId).eq('active', true).limit(MAX_CATALOG_ROWS + 1),
    admin.from('ingredient_catalog').select('id,name_en,name_fa,default_unit')
      .eq('catalog_release_id', releaseId).eq('active', true).limit(MAX_CATALOG_ROWS + 1),
    admin.from('ingredient_allergens').select('ingredient_id,allergen_id')
      .limit(MAX_CATALOG_ROWS + 1),
    admin.from('food_catalog')
      .select('id,name_en,name_fa,meal_types,calories,protein_g,carbs_g,fat_g,fiber_g,portable')
      .eq('catalog_release_id', releaseId).eq('active', true).limit(MAX_CATALOG_ROWS + 1),
    admin.from('food_catalog_ingredients').select('food_id,ingredient_id,amount,unit')
      .limit(MAX_CATALOG_ROWS + 1),
    admin.from('equipment_catalog').select('id').eq('catalog_release_id', releaseId)
      .eq('active', true).limit(MAX_CATALOG_ROWS + 1),
    admin.from('exercise_catalog').select('id,name_en,name_fa')
      .eq('catalog_release_id', releaseId).eq('active', true).limit(MAX_CATALOG_ROWS + 1),
    admin.from('exercise_equipment').select('exercise_id,equipment_id')
      .limit(MAX_CATALOG_ROWS + 1),
    admin.from('exercise_substitutions').select('exercise_id,substitute_exercise_id')
      .limit(MAX_CATALOG_ROWS + 1),
  ])
  const results = [
    allergens,
    ingredients,
    ingredientAllergens,
    foods,
    foodIngredients,
    equipment,
    exercises,
    exerciseEquipment,
    substitutions,
  ]
  if (results.some((result) => result.error)) {
    throw new HttpError(503, 'catalog_unavailable', 'Plan catalog is unavailable.')
  }
  const allergenRows = records(allergens.data)
  const ingredientRows = records(ingredients.data)
  const foodRows = records(foods.data)
  const equipmentRows = records(equipment.data)
  const exerciseRows = records(exercises.data)
  const allergenIds = new Set(allergenRows.map((row) => requiredString(row, 'id')))
  const ingredientIds = new Set(ingredientRows.map((row) => requiredString(row, 'id')))
  const foodIds = new Set(foodRows.map((row) => requiredString(row, 'id')))
  const activeEquipmentIds = new Set(equipmentRows.map((row) => requiredString(row, 'id')))
  const exerciseIds = new Set(exerciseRows.map((row) => requiredString(row, 'id')))
  return createPlanCatalogSnapshot({
    releases: releaseRows,
    allergens: allergenRows,
    ingredients: ingredientRows,
    ingredientAllergens: records(ingredientAllergens.data).filter((row) =>
      ingredientIds.has(String(row.ingredient_id)) && allergenIds.has(String(row.allergen_id))
    ),
    foods: foodRows,
    foodIngredients: records(foodIngredients.data).filter((row) =>
      foodIds.has(String(row.food_id)) && ingredientIds.has(String(row.ingredient_id))
    ),
    equipment: equipmentRows,
    exercises: exerciseRows,
    exerciseEquipment: records(exerciseEquipment.data).filter((row) =>
      exerciseIds.has(String(row.exercise_id)) &&
      activeEquipmentIds.has(String(row.equipment_id))
    ),
    substitutions: records(substitutions.data).filter((row) =>
      exerciseIds.has(String(row.exercise_id)) &&
      exerciseIds.has(String(row.substitute_exercise_id))
    ),
  })
}
