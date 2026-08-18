import { useState, type ImgHTMLAttributes } from 'react'

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> {
  fallbackSrc?: string
  priority?: boolean
  srcSet?: string
}

export function LazyImage({
  alt,
  className = '',
  fallbackSrc,
  decoding,
  fetchPriority,
  loading,
  onLoad,
  priority = false,
  sizes,
  src,
  srcSet,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const eager = priority
  const webpSet = srcSet ?? (src?.endsWith('.webp') ? src : undefined)

  return (
    <picture className={`lazy-picture${loaded || eager ? ' is-loaded' : ''}${eager ? ' lazy-picture--priority' : ''} ${className}`.trim()}>
      {webpSet ? <source sizes={sizes} srcSet={webpSet} type="image/webp" /> : null}
      <img
        alt={alt}
        className="lazy-picture__img"
        decoding={decoding ?? (eager ? 'sync' : 'async')}
        fetchPriority={fetchPriority ?? (eager ? 'high' : 'auto')}
        loading={loading ?? (eager ? 'eager' : 'lazy')}
        onLoad={(event) => {
          setLoaded(true)
          onLoad?.(event)
        }}
        sizes={sizes}
        src={fallbackSrc ?? src}
        {...props}
      />
    </picture>
  )
}
