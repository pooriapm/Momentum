import { describe, expect, it } from 'vitest'
import {
  createPlanCatalogSnapshot,
  resolveDeclaredAllergenIds,
  type PlanCatalogRows,
} from '../supabase/functions/_shared/plan-catalog.ts'
import { assertGeneratedPlan } from '../supabase/functions/_shared/plan-contract.ts'
import { buildStarterPlan } from '../supabase/functions/_shared/starter-plan.ts'

const ingredients = [
  ['ingredient:brown-rice@v1', 'Rice', 'برنج', 'g'],
  ['ingredient:chicken-breast@v1', 'Chicken', 'مرغ', 'g'],
  ['ingredient:olive-oil@v1', 'Olive oil', 'روغن زیتون', 'tsp'],
  ['ingredient:banana@v1', 'Banana', 'موز', 'piece'],
  ['ingredient:red-lentils@v1', 'Lentils', 'عدس', 'g'],
  ['ingredient:spinach@v1', 'Spinach', 'اسفناج', 'g'],
].map(([id, name_en, name_fa, default_unit]) => ({ id, name_en, name_fa, default_unit }))

const foods = [
  {
    id: 'food:banana-snack@v1', name_en: 'Banana snack', name_fa: 'موز',
    meal_types: ['breakfast', 'morning_snack', 'afternoon_snack'], portable: true,
    calories: 400, protein_g: 10, carbs_g: 75, fat_g: 6, fiber_g: 8,
  },
  {
    id: 'food:chicken-rice-bowl@v1', name_en: 'Chicken rice', name_fa: 'مرغ و برنج',
    meal_types: ['lunch', 'dinner'], portable: false,
    calories: 650, protein_g: 45, carbs_g: 75, fat_g: 19, fiber_g: 7,
  },
  {
    id: 'food:lentil-rice-bowl@v1', name_en: 'Lentil rice', name_fa: 'عدس و برنج',
    meal_types: ['lunch', 'dinner'], portable: false,
    calories: 650, protein_g: 25, carbs_g: 100, fat_g: 17, fiber_g: 18,
  },
]

const foodIngredients = [
  ['food:banana-snack@v1', 'ingredient:banana@v1', 'piece'],
  ['food:chicken-rice-bowl@v1', 'ingredient:brown-rice@v1', 'g'],
  ['food:chicken-rice-bowl@v1', 'ingredient:chicken-breast@v1', 'g'],
  ['food:chicken-rice-bowl@v1', 'ingredient:olive-oil@v1', 'tsp'],
  ['food:chicken-rice-bowl@v1', 'ingredient:spinach@v1', 'g'],
  ['food:lentil-rice-bowl@v1', 'ingredient:brown-rice@v1', 'g'],
  ['food:lentil-rice-bowl@v1', 'ingredient:red-lentils@v1', 'g'],
  ['food:lentil-rice-bowl@v1', 'ingredient:olive-oil@v1', 'tsp'],
  ['food:lentil-rice-bowl@v1', 'ingredient:spinach@v1', 'g'],
].map(([food_id, ingredient_id, unit]) => ({ food_id, ingredient_id, amount: 1, unit }))

const exercises = [
  ['exercise:bodyweight-squat@v1', 'Squat', 'اسکوات'],
  ['exercise:incline-wall-pushup@v1', 'Wall push-up', 'شنا دیوار'],
  ['exercise:glute-bridge@v1', 'Glute bridge', 'پل باسن'],
].map(([id, name_en, name_fa]) => ({ id, name_en, name_fa }))

function rows(ingredientAllergens: Record<string, unknown>[] = []): PlanCatalogRows {
  return {
    releases: [{ id: 'momentum-core@v1' }],
    allergens: [{
      id: 'allergen:milk@v1', slug: 'milk', name_en: 'Milk', name_fa: 'شیر',
      aliases: ['dairy', 'لبنیات'],
    }],
    ingredients,
    ingredientAllergens,
    foods,
    foodIngredients,
    equipment: [{ id: 'equipment:bodyweight@v1' }, { id: 'equipment:wall@v1' }],
    exercises,
    exerciseEquipment: [
      { exercise_id: exercises[0]?.id, equipment_id: 'equipment:bodyweight@v1' },
      { exercise_id: exercises[1]?.id, equipment_id: 'equipment:bodyweight@v1' },
      { exercise_id: exercises[1]?.id, equipment_id: 'equipment:wall@v1' },
      { exercise_id: exercises[2]?.id, equipment_id: 'equipment:bodyweight@v1' },
    ],
    substitutions: [
      { exercise_id: exercises[0]?.id, substitute_exercise_id: exercises[2]?.id },
      { exercise_id: exercises[2]?.id, substitute_exercise_id: exercises[0]?.id },
    ],
  }
}

function firstIngredient(plan: Record<string, unknown>): Record<string, unknown> {
  const day = (plan.days as Record<string, unknown>[])[0] as Record<string, unknown>
  const meal = (day.meals as Record<string, unknown>[])[0] as Record<string, unknown>
  const option = (meal.options as Record<string, unknown>[])[0] as Record<string, unknown>
  return (option.ingredients as Record<string, unknown>[])[0] as Record<string, unknown>
}

function firstExercise(plan: Record<string, unknown>): Record<string, unknown> {
  const day = (plan.days as Record<string, unknown>[])[0] as Record<string, unknown>
  const workout = day.workout as Record<string, unknown>
  return (workout.exercises as Record<string, unknown>[])[0] as Record<string, unknown>
}

describe('governed plan catalog', () => {
  it('builds a deterministic non-AI starter plan that passes the same contract', () => {
    const catalog = createPlanCatalogSnapshot(rows())
    const plan = buildStarterPlan(catalog, 30, 'en-US')

    expect(() => assertGeneratedPlan(plan, 30, 'en-US', { catalog })).not.toThrow()
  })

  it('fails closed when generated output contains an unknown catalog ID', () => {
    const catalog = createPlanCatalogSnapshot(rows())
    const plan = buildStarterPlan(catalog, 30, 'en-US')
    const days = plan.days as Record<string, unknown>[]
    const meals = days[0]?.meals as Record<string, unknown>[]
    const options = meals[0]?.options as Record<string, unknown>[]
    if (options[0]) options[0].food_id = 'food:invented@v1'

    expect(() => assertGeneratedPlan(plan, 30, 'en-US', { catalog }))
      .toThrow(expect.objectContaining({ code: 'unknown_catalog_id' }))
  })

  it('maps allergen aliases and rejects a catalog ingredient conflict', () => {
    const catalog = createPlanCatalogSnapshot(rows([{
      ingredient_id: 'ingredient:brown-rice@v1',
      allergen_id: 'allergen:milk@v1',
    }]))
    const plan = buildStarterPlan(catalog, 30, 'fa-IR')
    const declaredAllergenIds = resolveDeclaredAllergenIds(catalog, ['لبنیات'])

    expect(() => assertGeneratedPlan(plan, 30, 'fa-IR', { catalog, declaredAllergenIds }))
      .toThrow(expect.objectContaining({ code: 'allergen_in_generated_plan' }))
  })

  it('fails closed when a declared allergy cannot be mapped', () => {
    const catalog = createPlanCatalogSnapshot(rows())

    expect(() => resolveDeclaredAllergenIds(catalog, ['unknown allergy']))
      .toThrow(expect.objectContaining({ code: 'unmapped_declared_allergen' }))
  })

  it('rejects catalog rows whose ID version or canonical unit drifts from the release', () => {
    const wrongVersion = rows()
    wrongVersion.ingredients = wrongVersion.ingredients.map((row, index) =>
      index === 0 ? { ...row, id: 'ingredient:brown-rice@v2' } : row
    )
    expect(() => createPlanCatalogSnapshot(wrongVersion))
      .toThrow(expect.objectContaining({ code: 'catalog_configuration_invalid' }))

    const wrongUnit = rows()
    wrongUnit.foodIngredients = wrongUnit.foodIngredients.map((row, index) =>
      index === 0 ? { ...row, unit: 'g' } : row
    )
    expect(() => createPlanCatalogSnapshot(wrongUnit))
      .toThrow(expect.objectContaining({ code: 'catalog_configuration_invalid' }))
  })

  it.each([
    ['en-US', 'ml'],
    ['fa-IR', 'ml'],
  ] as const)('rejects altered ingredient amounts and units for %s plans', (locale, invalidUnit) => {
    const catalog = createPlanCatalogSnapshot(rows())
    const invalidAmount = buildStarterPlan(catalog, 30, locale)
    firstIngredient(invalidAmount).amount = 0
    expect(() => assertGeneratedPlan(invalidAmount, 30, locale, { catalog }))
      .toThrow(expect.objectContaining({ code: 'invalid_ingredient_amount' }))

    const invalidUnits = buildStarterPlan(catalog, 30, locale)
    firstIngredient(invalidUnits).unit = invalidUnit
    expect(() => assertGeneratedPlan(invalidUnits, 30, locale, { catalog }))
      .toThrow(expect.objectContaining({ code: 'invalid_ingredient_unit' }))
  })

  it('accepts a Persian-digit repetition boundary and rejects invalid ranges', () => {
    const catalog = createPlanCatalogSnapshot(rows())
    const persian = buildStarterPlan(catalog, 30, 'fa-IR')
    firstExercise(persian).reps = '۸–۱۲'
    expect(() => assertGeneratedPlan(persian, 30, 'fa-IR', { catalog })).not.toThrow()

    for (const reps of ['12-8', '0-12', '8-201', 'eight to twelve']) {
      const invalid = buildStarterPlan(catalog, 30, 'en-US')
      firstExercise(invalid).reps = reps
      expect(() => assertGeneratedPlan(invalid, 30, 'en-US', { catalog }))
        .toThrow(expect.objectContaining({ code: 'invalid_exercise_range' }))
    }
  })

  it('rejects a substitution label that does not match its governed ID', () => {
    const catalog = createPlanCatalogSnapshot(rows())
    const plan = buildStarterPlan(catalog, 30, 'en-US')
    firstExercise(plan).substitution = 'Invented movement'

    expect(() => assertGeneratedPlan(plan, 30, 'en-US', { catalog }))
      .toThrow(expect.objectContaining({ code: 'invalid_exercise_substitution' }))
  })
})
