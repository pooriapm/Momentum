import { describe, expect, it } from 'vitest'
import { dateToIso, derivePlanSurface, startOfWeekIso, weekIsoDates } from './plan-state'

describe('plan-state helpers', () => {
  it('starts the FA week on Saturday and the EN week on Sunday', () => {
    expect(startOfWeekIso('2026-08-17', 'fa')).toBe('2026-08-15')
    expect(startOfWeekIso('2026-08-17', 'en')).toBe('2026-08-16')
    expect(weekIsoDates('2026-08-17', 'fa')[0]).toBe('2026-08-15')
    expect(weekIsoDates('2026-08-17', 'en')).toHaveLength(7)
  })

  it('keeps empty, loading, offline and error ahead of the ready plan', () => {
    const plan = { localDate: dateToIso(new Date()) } as never
    expect(derivePlanSurface({ plan: null, online: true, today: '2026-08-17', loading: true })).toBe('loading')
    expect(derivePlanSurface({ plan: null, online: true, today: '2026-08-17', loadError: true })).toBe('error')
    expect(derivePlanSurface({ plan: null, online: true, today: '2026-08-17' })).toBe('empty')
    expect(derivePlanSurface({ plan, online: false, today: '2026-08-17' })).toBe('offline')
  })
})
