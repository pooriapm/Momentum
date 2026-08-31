export type ScrollTarget = Window | HTMLElement

export const ROUTE_SCROLL_DURATION_MS = 260

function readScrollTop(target: ScrollTarget) {
  if (target !== window) return (target as HTMLElement).scrollTop
  const scrollingElement = document.scrollingElement as HTMLElement | null
  return scrollingElement?.scrollTop ?? window.scrollY
}

function writeScrollTop(target: ScrollTarget, top: number) {
  if (target === window) {
    const scrollingElement = document.scrollingElement as HTMLElement | null
    if (scrollingElement) scrollingElement.scrollTop = top
    else window.scrollTo({ behavior: 'auto', left: 0, top })
    return
  }
  ;(target as HTMLElement).scrollTop = top
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3)
}

export function animateScrollToTop(
  target: ScrollTarget,
  options: { duration?: number; reducedMotion?: boolean } = {},
) {
  const start = readScrollTop(target)
  if (start <= 0) return () => undefined

  const duration = options.duration ?? ROUTE_SCROLL_DURATION_MS
  if (options.reducedMotion || duration <= 0) {
    writeScrollTop(target, 0)
    return () => undefined
  }

  const startedAt = performance.now()
  let frame = 0
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    writeScrollTop(target, Math.max(0, start * (1 - easeOutCubic(progress))))
    if (progress < 1) frame = window.requestAnimationFrame(tick)
  }
  frame = window.requestAnimationFrame(tick)
  return () => window.cancelAnimationFrame(frame)
}
