import { describe, expect, it } from 'vitest'
import { accountSettingsUpdateSchema } from './contracts'

const valid = {
  displayName: 'Ava', sex: 'prefer_not_to_say' as const, heightCm: 170,
  locale: 'en-US' as const, unitSystem: 'metric' as const,
  goalType: 'fat_loss' as const, targetWeightKg: 65,
  dietaryPattern: 'omnivore', favoriteFoods: ['rice'], allergies: [],
  availableEquipment: ['dumbbells'], workSchedule: 'Weekdays',
  cuisineRegion: 'international' as const,
  schedule: [{ weekday: 1, activityType: 'strength' as const, localStartTime: '18:30', durationMinutes: 60 }],
}

describe('account settings contract', () => {
  it('accepts editable settings without eligibility or billing fields', () => {
    expect(accountSettingsUpdateSchema.parse(valid).targetWeightKg).toBe(65)
    expect('countryCode' in accountSettingsUpdateSchema.parse(valid)).toBe(false)
  })

  it('rejects duplicate schedule days', () => {
    const result = accountSettingsUpdateSchema.safeParse({ ...valid, schedule: [...valid.schedule, valid.schedule[0]] })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('duplicate_schedule_day')
  })

  it('requires a description for a custom goal', () => {
    expect(accountSettingsUpdateSchema.safeParse({ ...valid, goalType: 'custom' }).success).toBe(false)
  })
})
