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

  it('resets the destination immediately even when ordinary motion is enabled', () => {
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
      value: vi.fn(() => ({ matches: false } as MediaQueryList)),
    })

    const view = render(<RouteScrollManager path="/en/app/today" />)
    view.rerender(<RouteScrollManager path="/en/app/plan" />)

    expect(workspace.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
    view.unmount()
    workspace.remove()
  })

  it('lets the user scroll immediately after the destination reset', () => {
    const workspace = document.createElement('div')
    workspace.className = 'app-workspace'
    document.body.append(workspace)
    let nextFrame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextFrame = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const view = render(<RouteScrollManager path="/en/app/today" />)
    workspace.scrollTop = 500
    view.rerender(<RouteScrollManager path="/en/app/plan" />)
    expect(workspace.scrollTop).toBe(0)
    workspace.scrollTop = 120
    nextFrame?.(performance.now())
    expect(workspace.scrollTop).toBe(120)
    view.unmount()
    workspace.remove()
  })

  it('waits for a suspended workspace to become visible before resetting it', () => {
    const workspace = document.createElement('div')
    workspace.className = 'app-workspace'
    workspace.scrollTop = 480
    let visible = false
    workspace.checkVisibility = () => visible
    document.body.append(workspace)
    let frame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const view = render(<RouteScrollManager path="/en/app/today" />)
    view.rerender(<RouteScrollManager path="/en/app/plan" />)
    expect(workspace.scrollTop).toBe(480)
    visible = true
    frame?.(performance.now())
    expect(workspace.scrollTop).toBe(0)
    view.unmount()
    workspace.remove()
  })

})
