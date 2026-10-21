import { describe, expect, it } from 'vitest'
import { projectRestaurantGuide } from '../supabase/functions/_shared/restaurant-guide.ts'
import fs from 'node:fs'
import path from 'node:path'

const nutrition = {
  calories: 650,
  protein_g: 45,
  carbs_g: 75,
  fat_g: 19,
  fiber_g: 7,
  confidence: 'medium',
  source: 'model_estimate',
}

describe('restaurant guide projection', () => {
  it('passes a well-formed guide through unchanged', () => {
    const guide = [{ title: 'Grilled chicken', order_instructions: ['Ask for rice on the side'], estimated_nutrition: nutrition }]
    expect(projectRestaurantGuide(guide)).toEqual(guide)
  })

  it('returns an empty list for missing or non-array content', () => {
    expect(projectRestaurantGuide(undefined)).toEqual([])
    expect(projectRestaurantGuide(null)).toEqual([])
    expect(projectRestaurantGuide({ title: 'x' })).toEqual([])
  })

  it('skips malformed items and keeps valid ones', () => {
    const valid = { title: 'Kebab', order_instructions: ['Skip the butter'], estimated_nutrition: nutrition }
    const projected = projectRestaurantGuide([
      'not an object',
      null,
      [],
      { title: '', order_instructions: ['x'], estimated_nutrition: nutrition },
      { title: 'No instructions', order_instructions: 'x', estimated_nutrition: nutrition },
      { title: 'Empty instructions', order_instructions: [1, '  ', null], estimated_nutrition: nutrition },
      { title: 'No nutrition', order_instructions: ['x'] },
      { title: 'Bad calories', order_instructions: ['x'], estimated_nutrition: { ...nutrition, calories: '650' } },
      { title: 'Negative fat', order_instructions: ['x'], estimated_nutrition: { ...nutrition, fat_g: -1 } },
      { title: 'NaN protein', order_instructions: ['x'], estimated_nutrition: { ...nutrition, protein_g: Number.NaN } },
      valid,
    ])
    expect(projected).toEqual([valid])
  })

  it('caps string lengths and list sizes and drops unknown fields', () => {
    const projected = projectRestaurantGuide(Array.from({ length: 12 }, (_, index) => ({
      title: `  ${'t'.repeat(500)}  `,
      order_instructions: [...Array.from({ length: 12 }, () => 'i'.repeat(1000)), 42],
      estimated_nutrition: {
        calories: 500 + index,
        protein_g: 30,
        carbs_g: 40,
        fat_g: 10,
        fiber_g: 'lots',
        confidence: 'certain',
        source: 'guess',
        extra: true,
      },
      extra: '<script>',
    })))
    expect(projected).toHaveLength(8)
    expect(projected[0].title).toHaveLength(160)
    expect(projected[0].order_instructions).toHaveLength(8)
    expect(projected[0].order_instructions.every((item) => item.length === 300)).toBe(true)
    expect(projected[0].estimated_nutrition).toEqual({ calories: 500, protein_g: 30, carbs_g: 40, fat_g: 10 })
    expect(projected[0]).not.toHaveProperty('extra')
  })

  it('caps by characters, not UTF-16 units, for Persian text', () => {
    const [item] = projectRestaurantGuide([{
      title: 'کباب'.repeat(100),
      order_instructions: ['برنج کمتر'],
      estimated_nutrition: nutrition,
    }])
    expect(Array.from(item.title)).toHaveLength(160)
  })

  it('is wired into dashboard.plan next to water_today', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dirname, '../supabase/functions/account-data/index.ts'),
      'utf8',
    )
    expect(source).toContain('restaurant_guide: projectRestaurantGuide(content.restaurant_guide)')
    expect(source).toMatch(/water_today: \{\s*local_date: input\.localDate,/)
  })
})
