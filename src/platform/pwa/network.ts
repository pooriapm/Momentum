import { useSyncExternalStore } from 'react'

let online = typeof navigator === 'undefined' ? true : navigator.onLine
const listeners = new Set<() => void>()
let initialized = false

function notify() {
  listeners.forEach((listener) => listener())
}

export function initializeNetworkState() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('online', () => { online = true; notify() })
  window.addEventListener('offline', () => { online = false; notify() })
}

function subscribe(listener: () => void) {
  initializeNetworkState()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => online, () => true)
}

export function assertOnline() {
  if (!online) throw new Error('offline_mutation_blocked')
}
