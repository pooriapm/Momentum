import { describe, expect, it } from 'vitest'
import { recalibratePlan } from '../supabase/functions/_shared/plan-recalibration.ts'

function sourcePlan() {
  return {
    content_locale: 'en-US',
    summary: 'Original',
    days: Array.from({ length: 3 }, (_, day_index) => ({
      day_index,
      target_strategy: { mode: 'training_day', rationale: 'Original' },
      workout: {
        duration_minutes: 40,
        intensity: 'moderate',
        exercises: [{
          exercise_id: 'exercise:bodyweight-squat@v1',
          sets: 3,
          rest_seconds: 60,
        }],
      },
    })),
  }
}

describe('deterministic plan recalibration', () => {
  it('creates a deload diff from a multi-day low-recovery trend without changing IDs', () => {
    const result = recalibratePlan(sourcePlan(), {
      dailyCount: 5,
      averageAdherence: 72,
      averageRecovery: 2.4,
      averagePain: 4,
      weeklyRecovery: 'worse',
      weeklyTraining: 'harder',
      weeklyPain: 'worse',
      circumstancesChanged: false,
      conditionChange: 'none',
      changeNotes: null,
    }, 'en-US')
    const day = (result.content.days as Array<Record<string, unknown>>)[0]
    const workout = day?.workout as Record<string, unknown>
    const exercise = (workout.exercises as Array<Record<string, unknown>>)[0]

    expect(result.diff.mode).toBe('deload')
    expect(workout.duration_minutes).toBe(34)
    expect(workout.intensity).toBe('low')
    expect(exercise?.sets).toBe(2)
    expect(exercise?.rest_seconds).toBe(75)
    expect(exercise?.exercise_id).toBe('exercise:bodyweight-squat@v1')
    expect(sourcePlan().days[0]?.workout.duration_minutes).toBe(40)
  })

  it('progresses modestly only with sustained adherence and recovery', () => {
    const result = recalibratePlan(sourcePlan(), {
      dailyCount: 7,
      averageAdherence: 90,
      averageRecovery: 4.3,
      averagePain: 1,
      weeklyRecovery: 'stable',
      weeklyTraining: 'same',
      weeklyPain: 'no_pain',
      circumstancesChanged: false,
      conditionChange: 'none',
      changeNotes: null,
    }, 'fa-IR')
    const day = (result.content.days as Array<Record<string, unknown>>)[0]
    const workout = day?.workout as Record<string, unknown>
    const exercise = (workout.exercises as Array<Record<string, unknown>>)[0]

    expect(result.diff.mode).toBe('progression')
    expect(workout.duration_minutes).toBe(45)
    expect(exercise?.sets).toBe(4)
    expect(result.changeReason.rationale).toContain('ریکاوری')
  })

  it('requires a multi-day trend or weekly check-in', () => {
    expect(() => recalibratePlan(sourcePlan(), {
      dailyCount: 2,
      averageAdherence: 80,
      averageRecovery: 4,
      averagePain: 0,
      weeklyRecovery: null,
      weeklyTraining: null,
      weeklyPain: null,
      circumstancesChanged: false,
      conditionChange: null,
      changeNotes: null,
    }, 'en-US')).toThrow(expect.objectContaining({ code: 'insufficient_recalibration_trend' }))
  })

  it('routes medical or injury changes to human review', () => {
    expect(() => recalibratePlan(sourcePlan(), {
      dailyCount: 7,
      averageAdherence: 80,
      averageRecovery: 3,
      averagePain: 3,
      weeklyRecovery: 'stable',
      weeklyTraining: 'same',
      weeklyPain: 'stable',
      circumstancesChanged: true,
      conditionChange: 'medication_change',
      changeNotes: 'Changed this week',
    }, 'en-US')).toThrow(expect.objectContaining({ code: 'clinical_review_required' }))
  })
})
