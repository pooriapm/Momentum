import { beforeEach, describe, expect, it } from 'vitest'
import { applyUiTheme, loadUiState, updateUiState } from './ui-state'

describe('UI state', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = '<meta name="theme-color" content="#07110e">'
  })

  it('persists supported preferences', () => {
    updateUiState({ selectedTab: 'calendar', theme: 'light' })

    expect(loadUiState()).toEqual({
      selectedTab: 'calendar',
      theme: 'light',
    })
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
