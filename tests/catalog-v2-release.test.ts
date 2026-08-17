import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const v1Sql = readFileSync(
  resolve(root, 'supabase/migrations/202608090001_governed_food_exercise_catalog.sql'),
  'utf8',
)
const v2Sql = readFileSync(
  resolve(root, 'supabase/migrations/202608180100_momentum_core_catalog_v2.sql'),
  'utf8',
)

const D11_ALLERGENS = [
  'milk',
  'egg',
  'peanut',
  'tree_nut',
  'wheat',
  'soy',
  'fish',
  'shellfish',
  'sesame',
] as const

const MEAL_FAMILIES = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'pre_sleep',
] as const

const MOVEMENT_FAMILIES = [
  'squat',
  'hinge',
  'push',
  'pull',
  'carry',
  'locomotion',
  'mobility',
] as const

function quotedIds(sql: string, kind: 'food' | 'exercise' | 'allergen' | 'ingredient' | 'equipment') {
  return new Set(
    [...sql.matchAll(new RegExp(`'(${kind}:[a-z0-9._-]+@v[1-9][0-9]*)'`, 'g'))].map((match) => match[1]),
  )
}

describe('momentum-core@v2 generation catalog', () => {
  it('retires the v1 test seed and activates v2 as the generation gate', () => {
    expect(v1Sql).toContain("values ('momentum-core@v1', 1, 'active'")
    expect(v2Sql).toMatch(/update public\.catalog_releases[\s\S]*status = 'retired'[\s\S]*momentum-core@v1/)
    expect(v2Sql).toContain("values ('momentum-core@v2', 2, 'active'")
    expect(v2Sql).not.toMatch(/allergen:other@v2/)
  })

  it('has required D11 allergen, meal and movement families and is distinct from v1', () => {
    const v2Foods = quotedIds(v2Sql, 'food')
    const v2Exercises = quotedIds(v2Sql, 'exercise')
    const v2Allergens = quotedIds(v2Sql, 'allergen')
    const v2Ingredients = quotedIds(v2Sql, 'ingredient')

    expect(v2Foods.size).toBeGreaterThanOrEqual(40)
    expect(v2Exercises.size).toBeGreaterThanOrEqual(20)
    expect(v2Ingredients.size).toBeGreaterThanOrEqual(20)
    expect(v2Sql).toMatch(/insert into public\.food_catalog[\s\S]*, true\)/)

    for (const slug of D11_ALLERGENS) {
      expect(v2Allergens.has(`allergen:${slug}@v2`)).toBe(true)
      expect(v2Sql).toContain(`'allergen:${slug}@v2'`)
    }
    for (const meal of MEAL_FAMILIES) {
      expect(v2Sql).toContain(`'${meal}'`)
    }
    for (const pattern of MOVEMENT_FAMILIES) {
      expect(v2Sql).toContain(`'${pattern}'`)
    }

    expect(quotedIds(v1Sql, 'food').size).toBe(3)
    expect(quotedIds(v1Sql, 'exercise').size).toBe(4)
    expect([...quotedIds(v1Sql, 'food')].some((id) => v2Foods.has(id))).toBe(false)
    expect([...quotedIds(v1Sql, 'exercise')].some((id) => v2Exercises.has(id))).toBe(false)
    expect([...quotedIds(v1Sql, 'allergen')].some((id) => v2Allergens.has(id))).toBe(false)
  })
})
