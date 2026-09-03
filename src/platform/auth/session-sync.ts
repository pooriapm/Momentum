/**
 * Cross-tab auth sync: when another tab clears the persisted Supabase session,
 * this tab must drop to anonymous without waiting for a network refresh.
 * Storage events only fire for other documents on the same origin.
 */

const AUTH_STORAGE_HINT = /auth-token|supabase\.auth|sb-.*-auth/i

export function isAuthStorageKey(key: string | null): boolean {
  return Boolean(key && AUTH_STORAGE_HINT.test(key))
}

export function storageEventMeansForeignSignOut(event: Pick<StorageEvent, 'key' | 'oldValue' | 'newValue'>): boolean {
  if (!isAuthStorageKey(event.key)) return false
  return event.oldValue != null && event.newValue == null
}

export function subscribeForeignSessionExpiry(onExpired: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  const onStorage = (event: StorageEvent) => {
    if (storageEventMeansForeignSignOut(event)) onExpired()
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
