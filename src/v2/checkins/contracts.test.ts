import { describe, expect, it } from 'vitest'
import { dailyCheckInInputSchema, weeklyCheckInInputSchema } from './contracts'

describe('check-in contracts', () => {
  it('requires a pain location when pain is reported', () => {
    const result = dailyCheckInInputSchema.safeParse({
      energyScore: 3,
      hungerScore: 3,
      moodScore: 3,
      sleepMinutes: 420,
      painScore: 4,
      recoveryScore: 3,
      redFlags: [],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('pain_location_required')
  })

  it('accepts a complete safe daily check-in', () => {
    expect(dailyCheckInInputSchema.parse({
      energyScore: 4,
      hungerScore: 3,
      moodScore: 4,
      sleepMinutes: 455,
      painScore: 0,
      recoveryScore: 4,
      redFlags: [],
    }).painScore).toBe(0)
  })

  it('requires context when weekly conditions changed', () => {
    const result = weeklyCheckInInputSchema.safeParse({
      overallScore: 3,
      recoveryTrend: 'stable',
      trainingTrend: 'same',
      painTrend: 'worse',
      circumstancesChanged: true,
      conditionChange: 'injury_or_worsening_pain',
      redFlags: [],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('change_notes_required')
  })
})
