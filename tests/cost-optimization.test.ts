import { assembleMealOption, aggregateGroceryList } from '../supabase/functions/_shared/plan-assembly.ts'
import { describe, expect, it, vi } from 'vitest'
import {
  COMPACT_SCHEMA_VERSION,
  compactPlanJsonSchema,
  expandCompactPlan,
  stripExpansionMetadata,
} from '../supabase/functions/_shared/compact-plan-contract.ts'
import { createPlanCatalogSnapshot, type PlanCatalogRows } from '../supabase/functions/_shared/plan-catalog.ts'
import { assertGeneratedPlan } from '../supabase/functions/_shared/plan-contract.ts'
import {
  buildGenerationProfileSnapshot,
  profileSnapshotPromptContext,
} from '../supabase/functions/_shared/generation-profile-snapshot.ts'
import {
  calculateProviderCost,
  normalizeProviderUsage,
  costPerDeliveredPlan,
  STANDARD_RATES,
} from '../supabase/functions/_shared/provider-pricing.ts'
import { selectCatalogSubset } from '../supabase/functions/_shared/catalog-subset.ts'
import { classifyRepair, applyDeterministicRepair } from '../supabase/functions/_shared/plan-repair.ts'
import { resolvePlanModelRoute, resolveAsyncServiceTier } from '../supabase/functions/_shared/plan-model-routing.ts'
import { buildAttemptLedger } from '../supabase/functions/_shared/usage-accounting.ts'
import { MONTHLY_PLAN_DAYS } from '../supabase/functions/_shared/plan-period.ts'

const catalogRows = (): PlanCatalogRows => ({
  releases: [{ id: 'momentum-core@v2' }],
  allergens: [{
    id: 'allergen:milk@v2',
    slug: 'milk',
    name_en: 'Milk',
    name_fa: 'شیر',
    aliases: ['dairy', 'شیر'],
  }],
  ingredients: [
    { id: 'ingredient:brown-rice@v2', name_en: 'Rice', name_fa: 'برنج', default_unit: 'g' },
    { id: 'ingredient:chicken-breast@v2', name_en: 'Chicken', name_fa: 'مرغ', default_unit: 'g' },
    { id: 'ingredient:olive-oil@v2', name_en: 'Olive oil', name_fa: 'روغن زیتون', default_unit: 'tsp' },
    { id: 'ingredient:banana@v2', name_en: 'Banana', name_fa: 'موز', default_unit: 'piece' },
    { id: 'ingredient:almonds@v2', name_en: 'Almonds', name_fa: 'بادام', default_unit: 'g' },
    { id: 'ingredient:red-lentils@v2', name_en: 'Lentils', name_fa: 'عدس', default_unit: 'g' },
    { id: 'ingredient:spinach@v2', name_en: 'Spinach', name_fa: 'اسفناج', default_unit: 'g' },
  ],
  ingredientAllergens: [],
  foods: [
    {
      id: 'food:banana-almonds@v2', name_en: 'Banana almonds', name_fa: 'موز و بادام',
      meal_types: ['breakfast', 'morning_snack', 'afternoon_snack'], portable: true,
      calories: 400, protein_g: 10, carbs_g: 75, fat_g: 6, fiber_g: 8,
    },
    {
      id: 'food:oat-bowl@v2', name_en: 'Oat bowl', name_fa: 'جو دوسر',
      meal_types: ['breakfast', 'morning_snack', 'afternoon_snack', 'pre_sleep'], portable: true,
      calories: 350, protein_g: 12, carbs_g: 55, fat_g: 8, fiber_g: 9,
    },
    {
      id: 'food:chicken-rice-bowl@v2', name_en: 'Chicken rice', name_fa: 'مرغ و برنج',
      meal_types: ['lunch', 'dinner'], portable: false,
      calories: 650, protein_g: 45, carbs_g: 75, fat_g: 19, fiber_g: 7,
    },
    {
      id: 'food:lentil-stew-rice@v2', name_en: 'Lentil stew rice', name_fa: 'عدس و برنج',
      meal_types: ['lunch', 'dinner'], portable: false,
      calories: 650, protein_g: 25, carbs_g: 100, fat_g: 17, fiber_g: 18,
    },
  ],
  foodIngredients: [
    { food_id: 'food:banana-almonds@v2', ingredient_id: 'ingredient:banana@v2', amount: 1, unit: 'piece' },
    { food_id: 'food:banana-almonds@v2', ingredient_id: 'ingredient:almonds@v2', amount: 1, unit: 'g' },
    { food_id: 'food:oat-bowl@v2', ingredient_id: 'ingredient:banana@v2', amount: 1, unit: 'piece' },
    { food_id: 'food:chicken-rice-bowl@v2', ingredient_id: 'ingredient:brown-rice@v2', amount: 1, unit: 'g' },
    { food_id: 'food:chicken-rice-bowl@v2', ingredient_id: 'ingredient:chicken-breast@v2', amount: 1, unit: 'g' },
    { food_id: 'food:chicken-rice-bowl@v2', ingredient_id: 'ingredient:olive-oil@v2', amount: 1, unit: 'tsp' },
    { food_id: 'food:chicken-rice-bowl@v2', ingredient_id: 'ingredient:spinach@v2', amount: 1, unit: 'g' },
    { food_id: 'food:lentil-stew-rice@v2', ingredient_id: 'ingredient:brown-rice@v2', amount: 1, unit: 'g' },
    { food_id: 'food:lentil-stew-rice@v2', ingredient_id: 'ingredient:red-lentils@v2', amount: 1, unit: 'g' },
    { food_id: 'food:lentil-stew-rice@v2', ingredient_id: 'ingredient:olive-oil@v2', amount: 1, unit: 'tsp' },
    { food_id: 'food:lentil-stew-rice@v2', ingredient_id: 'ingredient:spinach@v2', amount: 1, unit: 'g' },
  ],
  equipment: [{ id: 'equipment:bodyweight@v2' }],
  exercises: [
    { id: 'exercise:bodyweight-squat@v2', name_en: 'Squat', name_fa: 'اسکوات' },
    { id: 'exercise:wall-pushup@v2', name_en: 'Wall push-up', name_fa: 'شنا دیوار' },
    { id: 'exercise:glute-bridge@v2', name_en: 'Glute bridge', name_fa: 'پل باسن' },
    { id: 'exercise:brisk-walk@v2', name_en: 'Walk', name_fa: 'پیاده‌روی' },
    { id: 'exercise:dead-bug@v2', name_en: 'Dead bug', name_fa: 'ددباگ' },
    { id: 'exercise:hip-hinge@v2', name_en: 'Hip hinge', name_fa: 'هیپ هینج' },
  ],
  exerciseEquipment: [
    { exercise_id: 'exercise:bodyweight-squat@v2', equipment_id: 'equipment:bodyweight@v2' },
    { exercise_id: 'exercise:wall-pushup@v2', equipment_id: 'equipment:bodyweight@v2' },
    { exercise_id: 'exercise:glute-bridge@v2', equipment_id: 'equipment:bodyweight@v2' },
    { exercise_id: 'exercise:brisk-walk@v2', equipment_id: 'equipment:bodyweight@v2' },
    { exercise_id: 'exercise:dead-bug@v2', equipment_id: 'equipment:bodyweight@v2' },
    { exercise_id: 'exercise:hip-hinge@v2', equipment_id: 'equipment:bodyweight@v2' },
  ],
  substitutions: [
    { exercise_id: 'exercise:bodyweight-squat@v2', substitute_exercise_id: 'exercise:glute-bridge@v2' },
  ],
})

function compactFixture(locale: 'fa-IR' | 'en-US' = 'en-US') {
  const mealDefs = [
    {
      meal_def_id: 'breakfast-a',
      type: 'breakfast',
      title: locale === 'fa-IR' ? 'صبحانه' : 'Breakfast',
      scheduled_time: '08:00',
      food_id: 'food:banana-almonds@v2',
      serving_multiplier: 1,
      alt_food_ids: [],
      note: null,
    },
    {
      meal_def_id: 'lunch-a',
      type: 'lunch',
      title: locale === 'fa-IR' ? 'ناهار' : 'Lunch',
      scheduled_time: '13:00',
      food_id: 'food:chicken-rice-bowl@v2',
      serving_multiplier: 1,
      alt_food_ids: ['food:lentil-stew-rice@v2'],
      note: null,
    },
    {
      meal_def_id: 'dinner-a',
      type: 'dinner',
      title: locale === 'fa-IR' ? 'شام' : 'Dinner',
      scheduled_time: '20:00',
      food_id: 'food:lentil-stew-rice@v2',
      serving_multiplier: 1,
      alt_food_ids: [],
      note: null,
    },
  ]
  const workoutDefs = [
    {
      workout_def_id: 'full-a',
      title: locale === 'fa-IR' ? 'تمام‌بدن' : 'Full body',
      training_type: 'full_body',
      duration_minutes: 35,
      intensity: 'moderate',
      exercises: [{
        exercise_id: 'exercise:bodyweight-squat@v2',
        sets: 3,
        reps: '8-12',
        rest_seconds: 60,
        intensity_note: 'controlled',
        substitution_exercise_id: 'exercise:glute-bridge@v2',
      }],
      safety_note: null,
    },
  ]
  const days = Array.from({ length: MONTHLY_PLAN_DAYS }, (_, day_index) => ({
    day_index,
    title: `Day ${day_index + 1}`,
    meal_def_ids: ['breakfast-a', 'lunch-a', 'dinner-a'],
    workout_def_id: day_index % 2 === 0 ? 'full-a' : null,
    target_mode: day_index % 2 === 0 ? 'training_day' : 'rest_day',
    target_rationale: 'Progress gradually across the month.',
    serving_overrides: day_index > 20 ? [{ meal_def_id: 'lunch-a', multiplier: 1.1 }] : [],
    progression_note: day_index === 14 ? 'Mid-cycle progression checkpoint.' : null,
    notes: [],
  }))
  return {
    content_locale: locale,
    plan_name: 'Compact monthly',
    summary: 'Reusable meals and workouts expanded to 30 days.',
    schema_version: COMPACT_SCHEMA_VERSION,
    default_targets: {
      calories: 2000,
      protein_g: 110,
      carbs_g: 220,
      fat_g: 65,
      fiber_g: 28,
      water_ml: 2500,
    },
    meal_definitions: mealDefs,
    workout_definitions: workoutDefs,
    days,
    emergency_food_ids: ['food:banana-almonds@v2'],
    restaurant_guide: [{
      estimated_nutrition: { calories: 650, protein_g: 45, carbs_g: 75, fat_g: 19, fiber_g: 7, confidence: 'low', source: 'model_estimate' },
      title: 'Simple grill',
      order_instructions: ['Choose grilled protein and vegetables.'],
    }],
    health_safety_notes: [{
      category: 'general',
      level: 'info',
      note: 'Stop if pain increases.',
    }],
  }
}

describe('cost optimization foundations', () => {
  it('preserves authoritative ingredient amounts and scales nutrition and groceries together', () => {
    const rows = catalogRows()
    const chicken = rows.foodIngredients.find(row => row.ingredient_id === 'ingredient:chicken-breast@v2')!
    chicken.amount = 150
    const catalog = createPlanCatalogSnapshot(rows)
    const option = assembleMealOption({ catalog, foodId: 'food:chicken-rice-bowl@v2', optionKey: 'test', locale: 'en-US', servingMultiplier: 2, note: null })
    expect(option.nutrition).toMatchObject({ calories: 1300, protein_g: 90 })
    expect(option.ingredients).toEqual(expect.arrayContaining([expect.objectContaining({ ingredient_id: chicken.ingredient_id, amount: 300, unit: 'g' })]))
    const groups = aggregateGroceryList(catalog, [{ foodId: 'food:chicken-rice-bowl@v2', multiplier: 2 }], 'en-US')
    expect(groups[0]?.items).toEqual(expect.arrayContaining([expect.objectContaining({ ingredient_id: chicken.ingredient_id, amount: 300 })]))
  })

  it('uses closed objects throughout the strict provider schema', () => {
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      const node = value as Record<string, unknown>
      if (node.type === 'object' || (Array.isArray(node.type) && node.type.includes('object'))) {
        expect(node.additionalProperties).toBe(false)
        expect(node.required).toEqual(expect.arrayContaining(Object.keys(node.properties as object)))
      }
      Object.values(node).forEach(visit)
    }
    visit(compactPlanJsonSchema)
  })

  it('rejects duplicate overrides and missing restaurant estimates', () => {
    const catalog = createPlanCatalogSnapshot(catalogRows())
    const compact = compactFixture()
    compact.days[0]!.serving_overrides = [{ meal_def_id: 'lunch-a', multiplier: 2 }, { meal_def_id: 'lunch-a', multiplier: 1 }]
    expect(() => expandCompactPlan(compact, catalog, 'en-US')).toThrow()
    const expanded = stripExpansionMetadata(expandCompactPlan(compactFixture(), catalog, 'en-US'))
    ;(expanded.restaurant_guide as Record<string, unknown>[])[0]!.estimated_nutrition = undefined
    expect(() => assertGeneratedPlan(expanded, MONTHLY_PLAN_DAYS, 'en-US', { catalog })).toThrow()
  })

  it('builds a semantic profile snapshot without goal DB ids or email', () => {
    const snapshot = buildGenerationProfileSnapshot({
      profile: {
        date_of_birth: '1995-06-15',
        sex: 'female',
        height_cm: 165,
        locale: 'fa-IR',
        timezone: 'Asia/Tehran',
        country_code: 'IR',
        product_region: 'ir',
      },
      goal: {
        goal_type: 'fat_loss',
        start_weight_kg: 72,
        target_weight_kg: 66,
        target_date: null,
      },
      dietary: {
        allergies: ['شیر'],
        available_equipment: ['bodyweight'],
        budget_tier: 'low',
        cooking_constraints: ['under_30_min'],
        favorite_foods: ['عدس'],
      },
      training: [{
        weekday: 2,
        activity_type: 'strength',
        duration_minutes: 20,
        intensity: 'moderate',
      }],
      health: { medical_considerations: ['knee_sensitivity'], medications: ['x'], supplements: [] },
      cycleIndex: 2,
      now: new Date('2026-09-07T00:00:00Z'),
    })
    const prompt = profileSnapshotPromptContext(snapshot)
    expect(prompt.goal).toMatchObject({ goal_type: 'fat_loss', target_weight_kg: 66 })
    expect(JSON.stringify(prompt)).not.toMatch(/goal-/i)
    expect(JSON.stringify(prompt)).not.toMatch(/@|email|display_name/i)
    expect(snapshot.age_years).toBe(31)
    expect(snapshot.safety.medications_present).toBe(true)
    expect(snapshot.dietary.allergies).toContain('شیر')
  })

  it('normalizes tokens without double-counting cache or reasoning', () => {
    const normalized = normalizeProviderUsage({
      inputTokens: 12_000,
      cachedInputTokens: 4_000,
      outputTokens: 6_000,
      reasoningTokens: 1_500,
    })
    expect(normalized.uncachedInputTokens).toBe(8_000)
    expect(normalized.outputTokens).toBe(6_000)
    const cost = calculateProviderCost({
      modelId: 'gpt-5.6-terra',
      usage: normalized,
    })
    // 8k * 2/M + 4k * 0.2/M + 6k * 12/M = 0.016 + 0.0008 + 0.072 = 0.0888
    expect(cost.usd).toBeCloseTo(0.0888, 6)
    expect(cost.certainty).toBe('estimated')
    expect(cost.notes.some((note) => note.includes('Reasoning'))).toBe(true)
    expect(normalizeProviderUsage({ usageKnown: false }).uncachedInputTokens).toBeNull()
    expect(calculateProviderCost({
      modelId: 'gpt-5.6-terra',
      usage: normalizeProviderUsage({ usageKnown: false }),
    }).certainty).toBe('unknown')
    expect(STANDARD_RATES['gpt-5.6-luna']?.outputPerMillion).toBe(1.2)
    expect(costPerDeliveredPlan(0.96, 10)).toBeCloseTo(0.096)
  })

  it('expands compact plans into a valid full monthly contract', () => {
    const catalog = createPlanCatalogSnapshot(catalogRows())
    const expanded = stripExpansionMetadata(expandCompactPlan(compactFixture('en-US'), catalog, 'en-US'))
    expect(Array.isArray(expanded.days) && expanded.days).toHaveLength(30)
    const first = (expanded.days as Array<Record<string, unknown>>)[0]
    const meal = (first.meals as Array<Record<string, unknown>>)[0]
    const option = (meal.options as Array<Record<string, unknown>>)[0]
    expect(option.title).toBe('Banana almonds')
    expect((option.nutrition as Record<string, unknown>).source).toBe('catalog_reference')
    assertGeneratedPlan(expanded, MONTHLY_PLAN_DAYS, 'en-US', { catalog, minimumCalories: 1_200 })
  })

  it('rejects unknown compact references and incomplete day coverage', () => {
    const catalog = createPlanCatalogSnapshot(catalogRows())
    const bad = compactFixture()
    ;(bad.days[0] as { meal_def_ids: string[] }).meal_def_ids = ['missing']
    expect(() => expandCompactPlan(bad, catalog, 'en-US')).toThrow(/Unknown meal|COMPACT_UNKNOWN_REF/)
    const short = compactFixture()
    short.days = short.days.slice(0, 10)
    expect(() => expandCompactPlan(short, catalog, 'en-US')).toThrow(/30/)
  })

  it('filters catalog subsets without relaxing allergen hard constraints', () => {
    const catalog = createPlanCatalogSnapshot({
      ...catalogRows(),
      ingredientAllergens: [{
        ingredient_id: 'ingredient:almonds@v2',
        allergen_id: 'allergen:milk@v2',
      }],
    })
    const snapshot = buildGenerationProfileSnapshot({
      profile: { locale: 'en-US', product_region: 'intl', timezone: 'UTC' },
      dietary: {
        allergies: ['dairy'],
        available_equipment: ['bodyweight'],
        budget_tier: 'low',
      },
      cycleIndex: 1,
    })
    const declared = new Set(['allergen:milk@v2'])
    const subset = selectCatalogSubset({ catalog, snapshot, declaredAllergenIds: declared })
    expect(subset.food_ids).not.toContain('food:banana-almonds@v2')
    expect(subset.food_ids.length).toBeGreaterThan(0)
  })

  it('records chargeable failed attempts with unknown usage left unknown', () => {
    const attempt = buildAttemptLedger({
      generationJobId: 'job-1',
      cycleIndex: 1,
      attemptId: 'attempt-1',
      attemptNumber: 1,
      model: 'gpt-5.6-terra',
      promptVersion: 'v',
      schemaVersion: '1.0.0',
      catalogReleaseId: 'momentum-core@v2',
      usage: { usageKnown: false },
      providerResponseId: null,
      latencyMs: null,
      outcome: 'validation_failed',
      validationFailureCategory: 'schema',
      reservationConsumed: true,
      deliverySucceeded: false,
    })
    expect(attempt.cost_certainty).toBe('unknown')
    expect(attempt.cost_microusd).toBeNull()
    expect(attempt.delivery_succeeded).toBe(false)
    expect(attempt.reservation_consumed).toBe(true)
  })

  it('keeps Terra as default and gates Luna/async behind flags', () => {
    vi.stubGlobal('Deno', {
      env: { get: () => undefined },
    })
    const route = resolvePlanModelRoute({ cycleIndex: 1, isRenewal: false })
    expect(route.route).toBe('terra')
    expect(route.modelId).toContain('terra')
    expect(resolveAsyncServiceTier(false)).toBe('standard')
    vi.unstubAllGlobals()
  })

  it('applies deterministic nutrition repair and revalidates', () => {
    const catalog = createPlanCatalogSnapshot(catalogRows())
    const plan = stripExpansionMetadata(expandCompactPlan(compactFixture(), catalog, 'en-US'))
    const day0 = (plan.days as Array<Record<string, unknown>>)[0]
    const meal0 = (day0.meals as Array<Record<string, unknown>>)[0]
    const option0 = (meal0.options as Array<Record<string, unknown>>)[0]
    option0.nutrition = {
      calories: 10,
      protein_g: 90,
      carbs_g: 90,
      fat_g: 90,
      fiber_g: 1,
      confidence: 'low',
      source: 'model_estimate',
    }
    const decision = classifyRepair({
      errorCode: 'nutrition_mismatch',
      hasSavedValidResponse: false,
      attemptCount: 1,
      maxAttempts: 3,
    })
    expect(decision.kind).toBe('recalculate_nutrition')
    const repaired = applyDeterministicRepair({
      plan,
      catalog,
      locale: 'en-US',
      declaredAllergenIds: new Set(),
      decision,
    })
    const fixed = (((repaired.days as Array<Record<string, unknown>>)[0]
      .meals as Array<Record<string, unknown>>)[0]
      .options as Array<Record<string, unknown>>)[0]
      .nutrition as Record<string, unknown>
    expect(fixed.source).toBe('catalog_reference')
    expect(fixed.calories).toBe(400)
  })
})
