import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogSubsetPromptContext, selectCatalogSubset } from '../supabase/functions/_shared/catalog-subset.ts'
import {
  availableEquipmentSlugs,
  EXERCISE_REF_PATTERN,
  normalizePlanWorkouts,
  resolveExerciseId,
  withExerciseRefs,
} from '../supabase/functions/_shared/exercise-selection.ts'
import { buildGenerationProfileSnapshot } from '../supabase/functions/_shared/generation-profile-snapshot.ts'
import { createPlanCatalogSnapshot, type PlanCatalogRows } from '../supabase/functions/_shared/plan-catalog.ts'
import { generatedPlanJsonSchema } from '../supabase/functions/_shared/plan-contract.ts'

const root = resolve(import.meta.dirname, '..')

const exerciseRows: Array<[string, string, string[]]> = [
  ['bodyweight-squat', 'squat', ['bodyweight']],
  ['wall-pushup', 'push', ['wall', 'bodyweight']],
  ['goblet-squat', 'squat', ['dumbbells']],
  ['band-row', 'pull', ['resistance-band']],
  ['barbell-bench-press', 'push', ['barbell', 'bench']],
  ['lat-pulldown', 'pull', ['machine']],
  ['jump-rope', 'locomotion', ['jump-rope']],
]

function catalogRows(): PlanCatalogRows {
  const equipment = [...new Set(exerciseRows.flatMap(([, , eq]) => eq))]
  return {
    releases: [{ id: 'momentum-core@v2' }],
    allergens: [],
    ingredients: [{ id: 'ingredient:oats@v2', name_en: 'Oats', name_fa: 'جو', default_unit: 'g' }],
    ingredientAllergens: [],
    foods: ['breakfast', 'lunch', 'dinner'].map((meal) => ({
      id: `food:${meal}-oats@v2`, name_en: 'Oats', name_fa: 'جو', meal_types: [meal],
      portable: false, calories: 500, protein_g: 20, carbs_g: 80, fat_g: 10, fiber_g: 8,
    })),
    foodIngredients: ['breakfast', 'lunch', 'dinner'].map((meal) => ({
      food_id: `food:${meal}-oats@v2`, ingredient_id: 'ingredient:oats@v2', amount: 80, unit: 'g',
    })),
    equipment: equipment.map((slug) => ({ id: `equipment:${slug}@v2` })),
    exercises: exerciseRows.map(([slug, movement]) => ({
      id: `exercise:${slug}@v2`, name_en: slug, name_fa: `fa-${slug}`, movement_pattern: movement,
    })),
    exerciseEquipment: exerciseRows.flatMap(([slug, , eq]) =>
      eq.map((item) => ({ exercise_id: `exercise:${slug}@v2`, equipment_id: `equipment:${item}@v2` }))
    ),
    substitutions: [
      { exercise_id: 'exercise:goblet-squat@v2', substitute_exercise_id: 'exercise:bodyweight-squat@v2' },
    ],
  }
}

function snapshotFor(location: string | null, equipment: string[]) {
  return buildGenerationProfileSnapshot({
    profile: { locale: 'fa-IR', product_region: 'ir', timezone: 'Asia/Tehran' },
    dietary: { available_equipment: equipment, training_location: location },
    cycleIndex: 1,
  })
}

describe('exercise library selection', () => {
  const catalog = createPlanCatalogSnapshot(catalogRows())

  it('resolves short and full exercise ids only when the catalog has them', () => {
    expect(resolveExerciseId(catalog, 'barbell-bench-press')).toBe('exercise:barbell-bench-press@v2')
    expect(resolveExerciseId(catalog, 'exercise:barbell-bench-press@v2')).toBe('exercise:barbell-bench-press@v2')
    expect(resolveExerciseId(catalog, 'exercise:barbell-bench-press@v1')).toBe('exercise:barbell-bench-press@v2')
    expect(resolveExerciseId(catalog, 'barbell-bench')).toBeNull()
    expect(resolveExerciseId(catalog, 'پرس سینه')).toBeNull()
    expect(resolveExerciseId(catalog, 42)).toBeNull()
  })

  it('filters exercises by training location and Persian equipment text', () => {
    expect(availableEquipmentSlugs(catalog, snapshotFor('gym', []))).toBeNull()
    expect(availableEquipmentSlugs(catalog, snapshotFor(null, []))).toBeNull()

    const home = selectCatalogSubset({
      catalog,
      snapshot: snapshotFor('home', ['دمبل و کش‌مقاومتی']),
      declaredAllergenIds: new Set(),
    })
    expect(home.exercise_ids.sort()).toEqual([
      'exercise:band-row@v2',
      'exercise:bodyweight-squat@v2',
      'exercise:goblet-squat@v2',
      'exercise:wall-pushup@v2',
    ])

    const outdoor = selectCatalogSubset({
      catalog,
      snapshot: snapshotFor('outdoor', []),
      declaredAllergenIds: new Set(),
    })
    expect(outdoor.exercise_ids).toContain('exercise:jump-rope@v2')
    expect(outdoor.exercise_ids).not.toContain('exercise:barbell-bench-press@v2')

    const gym = selectCatalogSubset({
      catalog,
      snapshot: snapshotFor('gym', []),
      declaredAllergenIds: new Set(),
    })
    expect(gym.exercise_ids).toHaveLength(exerciseRows.length)
  })

  it('sends the model one compact row per allowed exercise', () => {
    const subset = selectCatalogSubset({
      catalog,
      snapshot: snapshotFor('home', ['dumbbells']),
      declaredAllergenIds: new Set(),
    })
    const prompt = catalogSubsetPromptContext(subset, catalog)
    expect(prompt.exercise_columns).toEqual(['id', 'movement', 'equipment', 'substitutes'])
    expect(prompt.exercises).toContainEqual(['goblet-squat', 'squat', 'dumbbells', 'bodyweight-squat'])
    expect(JSON.stringify(prompt.exercises)).not.toMatch(/barbell|lat-pulldown/)
  })

  it('drops unknown exercises from a full-schema plan and keys rows by library id', () => {
    const row = {
      exercise_key: 'w-0', name: 'wrong', sets: 3, reps: '8-10', rest_seconds: 90,
      equipment: ['x'], equipment_ids: [], intensity_note: null, substitution: null,
      substitution_exercise_id: null,
    }
    const plan = {
      days: [{
        workout: {
          exercises: [
            { ...row, exercise_id: 'exercise:invented@v2' },
            { ...row, exercise_id: 'exercise:barbell-bench-press@v2' },
            { ...row, exercise_id: 'goblet-squat', substitution_exercise_id: 'exercise:bodyweight-squat@v2' },
          ],
        },
      }, { workout: null }],
    }
    normalizePlanWorkouts(plan, catalog, 'fa-IR')
    expect(plan.days[0]!.workout!.exercises).toEqual([
      expect.objectContaining({
        exercise_id: 'exercise:barbell-bench-press@v2',
        exercise_key: 'barbell-bench-press',
        name: 'fa-barbell-bench-press',
        equipment_ids: ['equipment:barbell@v2', 'equipment:bench@v2'],
        sets: 3,
        reps: '8-10',
        rest_seconds: 90,
      }),
      expect.objectContaining({
        exercise_id: 'exercise:goblet-squat@v2',
        exercise_key: 'goblet-squat',
        substitution: 'fa-bodyweight-squat',
      }),
    ])
  })

  it('lets only the provider schema accept short ids; imports stay strict', () => {
    const relaxed = JSON.stringify(withExerciseRefs(generatedPlanJsonSchema))
    expect(relaxed).toContain(JSON.stringify(EXERCISE_REF_PATTERN))
    expect(relaxed).not.toContain('"^exercise:[a-z0-9._-]+@v[1-9][0-9]*$"')
    expect(JSON.stringify(generatedPlanJsonSchema)).toContain('"^exercise:[a-z0-9._-]+@v[1-9][0-9]*$"')
  })
})

describe('generated exercise library migration', () => {
  const migrations = readdirSync(resolve(root, 'supabase/migrations'))
  const name = migrations.find((file) => file.endsWith('_exercise_library_catalog.sql'))!
  const sql = readFileSync(resolve(root, 'supabase/migrations', name), 'utf8')
  const v2Sql = readFileSync(
    resolve(root, 'supabase/migrations/202608180100_momentum_core_catalog_v2.sql'),
    'utf8',
  )

  it('imports every library exercise with equipment the v2 catalog defines', () => {
    const ids = [...sql.matchAll(/^ {2}\('exercise:([a-z0-9-]+)@v2'/gm)].map((match) => match[1])
    expect(ids.length).toBeGreaterThanOrEqual(316)
    expect(new Set(ids).size).toBe(ids.length)
    const v2Exercises = [...v2Sql.matchAll(/\('exercise:([a-z0-9-]+)@v2', 'momentum-core@v2'/g)]
      .map((match) => match[1])
    for (const slug of v2Exercises) expect(ids).toContain(slug)

    const equipment = new Set(
      [...`${v2Sql}\n${sql}`.matchAll(/\('equipment:([a-z0-9-]+)@v2', 'momentum-core@v2'/g)]
        .map((match) => match[1]),
    )
    const used = [...sql.matchAll(/array\[([^\]]*)\]::text\[\]/g)]
      .flatMap((match) => [...match[1]!.matchAll(/'([a-z0-9-]+)'/g)].map((item) => item[1]))
    expect(used.length).toBeGreaterThanOrEqual(316)
    for (const slug of used) expect(equipment.has(slug)).toBe(true)
  })

  it('never rewrites existing catalog rows', () => {
    expect(sql).not.toMatch(/on conflict \(id\) do update/i)
    expect(sql).not.toMatch(/update public\.exercise_catalog/i)
    expect(sql).toMatch(/where not exists \(\s*select 1 from public\.exercise_catalog existing/)
  })
})
