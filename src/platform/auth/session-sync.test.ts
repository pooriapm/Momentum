import { describe, expect, it, vi } from 'vitest'
import {
  isAuthStorageKey,
  storageEventMeansForeignSignOut,
  subscribeForeignSessionExpiry,
} from './session-sync'

describe('session-sync multi-tab expiry', () => {
  it('recognizes supabase auth storage keys', () => {
    expect(isAuthStorageKey('sb-osyvvzglvyonevkhdzpu-auth-token')).toBe(true)
    expect(isAuthStorageKey('supabase.auth.token')).toBe(true)
    expect(isAuthStorageKey('momentum.uiState')).toBe(false)
    expect(isAuthStorageKey(null)).toBe(false)
  })

  it('treats cleared auth storage as a foreign sign-out', () => {
    expect(storageEventMeansForeignSignOut({
      key: 'sb-test-auth-token',
      oldValue: '{"access_token":"x"}',
      newValue: null,
    })).toBe(true)
    expect(storageEventMeansForeignSignOut({
      key: 'sb-test-auth-token',
      oldValue: null,
      newValue: '{"access_token":"x"}',
    })).toBe(false)
    expect(storageEventMeansForeignSignOut({
      key: 'momentum.uiState',
      oldValue: 'a',
      newValue: null,
    })).toBe(false)
  })

  it('invokes the callback when another tab clears the session', () => {
    const onExpired = vi.fn()
    const unsubscribe = subscribeForeignSessionExpiry(onExpired)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sb-test-auth-token',
      oldValue: '{"access_token":"x"}',
      newValue: null,
    }))
    expect(onExpired).toHaveBeenCalledTimes(1)
    unsubscribe()
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sb-test-auth-token',
      oldValue: '{"access_token":"x"}',
      newValue: null,
    }))
    expect(onExpired).toHaveBeenCalledTimes(1)
  })
})
