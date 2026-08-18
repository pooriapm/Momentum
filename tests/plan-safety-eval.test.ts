import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deterministicSafetyDecision } from '../supabase/functions/_shared/ai-safety.ts'
import { HttpError } from '../supabase/functions/_shared/http.ts'
import { enforceAiCircuitBreaker } from '../supabase/functions/_shared/limits.ts'
import { MONTHLY_PLAN_DAYS } from '../supabase/functions/_shared/plan-provider.ts'
import {
  createPlanCatalogSnapshot,
  resolveDeclaredAllergenIds,
  type PlanCatalogRows,
} from '../supabase/functions/_shared/plan-catalog.ts'
import { assertGeneratedPlan } from '../supabase/functions/_shared/plan-contract.ts'
import {
  generateMonthlyPlanFromProvider,
} from '../supabase/functions/_shared/plan-provider.ts'

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/plans')

function loadPlanFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8')) as Record<string, unknown>
}

function stubEnv(extra: Record<string, string | undefined> = {}) {
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) => {
        const values: Record<string, string | undefined> = {
          AI_MASTER_ENABLED: 'true',
          AI_PLAN_ENABLED: 'true',
          ...extra,
        }
        return values[name]
      },
    },
  })
}

function evalCatalogRows(options: { almondMilk?: boolean } = {}): PlanCatalogRows {
  return {
    releases: [{ id: 'momentum-core@v2' }],
    allergens: [{
      id: 'allergen:milk@v2',
      slug: 'milk',
      name_en: 'Milk',
      name_fa: 'شیر',
      aliases: ['dairy'],
    }],
    ingredients: [
      ['ingredient:brown-rice@v2', 'Rice', 'برنج', 'g'],
      ['ingredient:chicken-breast@v2', 'Chicken', 'مرغ', 'g'],
      ['ingredient:olive-oil@v2', 'Olive oil', 'روغن زیتون', 'tsp'],
      ['ingredient:banana@v2', 'Banana', 'موز', 'piece'],
      ['ingredient:red-lentils@v2', 'Lentils', 'عدس', 'g'],
      ['ingredient:spinach@v2', 'Spinach', 'اسفناج', 'g'],
      ['ingredient:almonds@v2', 'Almonds', 'بادام', 'g'],
    ].map(([id, name_en, name_fa, default_unit]) => ({ id, name_en, name_fa, default_unit })),
    ingredientAllergens: options.almondMilk
      ? [{ ingredient_id: 'ingredient:almonds@v2', allergen_id: 'allergen:milk@v2' }]
      : [],
    foods: [
      {
        id: 'food:banana-almonds@v2', name_en: 'Banana almonds', name_fa: 'موز و بادام',
        meal_types: ['breakfast', 'morning_snack', 'afternoon_snack'], portable: true,
        calories: 400, protein_g: 10, carbs_g: 75, fat_g: 6, fiber_g: 8,
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
      ['food:banana-almonds@v2', 'ingredient:banana@v2'],
      ['food:banana-almonds@v2', 'ingredient:almonds@v2'],
      ['food:chicken-rice-bowl@v2', 'ingredient:brown-rice@v2'],
      ['food:chicken-rice-bowl@v2', 'ingredient:chicken-breast@v2'],
      ['food:chicken-rice-bowl@v2', 'ingredient:olive-oil@v2'],
      ['food:chicken-rice-bowl@v2', 'ingredient:spinach@v2'],
      ['food:lentil-stew-rice@v2', 'ingredient:brown-rice@v2'],
      ['food:lentil-stew-rice@v2', 'ingredient:red-lentils@v2'],
      ['food:lentil-stew-rice@v2', 'ingredient:olive-oil@v2'],
      ['food:lentil-stew-rice@v2', 'ingredient:spinach@v2'],
    ].map(([food_id, ingredient_id]) => ({ food_id, ingredient_id })),
    equipment: [{ id: 'equipment:bodyweight@v2' }, { id: 'equipment:wall@v2' }],
    exercises: [
      ['exercise:bodyweight-squat@v2', 'Squat', 'اسکوات'],
      ['exercise:wall-pushup@v2', 'Wall push-up', 'شنا دیوار'],
      ['exercise:glute-bridge@v2', 'Glute bridge', 'پل باسن'],
    ].map(([id, name_en, name_fa]) => ({ id, name_en, name_fa })),
    exerciseEquipment: [
      { exercise_id: 'exercise:bodyweight-squat@v2', equipment_id: 'equipment:bodyweight@v2' },
      { exercise_id: 'exercise:wall-pushup@v2', equipment_id: 'equipment:bodyweight@v2' },
      { exercise_id: 'exercise:wall-pushup@v2', equipment_id: 'equipment:wall@v2' },
      { exercise_id: 'exercise:glute-bridge@v2', equipment_id: 'equipment:bodyweight@v2' },
    ],
    substitutions: [
      { exercise_id: 'exercise:bodyweight-squat@v2', substitute_exercise_id: 'exercise:glute-bridge@v2' },
      { exercise_id: 'exercise:glute-bridge@v2', substitute_exercise_id: 'exercise:bodyweight-squat@v2' },
    ],
  }
}

function forbidLiveHttp() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('live HTTP is forbidden in plan safety evals')
  })
}

beforeEach(() => {
  stubEnv()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('plan safety and quality evals', () => {
  it('accepts deterministic FA and EN stub fixtures against the catalog contract', () => {
    const catalog = createPlanCatalogSnapshot(evalCatalogRows())
    const fa = loadPlanFixture('valid-fa-stub.json')
    const en = loadPlanFixture('valid-en-stub.json')
    expect(fa.content_locale).toBe('fa-IR')
    expect(en.content_locale).toBe('en-US')
    expect(() => assertGeneratedPlan(fa, MONTHLY_PLAN_DAYS, 'fa-IR', { catalog })).not.toThrow()
    expect(() => assertGeneratedPlan(en, MONTHLY_PLAN_DAYS, 'en-US', { catalog })).not.toThrow()
    expect(deterministicSafetyDecision(JSON.stringify(fa))).toBeNull()
    expect(deterministicSafetyDecision(JSON.stringify(en))).toBeNull()
  })

  it('fails closed on unknown catalog IDs and safety-denial text in the invalid fixture', () => {
    const catalog = createPlanCatalogSnapshot(evalCatalogRows())
    const unsafe = loadPlanFixture('unsafe-invalid-sample.json')
    expect(() => assertGeneratedPlan(unsafe, MONTHLY_PLAN_DAYS, 'en-US', { catalog }))
      .toThrow(expect.objectContaining({ code: 'unknown_catalog_id' }))
    expect(deterministicSafetyDecision(JSON.stringify(unsafe))).toMatchObject({
      allowed: false,
      reason: 'prompt_injection',
      source: 'deterministic',
    })
  })

  it('fails closed when FA or EN fixtures leak a declared allergen', () => {
    const catalog = createPlanCatalogSnapshot(evalCatalogRows({ almondMilk: true }))
    const cases = [
      ['valid-fa-stub.json', 'fa-IR', 'شیر'],
      ['valid-en-stub.json', 'en-US', 'dairy'],
    ] as const
    for (const [file, locale, allergy] of cases) {
      const plan = loadPlanFixture(file)
      const declaredAllergenIds = resolveDeclaredAllergenIds(catalog, [allergy])
      expect(() => assertGeneratedPlan(plan, MONTHLY_PLAN_DAYS, locale, {
        catalog,
        declaredAllergenIds,
      })).toThrow(expect.objectContaining({ code: 'allergen_in_generated_plan' }))
    }
  })

  it('never issues live HTTP from the stub provider, including when live OpenAI is requested', async () => {
    const fetchSpy = forbidLiveHttp()
    const catalog = createPlanCatalogSnapshot(evalCatalogRows())
    await expect(generateMonthlyPlanFromProvider({ catalog, locale: 'fa-IR' }))
      .resolves.toMatchObject({ model: 'stub:momentum-monthly@1' })
    await expect(generateMonthlyPlanFromProvider({ catalog, locale: 'en-US' }))
      .resolves.toMatchObject({ model: 'stub:momentum-monthly@1' })

    stubEnv({
      AI_PLAN_PROVIDER: 'openai',
      AI_PLAN_LIVE_OPENAI: 'true',
      OPENAI_API_KEY: 'test-key',
    })
    await expect(generateMonthlyPlanFromProvider({ catalog, locale: 'en-US' }))
      .rejects.toMatchObject({ code: 'LIVE_OPENAI_DISABLED' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails closed on an open or unavailable circuit breaker without calling OpenAI', async () => {
    const fetchSpy = forbidLiveHttp()
    const open = {
      rpc: vi.fn(async () => ({ data: false, error: null })),
    }
    await expect(enforceAiCircuitBreaker(open as never))
      .rejects.toMatchObject({ code: 'ai_circuit_open', status: 503 })
    expect(open.rpc).toHaveBeenCalledWith(
      'consume_ai_circuit_breaker',
      expect.objectContaining({ p_limit: 1_000, p_window_seconds: 86_400 }),
    )

    const unavailable = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'circuit unavailable' } })),
    }
    await expect(enforceAiCircuitBreaker(unavailable as never))
      .rejects.toMatchObject({ code: 'ai_circuit_breaker_unavailable', status: 503 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('maps catalog and allergen validator failures onto PLAN_VALIDATION_FAILED', () => {
    const catalog = createPlanCatalogSnapshot(evalCatalogRows({ almondMilk: true }))
    const unsafe = loadPlanFixture('unsafe-invalid-sample.json')
    const leak = loadPlanFixture('valid-en-stub.json')
    const failures = [
      () => assertGeneratedPlan(unsafe, MONTHLY_PLAN_DAYS, 'en-US', { catalog }),
      () => assertGeneratedPlan(leak, MONTHLY_PLAN_DAYS, 'en-US', {
        catalog,
        declaredAllergenIds: resolveDeclaredAllergenIds(catalog, ['milk']),
      }),
    ]
    for (const run of failures) {
      try {
        run()
        throw new Error('expected validator failure')
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError)
        const code = (error as HttpError).code
        expect(
          code === 'unknown_catalog_id' ||
          code === 'allergen_in_generated_plan',
        ).toBe(true)
      }
    }
  })
})
