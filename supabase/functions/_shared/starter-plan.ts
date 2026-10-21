import { HttpError } from './http.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import type { CatalogFood, PlanCatalogSnapshot } from './plan-catalog.ts'

const STARTER_FOOD_IDS_V1 = [
  'food:banana-snack@v1',
  'food:chicken-rice-bowl@v1',
  'food:lentil-rice-bowl@v1',
] as const

const STARTER_FOOD_IDS_V2 = [
  'food:oat-yogurt-bowl@v2',
  'food:chicken-rice-bowl@v2',
  'food:lentil-stew-rice@v2',
] as const

// Matches the floor assertGeneratedPlan enforces on the deterministic starter.
const STARTER_MINIMUM_CALORIES = 1_200
const MAX_SERVING_MULTIPLIER = 4
const SNACK_MEAL_TYPES = ['afternoon_snack', 'morning_snack'] as const
const MEAL_TIMES: Record<string, string> = {
  breakfast: '08:00',
  morning_snack: '10:30',
  lunch: '13:00',
  afternoon_snack: '16:30',
  dinner: '19:00',
}

const STARTER_EXERCISE_IDS_V1 = [
  'exercise:bodyweight-squat@v1',
  'exercise:incline-wall-pushup@v1',
  'exercise:glute-bridge@v1',
] as const

const STARTER_EXERCISE_IDS_V2 = [
  'exercise:bodyweight-squat@v2',
  'exercise:wall-pushup@v2',
  'exercise:glute-bridge@v2',
] as const

function starterFoodIds(catalog: PlanCatalogSnapshot): readonly string[] {
  return catalog.releaseId === 'momentum-core@v2' ? STARTER_FOOD_IDS_V2 : STARTER_FOOD_IDS_V1
}

function starterExerciseIds(catalog: PlanCatalogSnapshot): readonly string[] {
  return catalog.releaseId === 'momentum-core@v2'
    ? STARTER_EXERCISE_IDS_V2
    : STARTER_EXERCISE_IDS_V1
}

function requiredFood(catalog: PlanCatalogSnapshot, id: string): CatalogFood {
  const food = catalog.foods.get(id)
  if (!food) {
    throw new HttpError(503, 'starter_catalog_incomplete', 'Starter plan catalog is incomplete.')
  }
  return food
}

function option(
  catalog: PlanCatalogSnapshot,
  foodId: string,
  optionKey: string,
  locale: 'fa-IR' | 'en-US',
  servingMultiplier = 1,
): Record<string, unknown> {
  const food = requiredFood(catalog, foodId)
  return {
    food_id: food.id,
    option_key: optionKey,
    title: locale === 'fa-IR' ? food.name_fa : food.name_en,
    ...(servingMultiplier === 1 ? {} : { serving_multiplier: servingMultiplier }),
    ingredients: [...food.ingredientIds].map((ingredientId) => {
      const ingredient = catalog.ingredients.get(ingredientId)
      const portion = food.ingredientPortions.get(ingredientId)
      if (!ingredient || !portion) {
        throw new HttpError(
          503,
          'starter_catalog_incomplete',
          'Starter plan catalog is incomplete.',
        )
      }
      return {
        ingredient_id: ingredient.id,
        name: locale === 'fa-IR' ? ingredient.name_fa : ingredient.name_en,
        amount: portion.amount * servingMultiplier,
        unit: ingredient.default_unit,
        note: null,
      }
    }),
    nutrition: {
      ...scaledNutrition(food, servingMultiplier),
      confidence: 'high',
      source: 'catalog_reference',
    },
    recipe: null,
    warnings: [],
    portable: food.portable,
  }
}

function exercise(
  catalog: PlanCatalogSnapshot,
  exerciseId: string,
  exerciseKey: string,
  locale: 'fa-IR' | 'en-US',
): Record<string, unknown> {
  const item = catalog.exercises.get(exerciseId)
  if (!item) {
    throw new HttpError(503, 'starter_catalog_incomplete', 'Starter plan catalog is incomplete.')
  }
  const substitutionId = [...item.substitutionIds][0] ?? null
  const substitution = substitutionId ? catalog.exercises.get(substitutionId) : undefined
  return {
    exercise_id: item.id,
    exercise_key: exerciseKey,
    name: locale === 'fa-IR' ? item.name_fa : item.name_en,
    sets: 3,
    reps: '8-12',
    rest_seconds: 60,
    equipment: [...item.equipmentIds],
    equipment_ids: [...item.equipmentIds],
    intensity_note: locale === 'fa-IR' ? 'با شدت متوسط و کنترل‌شده' : 'Moderate, controlled effort',
    substitution: substitution
      ? (locale === 'fa-IR' ? substitution.name_fa : substitution.name_en)
      : null,
    substitution_exercise_id: substitutionId,
  }
}

function roundNutrient(value: number) {
  return Math.round(value * 100) / 100
}

function scaledNutrition(food: CatalogFood, multiplier: number) {
  return {
    calories: roundNutrient(food.nutrition.calories * multiplier),
    protein_g: roundNutrient(food.nutrition.protein_g * multiplier),
    carbs_g: roundNutrient(food.nutrition.carbs_g * multiplier),
    fat_g: roundNutrient(food.nutrition.fat_g * multiplier),
    fiber_g: roundNutrient(food.nutrition.fiber_g * multiplier),
  }
}

function foodHasDeclaredAllergen(
  catalog: PlanCatalogSnapshot,
  food: CatalogFood,
  declaredAllergenIds: ReadonlySet<string>,
) {
  return [...food.ingredientIds].some((ingredientId) => {
    const ingredient = catalog.ingredients.get(ingredientId)
    return ingredient && [...ingredient.allergenIds].some((id) => declaredAllergenIds.has(id))
  })
}

// Fallbacks must not depend on catalog load order: most energy-dense first, ties
// broken by ID, so the day has the best chance of clearing the calorie floor.
function eligibleFoods(
  catalog: PlanCatalogSnapshot,
  mealType: string,
  declaredAllergenIds: ReadonlySet<string>,
): CatalogFood[] {
  return [...catalog.foods.values()]
    .filter((food) =>
      food.meal_types.includes(mealType) &&
      !foodHasDeclaredAllergen(catalog, food, declaredAllergenIds)
    )
    .sort((a, b) =>
      b.nutrition.calories - a.nutrition.calories || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
}

function foodForMealType(
  catalog: PlanCatalogSnapshot,
  mealType: string,
  preferredId?: string,
  declaredAllergenIds: ReadonlySet<string> = new Set(),
) {
  if (preferredId && catalog.foods.has(preferredId)) {
    const preferred = requiredFood(catalog, preferredId)
    if (
      preferred.meal_types.includes(mealType) &&
      !foodHasDeclaredAllergen(catalog, preferred, declaredAllergenIds)
    ) return preferred
  }
  const match = eligibleFoods(catalog, mealType, declaredAllergenIds)[0]
  if (!match) {
    throw new HttpError(
      422,
      'starter_plan_allergen_unavailable',
      'No governed starter food is available for the declared allergens.',
    )
  }
  return match
}

// Later cycles rotate each main meal through the other eligible catalog foods
// so month 2+ is not a copy of month 1. Cycle 1 keeps the preferred food.
function foodForCycle(
  catalog: PlanCatalogSnapshot,
  mealType: string,
  preferredId: string | undefined,
  declaredAllergenIds: ReadonlySet<string>,
  cycleIndex: number,
) {
  const first = foodForMealType(catalog, mealType, preferredId, declaredAllergenIds)
  if (cycleIndex <= 1) return first
  const candidates = [
    first,
    ...eligibleFoods(catalog, mealType, declaredAllergenIds).filter((food) => food.id !== first.id),
  ]
  return candidates[(cycleIndex - 1) % candidates.length] ?? first
}

function exerciseIdsForStub(catalog: PlanCatalogSnapshot): string[] {
  const preferred = starterExerciseIds(catalog).filter((id) => catalog.exercises.has(id))
  const extras = [...catalog.exercises.keys()].filter((id) => !preferred.includes(id))
  const ids = [...preferred, ...extras].slice(0, 3)
  if (ids.length < 1) {
    throw new HttpError(503, 'starter_catalog_incomplete', 'Starter plan catalog is incomplete.')
  }
  return ids
}

export function buildStarterPlan(
  catalog: PlanCatalogSnapshot,
  requestedDays: number,
  locale: 'fa-IR' | 'en-US',
  declaredAllergenIds: ReadonlySet<string> = new Set(),
  cycleIndex = 1,
): Record<string, unknown> {
  return buildMonthlyStubPlan(catalog, requestedDays, locale, { declaredAllergenIds, cycleIndex })
}

export function buildMonthlyStubPlan(
  catalog: PlanCatalogSnapshot,
  requestedDays: number,
  locale: 'fa-IR' | 'en-US',
  options: {
    invalidCatalogId?: boolean
    declaredAllergenIds?: ReadonlySet<string>
    cycleIndex?: number
  } = {},
): Record<string, unknown> {
  if (requestedDays !== MONTHLY_PLAN_DAYS) {
    throw new HttpError(400, 'invalid_days', 'Monthly plans must cover exactly 30 days.')
  }
  const foods = starterFoodIds(catalog)
  const declaredAllergenIds = options.declaredAllergenIds ?? new Set<string>()
  const cycleIndex = options.cycleIndex ?? 1
  const breakfast = foodForCycle(catalog, 'breakfast', foods[0], declaredAllergenIds, cycleIndex)
  const lunch = foodForCycle(catalog, 'lunch', foods[1], declaredAllergenIds, cycleIndex)
  const dinner = foodForCycle(catalog, 'dinner', foods[2], declaredAllergenIds, cycleIndex)
  const meals: Array<{ type: string; food: CatalogFood }> = [
    { type: 'breakfast', food: breakfast },
    { type: 'lunch', food: lunch },
    { type: 'dinner', food: dinner },
  ]
  const dayCalories = () => meals.reduce((sum, meal) => sum + meal.food.nutrition.calories, 0)
  // Allergen fallbacks can leave three meals short of the floor: add snacks
  // first, then scale every portion by the smallest quarter-step that fits.
  for (const snackType of SNACK_MEAL_TYPES) {
    if (dayCalories() >= STARTER_MINIMUM_CALORIES) break
    const snack = eligibleFoods(catalog, snackType, declaredAllergenIds)[0]
    if (snack) meals.push({ type: snackType, food: snack })
  }
  meals.sort((a, b) => (MEAL_TIMES[a.type] ?? '').localeCompare(MEAL_TIMES[b.type] ?? ''))
  const baseCalories = dayCalories()
  const servingMultiplier = baseCalories >= STARTER_MINIMUM_CALORIES
    ? 1
    : Math.ceil((STARTER_MINIMUM_CALORIES / baseCalories) * 4) / 4
  if (!(servingMultiplier <= MAX_SERVING_MULTIPLIER)) {
    throw new HttpError(
      422,
      'starter_plan_allergen_unavailable',
      'No governed starter food is available for the declared allergens.',
    )
  }
  const exerciseIds = exerciseIdsForStub(catalog)
  const foodIds = meals.map((meal) => meal.food.id)

  const labels = locale === 'fa-IR'
    ? {
      name: 'برنامه پایه مومنتوم',
      summary: 'یک برنامه ساده و غیرپزشکی برای بزرگسالان واجد شرایط.',
      day: 'روز',
      strategy: 'انرژی متعادل در طول روز',
      workout: 'تمرین پایه تمام‌بدن',
      breakfast: 'صبحانه',
      morning_snack: 'میان‌وعده صبح',
      lunch: 'ناهار',
      afternoon_snack: 'میان‌وعده عصر',
      dinner: 'شام',
      emergency: 'گزینه فوری',
      restaurant: 'گزینه ساده رستوران',
      order: 'مواد ساده و سس جداگانه سفارش دهید.',
      grocery: 'مواد پایه',
      note: 'در صورت درد، سرگیجه یا علائم غیرعادی تمرین را متوقف کنید.',
    }
    : {
      name: 'Momentum starter plan',
      summary: 'A simple, non-medical starter plan for eligible adults.',
      day: 'Day',
      strategy: 'Balanced energy across the day',
      workout: 'Starter full-body session',
      breakfast: 'Breakfast',
      morning_snack: 'Morning snack',
      lunch: 'Lunch',
      afternoon_snack: 'Afternoon snack',
      dinner: 'Dinner',
      emergency: 'Emergency option',
      restaurant: 'Simple restaurant option',
      order: 'Choose simple ingredients and request sauce separately.',
      grocery: 'Starter ingredients',
      note: 'Stop exercising if pain, dizziness, or unusual symptoms occur.',
    }

  const mealNutrition = meals.map((meal) => scaledNutrition(meal.food, servingMultiplier))
  const total = (key: keyof ReturnType<typeof scaledNutrition>) =>
    roundNutrient(mealNutrition.reduce((sum, nutrition) => sum + nutrition[key], 0))
  const targets = {
    calories: total('calories'),
    protein_g: total('protein_g'),
    carbs_g: total('carbs_g'),
    fat_g: total('fat_g'),
    fiber_g: total('fiber_g'),
    water_ml: 2200,
  }
  const days = Array.from({ length: requestedDays }, (_, dayIndex) => ({
    day_index: dayIndex,
    title: `${labels.day} ${dayIndex + 1}`,
    training_type: 'full_body',
    target_strategy: { mode: 'balanced', rationale: labels.strategy },
    targets,
    workout: {
      title: labels.workout,
      duration_minutes: 30,
      intensity: 'moderate',
      warmup: [locale === 'fa-IR' ? 'پنج دقیقه راه رفتن آرام' : 'Five minutes of easy walking'],
      exercises: exerciseIds.map((id, index) =>
        exercise(catalog, id, `starter-${dayIndex}-${index}`, locale)
      ),
      cooldown: [locale === 'fa-IR' ? 'پنج دقیقه راه رفتن آرام' : 'Five minutes of easy walking'],
      safety_note: labels.note,
    },
    meals: meals.map(({ type, food }) => ({
      slot_key: `${type}-${dayIndex}`,
      type,
      title: labels[type as keyof typeof labels],
      scheduled_time: MEAL_TIMES[type],
      default_option_key: `${type}-option-${dayIndex}`,
      options: [
        option(catalog, food.id, `${type}-option-${dayIndex}`, locale, servingMultiplier),
      ],
    })),
    notes: [],
  }))
  const groceryIngredients = new Map<string, Record<string, unknown>>()
  for (const foodId of foodIds) {
    for (const ingredientId of requiredFood(catalog, foodId).ingredientIds) {
      const ingredient = catalog.ingredients.get(ingredientId)
      if (!ingredient) continue
      groceryIngredients.set(ingredientId, {
        ingredient_id: ingredient.id,
        name: locale === 'fa-IR' ? ingredient.name_fa : ingredient.name_en,
        amount: requestedDays,
        unit: ingredient.default_unit,
        note: null,
      })
    }
  }

  const plan: Record<string, unknown> = {
    content_locale: locale,
    plan_name: labels.name,
    summary: labels.summary,
    default_targets: targets,
    days,
    emergency_options: [option(catalog, breakfast.id, 'emergency-banana', locale)],
    restaurant_guide: [{
      title: labels.restaurant,
      order_instructions: [labels.order],
      estimated_nutrition: {
        calories: 650,
        protein_g: 45,
        carbs_g: 75,
        fat_g: 19,
        fiber_g: 7,
        confidence: 'medium',
        source: 'model_estimate',
      },
    }],
    grocery_list: [{ category: labels.grocery, items: [...groceryIngredients.values()] }],
    health_safety_notes: [{ category: 'training', level: 'caution', note: labels.note }],
  }

  if (options.invalidCatalogId) {
    const firstDay = (plan.days as Record<string, unknown>[])[0]
    const meals = firstDay?.meals as Record<string, unknown>[] | undefined
    const optionsList = meals?.[0]?.options as Record<string, unknown>[] | undefined
    if (optionsList?.[0]) optionsList[0].food_id = 'food:not-in-catalog@v2'
  }
  return plan
}
