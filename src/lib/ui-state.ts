import { STORAGE_KEYS } from '../config/app'
import type { Theme, UiState } from '../types/ui'

const UI_STATE_KEY = STORAGE_KEYS.uiState

/** Until someone picks a theme, Momentum follows the system appearance. */
export function systemTheme(): Theme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

const defaultUiState = (): UiState => ({
  locale: typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('fa') ? 'en' : 'fa',
  selectedTab: 'today',
  theme: systemTheme(),
})

function readStoredState(): Partial<UiState> | null {
  try {
    const rawState = localStorage.getItem(UI_STATE_KEY)
    return rawState ? JSON.parse(rawState) as Partial<UiState> : null
  } catch {
    return null
  }
}

export function loadUiState(): UiState {
  const defaults = defaultUiState()
  try {
    const candidate = readStoredState()

    if (!candidate) {
      return defaults
    }

    const validTabs: UiState['selectedTab'][] = [
      'today',
      'meal-plan',
      'calendar',
      'progress',
      'settings',
    ]

    return {
      locale: candidate.locale === 'en' ? 'en' : candidate.locale === 'fa' ? 'fa' : defaults.locale,
      selectedTab: validTabs.includes(candidate.selectedTab as UiState['selectedTab'])
        ? (candidate.selectedTab as UiState['selectedTab'])
        : defaults.selectedTab,
      theme: candidate.theme === 'light' || candidate.theme === 'dark' ? candidate.theme : defaults.theme,
    }
  } catch {
    return defaults
  }
}

export function hasStoredLocalePreference(): boolean {
  try {
    const rawState = localStorage.getItem(UI_STATE_KEY)
    if (!rawState) return false
    const candidate = JSON.parse(rawState) as Partial<UiState>
    return candidate.locale === 'fa' || candidate.locale === 'en'
  } catch {
    return false
  }
}

export function hasStoredThemePreference(): boolean {
  const stored = readStoredState()?.theme
  return stored === 'light' || stored === 'dark'
}

export function updateUiState(update: Partial<UiState>): UiState {
  const nextState = { ...loadUiState(), ...update }
  // Saving another preference must not pin today’s system appearance as a choice.
  const persisted: Partial<UiState> = { ...nextState }
  if (!update.theme && !hasStoredThemePreference()) delete persisted.theme

  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(persisted))
  } catch {
    // UI preferences are non-critical and can safely fall back to defaults.
  }

  return nextState
}

export function applyUiTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-background')
    .trim()
  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  const nextThemeColor = backgroundColor || themeColorMeta?.getAttribute('content')

  if (nextThemeColor) {
    themeColorMeta?.setAttribute('content', nextThemeColor)
  }
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'light' ? 'default' : 'black')
}

export function resetUiState() {
  try {
    localStorage.removeItem(UI_STATE_KEY)
    return true
  } catch {
    return false
  }
}
