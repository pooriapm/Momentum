import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteScrollManager } from './RouteScrollManager'
import { animateScrollToTop } from './route-scroll'

describe('route scroll motion', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('moves a scroll container to the top immediately for reduced motion', () => {
    const target = document.createElement('div')
    target.scrollTop = 640
    animateScrollToTop(target, { reducedMotion: true })
    expect(target.scrollTop).toBe(0)
  })

  it('uses a short eased animation for ordinary motion', () => {
    const target = document.createElement('div')
    target.scrollTop = 800
    let nextFrame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    vi.spyOn(performance, 'now').mockReturnValue(100)

    animateScrollToTop(target, { duration: 260 })
    nextFrame?.(230)
    expect(target.scrollTop).toBeGreaterThan(0)
    expect(target.scrollTop).toBeLessThan(800)
    nextFrame?.(360)
    expect(target.scrollTop).toBe(0)
  })

  it('resets both the window and mobile workspace after a route change', () => {
    const workspace = document.createElement('div')
    workspace.className = 'app-workspace'
    workspace.scrollTop = 480
    document.body.append(workspace)
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      value: document.documentElement,
    })
    document.documentElement.scrollTop = 320
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true } as MediaQueryList)),
    })

    const view = render(<RouteScrollManager path="/en/app/today" />)
    view.rerender(<RouteScrollManager path="/en/app/plan" />)

    expect(workspace.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
  })
})
