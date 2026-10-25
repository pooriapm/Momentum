import { describe, expect, it } from 'vitest'
import { mealsRing, waterRing, workoutRing } from './orbit-rings'

describe('Today orbit rings', () => {
  it('counts logged meals against the planned ones', () => {
    expect(mealsRing(2, 4)).toEqual({ kind: 'value', done: 2, target: 4 })
    expect(mealsRing(0, 0)).toEqual({ kind: 'unknown' })
  })

  it('keeps an unloaded workout unknown instead of not started', () => {
    expect(workoutRing(true, 'idle', false)).toEqual({ kind: 'unknown' })
    expect(workoutRing(true, 'idle', true)).toEqual({ kind: 'value', done: 0, target: 1 })
    expect(workoutRing(true, 'completed', true)).toEqual({ kind: 'value', done: 1, target: 1 })
    expect(workoutRing(false, 'idle', false)).toEqual({ kind: 'rest' })
  })

  it('never invents a water target', () => {
    expect(waterRing(undefined, null)).toEqual({ kind: 'unknown' })
    expect(waterRing({ goalMl: 0, loggedMl: 0 }, 0)).toEqual({ kind: 'unknown' })
    expect(waterRing({ goalMl: 2200, loggedMl: 500 }, 750)).toEqual({ kind: 'value', done: 750, target: 2200 })
  })
})
