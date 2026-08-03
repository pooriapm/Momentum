import { useSyncExternalStore } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface InstallState {
  installed: boolean
  prompt: BeforeInstallPromptEvent | null
}

function standalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return (window.matchMedia?.('(display-mode: standalone)').matches ?? false) || iosNavigator.standalone === true
}

let state: InstallState = { installed: standalone(), prompt: null }
const serverState: InstallState = { installed: false, prompt: null }
const listeners = new Set<() => void>()
let initialized = false

function update(next: InstallState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function initializeInstallPromptCapture() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    update({ installed: false, prompt: event as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => update({ installed: true, prompt: null }))
  const media = window.matchMedia?.('(display-mode: standalone)')
  media?.addEventListener('change', () => update({ installed: standalone(), prompt: state.prompt }))
}

function subscribe(listener: () => void) {
  initializeInstallPromptCapture()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallPromptState() {
  return useSyncExternalStore(subscribe, () => state, () => serverState)
}

export function clearInstallPrompt(installed = false) {
  update({ installed, prompt: null })
}
