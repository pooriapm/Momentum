import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'
import { LazyImage } from './LazyImage'
import { ContentCard } from './primitives'

describe('Reveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    render(<Reveal><p>Visible card</p></Reveal>)
    expect(screen.getByText('Visible card')).toBeInTheDocument()
    expect(screen.getByText('Visible card').parentElement).toHaveClass('is-visible')
  })

  it('reveals once the observed node intersects', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    let callback: IntersectionObserverCallback = () => undefined
    vi.stubGlobal('IntersectionObserver', class {
      constructor(handler: IntersectionObserverCallback) {
        callback = handler
      }
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
      takeRecords = () => []
      root = null
      rootMargin = ''
      thresholds = []
    })

    render(<Reveal><span>Deferred</span></Reveal>)
    const node = screen.getByText('Deferred').parentElement
    expect(node).not.toHaveClass('is-visible')
    expect(observe).toHaveBeenCalled()
    act(() => {
      callback([{ isIntersecting: true, target: node! } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    })
    expect(node).toHaveClass('is-visible')
    expect(disconnect).toHaveBeenCalled()
  })
})

describe('LazyImage', () => {
  it('serves WebP with an SVG fallback and lazy loading', () => {
    const { container } = render(
      <LazyImage
        alt="Saffron chicken"
        fallbackSrc="/preview/saffron-chicken-lunch.svg"
        src="/preview/saffron-chicken-lunch.webp"
        srcSet="/preview/saffron-chicken-lunch-480.webp 480w, /preview/saffron-chicken-lunch-800.webp 800w"
      />,
    )
    const source = container.querySelector('source')
    const image = container.querySelector('img')
    expect(source).toHaveAttribute('type', 'image/webp')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
    expect(image).toHaveAttribute('src', '/preview/saffron-chicken-lunch.svg')
  })

  it('marks the picture as loaded after the image finishes', () => {
    const { container } = render(
      <LazyImage alt="" src="/preview/saffron-chicken-lunch.webp" />,
    )
    fireEvent.load(container.querySelector('img')!)
    expect(container.querySelector('.lazy-picture')).toHaveClass('is-loaded')
  })
})

describe('ContentCard', () => {
  it('uses scroll reveal on every card', () => {
    render(<ContentCard>Card body</ContentCard>)
    expect(screen.getByText('Card body')).toHaveClass('content-card', 'scroll-reveal', 'is-visible')
  })
})
