import type { UiState } from '../types/ui'

const UI_STATE_KEY = 'momentum.uiState'

const defaultUiState: UiState = {
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
      selectedTab: validTabs.includes(candidate.selectedTab as UiState['selectedTab'])
        ? (candidate.selectedTab as UiState['selectedTab'])
        : defaultUiState.selectedTab,
      theme: candidate.theme === 'light' ? 'light' : 'dark',
    }
  } catch {
    return defaultUiState
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

export function resetUiState() {
  try {
    localStorage.removeItem(UI_STATE_KEY)
    return true
  } catch {
    return false
  }
}
