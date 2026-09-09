import { describe, expect, it } from 'vitest'
import { rubberband, sampleVelocity, shouldDismissSheet, stepSpring } from './sheet-motion'

describe('sheet gesture physics', () => {
  it('keeps tap-open motion monotonic and settles at the target', () => {
    let state = { position: 48, velocity: 0 }
    for (let frame = 0; frame < 90; frame++) {
      const next = stepSpring(state, 0, 1 / 60)
      expect(next.position).toBeGreaterThanOrEqual(0)
      expect(next.position).toBeLessThanOrEqual(state.position)
      state = next
    }
    expect(state.position).toBeCloseTo(0, 4)
  })

  it('preserves velocity when the target reverses mid-flight', () => {
    const state = { position: 120, velocity: 800 }
    expect(stepSpring(state, 0, 0)).toEqual(state)
    const next = stepSpring(state, 0, 0.001)
    expect(next.position).toBeGreaterThan(state.position)
    expect(next.velocity).toBeGreaterThan(0)
    let returning = next
    for (let frame = 0; frame < 90; frame++) returning = stepSpring(returning, 0, 1 / 60)
    expect(returning.position).toBeCloseTo(0, 4)
  })

  it('uses momentum for a short flick, but returns after an upward reversal', () => {
    expect(shouldDismissSheet(50, 900, 700)).toBe(true)
    expect(shouldDismissSheet(50, 0, 700)).toBe(false)
    expect(shouldDismissSheet(500, -300, 700)).toBe(false)
    expect(shouldDismissSheet(500, 0, 700)).toBe(true)
  })

  it('resists edges progressively and forgets velocity after a hold', () => {
    expect(rubberband(-100, 700)).toBeGreaterThan(-100)
    expect(Math.abs(rubberband(-200, 700))).toBeLessThan(2 * Math.abs(rubberband(-100, 700)))
    const samples = [{ y: 10, time: 0 }, { y: 60, time: 50 }]
    expect(sampleVelocity(samples, 50)).toBe(1000)
    expect(sampleVelocity(samples, 200)).toBe(0)
  })
})
