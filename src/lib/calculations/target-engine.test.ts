import { describe, expect, it } from 'vitest'
import { calculateDynamicTargets } from './target-engine'

describe('dynamic target engine', () => {
  const defaults = {
    calories: 2000,
    protein: 130,
    carbs: 210,
    fat: 65,
    fiber: 28,
    waterMl: 2500,
  }

  it('applies strategy adjustments on top of plan defaults', () => {
    expect(
      calculateDynamicTargets(defaults, {
        type: 'training_day',
        calorieAdjustment: 250,
        proteinAdjustment: 20,
        carbAdjustment: 40,
      }),
    ).toMatchObject({
      calories: 2250,
      protein: 150,
      carbs: 250,
      fat: 65,
      fiber: 28,
      waterMl: 2500,
    })
  })

  it('keeps explicit manual overrides above strategy calculations', () => {
    expect(
      calculateDynamicTargets(
        defaults,
        {
          type: 'rest_day',
          calorieAdjustment: -200,
          carbAdjustment: -30,
        },
        {
          calories: 1900,
          protein: 145,
        },
      ),
    ).toMatchObject({
      calories: 1900,
      protein: 145,
      carbs: 180,
    })
  })
})
