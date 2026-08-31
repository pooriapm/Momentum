import { STORAGE_KEYS } from '../config/app'
import type { Theme, UiState } from '../types/ui'

const UI_STATE_KEY = STORAGE_KEYS.uiState

const defaultUiState: UiState = {
  locale: typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('fa') ? 'en' : 'fa',
  selectedTab: 'today',
  theme: 'dark',
}

export function loadUiState(): UiState {
  try {
    const rawState = localStorage.getItem(UI_STATE_KEY)

    if (!rawState) {
      return defaultUiState
    }

    const candidate = JSON.parse(rawState) as Partial<UiState>
    const validTabs: UiState['selectedTab'][] = [
      'today',
      'meal-plan',
      'calendar',
      'progress',
      'settings',
    ]

    return {
      locale: candidate.locale === 'en' ? 'en' : candidate.locale === 'fa' ? 'fa' : defaultUiState.locale,
      selectedTab: validTabs.includes(candidate.selectedTab as UiState['selectedTab'])
        ? (candidate.selectedTab as UiState['selectedTab'])
        : defaultUiState.selectedTab,
      theme: candidate.theme === 'light' ? 'light' : 'dark',
    }
  } catch {
    return defaultUiState
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

export function updateUiState(update: Partial<UiState>): UiState {
  const nextState = { ...loadUiState(), ...update }

  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(nextState))
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
