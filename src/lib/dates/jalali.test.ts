import { describe, expect, it } from 'vitest'
import {
  formatJalaliDate,
  fromJalali,
  getJalaliMonthGrid,
  getJalaliMonthLength,
  getJalaliWeekRange,
  isJalaliLeapYear,
  toJalali,
} from './jalali'

describe('Jalali date utilities', () => {
  it('converts between Gregorian ISO and Jalali dates', () => {
    expect(toJalali('2026-10-10')).toEqual({ jy: 1405, jm: 7, jd: 18 })
    expect(fromJalali(1405, 7, 18)).toBe('2026-10-10')
  })

  it('formats Persian dates and digits', () => {
    expect(formatJalaliDate('2026-10-10', 'long')).toBe('۱۸ مهر ۱۴۰۵')
    expect(formatJalaliDate('2026-10-10', 'numeric')).toBe('۱۴۰۵/۰۷/۱۸')
  })

  it('handles leap Esfand correctly', () => {
    expect(isJalaliLeapYear(1399)).toBe(true)
    expect(getJalaliMonthLength(1399, 12)).toBe(30)
    expect(getJalaliMonthLength(1400, 12)).toBe(29)
  })

  it('creates a Saturday-first month grid', () => {
    const grid = getJalaliMonthGrid(1405, 7)

    expect(grid.length % 7).toBe(0)
    expect(grid[0].weekdayIndex).toBe(0)
    expect(grid.filter((cell) => cell.isCurrentMonth)).toHaveLength(30)
    expect(grid.some((cell) => cell.isoDate === '2026-10-10')).toBe(true)
  })

  it('returns Saturday-to-Friday week ranges', () => {
    expect(getJalaliWeekRange('2026-10-10')).toEqual({
      start: '2026-10-10',
      end: '2026-10-16',
    })
  })
})
