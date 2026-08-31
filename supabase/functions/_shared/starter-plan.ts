import { HttpError } from './http.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import type { CatalogFood, PlanCatalogSnapshot } from './plan-catalog.ts'

const STARTER_FOOD_IDS_V1 = [
  'food:banana-snack@v1',
  'food:chicken-rice-bowl@v1',
  'food:lentil-rice-bowl@v1',
] as const

const STARTER_FOOD_IDS_V2 = [
  'food:banana-almonds@v2',
  'food:chicken-rice-bowl@v2',
  'food:lentil-stew-rice@v2',
] as const

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
): Record<string, unknown> {
  const food = requiredFood(catalog, foodId)
  return {
    food_id: food.id,
    option_key: optionKey,
    title: locale === 'fa-IR' ? food.name_fa : food.name_en,
    ingredients: [...food.ingredientIds].map((ingredientId) => {
      const ingredient = catalog.ingredients.get(ingredientId)
      if (!ingredient) {
        throw new HttpError(
          503,
          'starter_catalog_incomplete',
          'Starter plan catalog is incomplete.',
        )
      }
      return {
        ingredient_id: ingredient.id,
        name: locale === 'fa-IR' ? ingredient.name_fa : ingredient.name_en,
        amount: 1,
        unit: ingredient.default_unit,
        note: null,
      }
    }),
    nutrition: {
      ...food.nutrition,
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
  const match = [...catalog.foods.values()].find((food) =>
    food.meal_types.includes(mealType) &&
    !foodHasDeclaredAllergen(catalog, food, declaredAllergenIds)
  )
  if (!match) {
    throw new HttpError(
      422,
      'starter_plan_allergen_unavailable',
      'No governed starter food is available for the declared allergens.',
    )
  }
  return match
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
): Record<string, unknown> {
  return buildMonthlyStubPlan(catalog, requestedDays, locale, { declaredAllergenIds })
}

export function buildMonthlyStubPlan(
  catalog: PlanCatalogSnapshot,
  requestedDays: number,
  locale: 'fa-IR' | 'en-US',
  options: { invalidCatalogId?: boolean; declaredAllergenIds?: ReadonlySet<string> } = {},
): Record<string, unknown> {
  if (requestedDays !== MONTHLY_PLAN_DAYS) {
    throw new HttpError(400, 'invalid_days', 'Monthly plans must cover exactly 30 days.')
  }
  const foods = starterFoodIds(catalog)
  const declaredAllergenIds = options.declaredAllergenIds ?? new Set<string>()
  const breakfast = foodForMealType(catalog, 'breakfast', foods[0], declaredAllergenIds)
  const lunch = foodForMealType(catalog, 'lunch', foods[1], declaredAllergenIds)
  const dinner = foodForMealType(catalog, 'dinner', foods[2], declaredAllergenIds)
  const exerciseIds = exerciseIdsForStub(catalog)
  const foodIds = [breakfast.id, lunch.id, dinner.id]

  const labels = locale === 'fa-IR'
    ? {
      name: 'برنامه پایه مومنتوم',
      summary: 'یک برنامه ساده و غیرپزشکی برای بزرگسالان واجد شرایط.',
      day: 'روز',
      strategy: 'انرژی متعادل در طول روز',
      workout: 'تمرین پایه تمام‌بدن',
      breakfast: 'صبحانه',
      lunch: 'ناهار',
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
      lunch: 'Lunch',
      dinner: 'Dinner',
      emergency: 'Emergency option',
      restaurant: 'Simple restaurant option',
      order: 'Choose simple ingredients and request sauce separately.',
      grocery: 'Starter ingredients',
      note: 'Stop exercising if pain, dizziness, or unusual symptoms occur.',
    }

  const targets = {
    calories: breakfast.nutrition.calories + lunch.nutrition.calories + dinner.nutrition.calories,
    protein_g: breakfast.nutrition.protein_g + lunch.nutrition.protein_g +
      dinner.nutrition.protein_g,
    carbs_g: breakfast.nutrition.carbs_g + lunch.nutrition.carbs_g + dinner.nutrition.carbs_g,
    fat_g: breakfast.nutrition.fat_g + lunch.nutrition.fat_g + dinner.nutrition.fat_g,
    fiber_g: breakfast.nutrition.fiber_g + lunch.nutrition.fiber_g + dinner.nutrition.fiber_g,
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
    meals: [
      {
        slot_key: `breakfast-${dayIndex}`,
        type: 'breakfast',
        title: labels.breakfast,
        scheduled_time: '08:00',
        default_option_key: `breakfast-option-${dayIndex}`,
        options: [option(catalog, breakfast.id, `breakfast-option-${dayIndex}`, locale)],
      },
      {
        slot_key: `lunch-${dayIndex}`,
        type: 'lunch',
        title: labels.lunch,
        scheduled_time: '13:00',
        default_option_key: `lunch-option-${dayIndex}`,
        options: [option(catalog, lunch.id, `lunch-option-${dayIndex}`, locale)],
      },
      {
        slot_key: `dinner-${dayIndex}`,
        type: 'dinner',
        title: labels.dinner,
        scheduled_time: '19:00',
        default_option_key: `dinner-option-${dayIndex}`,
        options: [option(catalog, dinner.id, `dinner-option-${dayIndex}`, locale)],
      },
    ],
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
