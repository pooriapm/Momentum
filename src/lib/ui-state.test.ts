import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../config/app'
import { applyUiTheme, hasStoredThemePreference, loadUiState, updateUiState } from './ui-state'

describe('UI state', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = '<meta name="theme-color" content="#0e0d0b">'
  })

  it('persists supported preferences', () => {
    updateUiState({ selectedTab: 'calendar', theme: 'light' })

    expect(loadUiState()).toEqual({
      locale: 'en',
      selectedTab: 'calendar',
      theme: 'light',
    })
  })

  it('follows the system appearance until a theme is chosen', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: query.includes('light'), media: query })) as unknown as typeof window.matchMedia
    try {
      expect(loadUiState().theme).toBe('light')
      updateUiState({ locale: 'fa' })
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.uiState) ?? '{}')).not.toHaveProperty('theme')
      expect(hasStoredThemePreference()).toBe(false)

      updateUiState({ theme: 'dark' })
      expect(hasStoredThemePreference()).toBe(true)
      expect(loadUiState().theme).toBe('dark')
    } finally {
      window.matchMedia = original
    }
  })

  it('applies a stable theme hook for CSS and browser chrome', () => {
    applyUiTheme('light')

    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(
      document.querySelector('meta[name="theme-color"]'),
    ).toHaveAttribute('content')
  })
})
