import { useSyncExternalStore } from 'react'

let online = typeof navigator === 'undefined' ? true : navigator.onLine
const listeners = new Set<() => void>()
let initialized = false
let probeInFlight: Promise<void> | null = null

function notify() {
  listeners.forEach((listener) => listener())
}

function setOnline(nextOnline: boolean) {
  if (online === nextOnline) return
  online = nextOnline
  notify()
}

export function probeConnectivity() {
  if (probeInFlight) return probeInFlight
  probeInFlight = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOnline(false)
      return
    }
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
      setOnline(true)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    try {
      const response = await window.fetch(`/connectivity-check.txt?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      })
      setOnline(response.ok)
    } catch {
      setOnline(false)
    } finally {
      window.clearTimeout(timeout)
    }
  })().finally(() => {
    probeInFlight = null
  })
  return probeInFlight
}

export function initializeNetworkState() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('online', () => { void probeConnectivity() })
  window.addEventListener('offline', () => setOnline(false))
  window.addEventListener('focus', () => { void probeConnectivity() })
  window.setInterval(() => { void probeConnectivity() }, 30_000)
  void probeConnectivity()
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
