import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { animateScrollToTop } from './route-scroll'

export function RouteScrollManager({ path: explicitPath }: { path?: string } = {}) {
  const [location] = useLocation()
  const path = explicitPath ?? location
  const previousPath = useRef(path)

  useLayoutEffect(() => {
    if (previousPath.current === path) return
    previousPath.current = path
    // A destination starts at the top without delaying navigation or animating old content.
    const cancelWindow = animateScrollToTop(window, { reducedMotion: true })
    let activeWorkspace: HTMLElement | null = null
    let cancelWorkspace: () => void = () => undefined
    let watcherFrame = 0
    let stopped = false

    const followActiveWorkspace = () => {
      if (stopped) return
      const candidate = document.querySelector<HTMLElement>('.app-workspace')
      // Suspense may keep the previous workspace mounted but hidden. Reset only
      // once the destination is visible, even when React reuses the same node.
      const workspace = candidate && (candidate.checkVisibility?.() ?? true) ? candidate : null
      if (workspace !== activeWorkspace) {
        cancelWorkspace()
        activeWorkspace = workspace
        cancelWorkspace = workspace
          ? animateScrollToTop(workspace, { reducedMotion: true })
          : () => undefined
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
