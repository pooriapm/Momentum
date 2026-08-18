import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from 'react'

type RevealProps<T extends ElementType = 'div'> = {
  as?: T
  delay?: number
} & Omit<HTMLAttributes<HTMLElement>, 'as'>

function shouldSkipReveal() {
  if (typeof window === 'undefined') return true
  if (typeof IntersectionObserver === 'undefined') return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function Reveal<T extends ElementType = 'div'>({
  as,
  className = '',
  delay = 0,
  style,
  ...props
}: RevealProps<T>) {
  const Tag = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(shouldSkipReveal)

  useEffect(() => {
    if (visible) return
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '72px 0px', threshold: 0.08 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <Tag
      className={`scroll-reveal${visible ? ' is-visible' : ''} ${className}`.trim()}
      ref={ref}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...props}
    />
  )
}
