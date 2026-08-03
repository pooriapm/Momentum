import { describe, expect, it } from 'vitest'
import { calendarIso, calendarParts, formatLocalizedDate, monthGrid } from './localized-date'

describe('localized date contract', () => {
  it('displays Persian dates as Jalali while preserving Gregorian ISO storage', () => {
    expect(calendarParts('2026-10-10', 'fa')).toEqual({ year: 1405, month: 7, day: 18 })
    expect(calendarIso(1405, 7, 18, 'fa')).toBe('2026-10-10')
    expect(formatLocalizedDate('2026-10-10', 'fa')).toBe('۱۸ مهر ۱۴۰۵')
  })

  it('displays English dates as Gregorian', () => {
    expect(calendarParts('2026-10-10', 'en')).toEqual({ year: 2026, month: 10, day: 10 })
    expect(calendarIso(2026, 10, 10, 'en')).toBe('2026-10-10')
    expect(formatLocalizedDate('2026-10-10', 'en')).toBe('October 10, 2026')
  })

  it('builds complete locale-specific month grids', () => {
    expect(monthGrid(1405, 7, 'fa').some((cell) => cell.isoDate === '2026-10-10')).toBe(true)
    expect(monthGrid(2026, 10, 'en')).toHaveLength(42)
  })
})
