import { describe, expect, it } from 'vitest'
import { createPreviewWorkoutSession, workoutSessionSchema } from './workout'
import type { WorkoutBlock } from './types'

const workout: WorkoutBlock = {
  id: 'plan-day-0', name: { fa: 'قدرت', en: 'Strength' }, focus: { fa: 'پا', en: 'Legs' },
  durationMinutes: 30, exercises: 1, exerciseItems: [{ fa: 'اسکوات', en: 'Squat' }], intensity: 'moderate',
  exerciseDetails: [{ key: 'squat', name: { fa: 'اسکوات', en: 'Squat' }, sets: 3, reps: '8', restSeconds: 90, substitution: null }],
}

describe('workout execution contract', () => {
  it('creates an in-memory preview with one row per planned set', () => {
    const session = createPreviewWorkoutSession(workout, '2026-08-09')
    expect(session.status).toBe('in_progress')
    expect(session.exercises[0].sets).toHaveLength(3)
    expect(session.exercises[0].sets[2].rest_seconds).toBe(90)
  })

  it('rejects out-of-range RPE values from the server contract', () => {
    const session = createPreviewWorkoutSession(workout, '2026-08-09')
    session.exercises[0].sets[0].rpe = 11
    expect(workoutSessionSchema.safeParse(session).success).toBe(false)
  })
})

