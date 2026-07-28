import { beforeEach, describe, expect, it } from 'vitest'
import type { UserProfile } from '../../types/domain'
import {
  createAppState,
  loadAppState,
  migrateAppState,
  resetAppState,
  saveAppState,
} from './app-state'

const profile: UserProfile = {
  name: 'کاربر نمونه',
  startWeightKg: 82,
  currentWeightKg: 81,
  targetWeightKg: 75,
  heightCm: 172,
  journeyStartDate: '2026-08-01',
  goalDate: '2026-11-01',
}

describe('app state storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and safely reloads versioned state', () => {
    const state = createAppState(profile)

    expect(saveAppState(state).success).toBe(true)
    expect(loadAppState().state?.profile.name).toBe('کاربر نمونه')
    expect(loadAppState().state?.storageVersion).toBe(1)
  })

  it('keeps corrupted state and returns a friendly error', () => {
    localStorage.setItem('momentum.appState', '{not-json')

    const result = loadAppState()

    expect(result.state).toBeNull()
    expect(result.error).toContain('قابل خواندن نیست')
    expect(localStorage.getItem('momentum.appState')).toBe('{not-json')
  })

  it('opens a healthy recovery copy without deleting the corrupted primary', () => {
    const recoveryState = createAppState({ ...profile, currentWeightKg: 80 })
    recoveryState.metadata.updatedAt = '2026-07-29T10:00:00.000Z'
    localStorage.setItem('momentum.appState', '{not-json')
    localStorage.setItem(
      'momentum.appState.recovery',
      JSON.stringify(recoveryState),
    )

    const result = loadAppState()

    expect(result.state?.profile.currentWeightKg).toBe(80)
    expect(result.recoveredFromBackup).toBe(true)
    expect(localStorage.getItem('momentum.appState')).toBe('{not-json')
    expect(localStorage.getItem('momentum.appState.quarantine')).toBe(
      '{not-json',
    )
  })

  it('recovers a newer verified staging write after an interrupted save', () => {
    const primaryState = createAppState(profile)
    primaryState.metadata.updatedAt = '2026-07-29T10:00:00.000Z'
    const stagedState = createAppState({ ...profile, currentWeightKg: 79.5 })
    stagedState.metadata.updatedAt = '2026-07-29T11:00:00.000Z'
    localStorage.setItem('momentum.appState', JSON.stringify(primaryState))
    localStorage.setItem(
      'momentum.appState.staging',
      JSON.stringify(stagedState),
    )

    const result = loadAppState()

    expect(result.state?.profile.currentWeightKg).toBe(79.5)
    expect(result.recoveredFromBackup).toBe(true)
  })

  it('removes primary, staging, recovery and quarantined copies only on reset', () => {
    ;[
      'momentum.appState',
      'momentum.appState.staging',
      'momentum.appState.recovery',
      'momentum.appState.recovery.2',
      'momentum.appState.quarantine',
    ].forEach((key) => localStorage.setItem(key, 'saved'))

    expect(resetAppState()).toBe(true)
    expect(localStorage.length).toBe(0)
  })

  it('rejects unknown storage versions', () => {
    expect(() => migrateAppState({ storageVersion: 99 })).toThrow()
  })
})
