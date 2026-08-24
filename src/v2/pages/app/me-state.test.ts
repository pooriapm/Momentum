import { describe, expect, it } from 'vitest'
import { demoPlan } from '../../data/demo'
import {
  deriveExportStatus,
  deriveMembershipStatus,
  defaultMePreferencesFor,
  isExportExpired,
  membershipCopy,
  productVersionCopy,
} from './me-state'
import {
  deriveProgressSurface,
  progressHasInsufficientData,
  resolveWeeklySeries,
} from './progress-state'

describe('Me membership and export derivation', () => {
  it('maps one-SKU membership states from the plan', () => {
    expect(deriveMembershipStatus(demoPlan)).toBe('active')
    expect(deriveMembershipStatus({ ...demoPlan, progress: { ...demoPlan.progress, entitlementStatus: 'gift' } })).toBe('gift')
    expect(deriveMembershipStatus({ ...demoPlan, progress: { ...demoPlan.progress, entitlementStatus: 'pending' } })).toBe('pending')
    expect(deriveMembershipStatus({ ...demoPlan, progress: { ...demoPlan.progress, entitlementStatus: 'expired' } })).toBe('expired')
    expect(deriveMembershipStatus(null)).toBe('none')
  })

  it('keeps a single Momentum membership label with no Core/Pro copy', () => {
    const copy = membershipCopy('active', 'en')
    expect(copy.label).toBe('Momentum membership')
    expect(copy.detail.toLowerCase()).not.toMatch(/core|pro|trial/)
    expect(productVersionCopy('ir', 'en')).toMatch(/Iran/)
    expect(productVersionCopy('intl', 'fa')).toMatch(/دلار/)
  })

  it('expires a ready export after the TTL', () => {
    expect(isExportExpired(1, 2, 1)).toBe(true)
    expect(deriveExportStatus({ status: 'ready', readyAt: 1, now: 2, ttlMs: 1 })).toBe('expired')
    expect(deriveExportStatus({ status: 'pending' })).toBe('pending')
  })

  it('uses locale-aware calendar and week defaults while keeping them independently overridable', () => {
    expect(defaultMePreferencesFor('fa')).toMatchObject({ calendar: 'jalali', weekStart: 'saturday' })
    expect(defaultMePreferencesFor('en')).toMatchObject({ calendar: 'gregorian', weekStart: 'monday' })
  })
})

describe('Progress surface derivation', () => {
  it('maps empty, offline, stale, loading, and error states', () => {
    const emptyPlan = { ...demoPlan, progress: { ...demoPlan.progress, weeklyAdherence: 0, recentCheckIns: [], weeklySeries: undefined } }
    expect(progressHasInsufficientData(emptyPlan)).toBe(true)
    expect(deriveProgressSurface({ plan: emptyPlan, online: true, today: '2026-08-17' })).toBe('empty')
    expect(deriveProgressSurface({ plan: demoPlan, online: false, today: demoPlan.localDate ?? '2026-08-17' })).toBe('offline')
    expect(deriveProgressSurface({ plan: { ...demoPlan, localDate: '2026-01-01' }, online: true, today: '2026-08-17' })).toBe('stale')
    expect(deriveProgressSurface({ plan: demoPlan, online: true, today: '2026-08-17', loading: true })).toBe('loading')
    expect(deriveProgressSurface({ plan: demoPlan, online: true, today: '2026-08-17', loadError: true })).toBe('load-error')
  })

  it('returns four-week series for a populated plan', () => {
    expect(resolveWeeklySeries(demoPlan)).toHaveLength(4)
    expect(resolveWeeklySeries(demoPlan).some((item) => item.partial)).toBe(true)
  })
})
