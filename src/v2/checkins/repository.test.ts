import { describe, expect, it } from 'vitest'
import { currentWeekStart } from './repository'

describe('profile-timezone weekly boundaries', () => {
  it('uses the profile timezone when UTC is already in the next day', () => {
    const instant = new Date('2026-08-23T21:00:00.000Z')
    expect(currentWeekStart('Asia/Tehran', instant)).toBe('2026-08-24')
    expect(currentWeekStart('America/Los_Angeles', instant)).toBe('2026-08-17')
  })

  it('returns Monday for Sunday in the profile timezone', () => {
    expect(currentWeekStart('UTC', new Date('2026-08-23T12:00:00.000Z'))).toBe('2026-08-17')
  })
})
