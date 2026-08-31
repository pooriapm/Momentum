import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { animateScrollToTop } from './route-scroll'

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function RouteScrollManager({ path: explicitPath }: { path?: string } = {}) {
  const [location] = useLocation()
  const path = explicitPath ?? location
  const previousPath = useRef(path)

  useLayoutEffect(() => {
    if (previousPath.current === path) return
    previousPath.current = path
    const reducedMotion = prefersReducedMotion()
    const cancelWindow = animateScrollToTop(window, { reducedMotion })
    let activeWorkspace: HTMLElement | null = null
    let cancelWorkspace: () => void = () => undefined
    let watcherFrame = 0
    let stopped = false

    const followActiveWorkspace = () => {
      if (stopped) return
      const workspace = document.querySelector<HTMLElement>('.app-workspace')
      if (workspace !== activeWorkspace) {
        cancelWorkspace()
        activeWorkspace = workspace
        cancelWorkspace = workspace
          ? animateScrollToTop(workspace, { reducedMotion })
          : () => undefined
      } else if (reducedMotion && workspace?.scrollTop) {
        cancelWorkspace()
        cancelWorkspace = animateScrollToTop(workspace, { reducedMotion: true })
      }
      watcherFrame = window.requestAnimationFrame(followActiveWorkspace)
    }

    followActiveWorkspace()
    const stopWatcher = window.setTimeout(() => {
      stopped = true
      window.cancelAnimationFrame(watcherFrame)
    }, 750)

    return () => {
      stopped = true
      window.clearTimeout(stopWatcher)
      window.cancelAnimationFrame(watcherFrame)
      cancelWorkspace()
      cancelWindow()
    }
  }, [path])

  return null
}
