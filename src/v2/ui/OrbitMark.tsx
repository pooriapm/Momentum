import { useId } from 'react'

interface OrbitMarkProps {
  size?: number
  animated?: boolean
  className?: string
}

export function OrbitMark({ size = 42, animated = false, className = '' }: OrbitMarkProps) {
  const id = useId().replaceAll(':', '')
  const gradientId = `orbit-gradient-${id}`
  const glowId = `orbit-glow-${id}`

  return (
    <svg
      aria-hidden="true"
      className={`orbit-mark ${animated ? 'orbit-mark--animated' : ''} ${className}`}
      height={size}
      viewBox="0 0 64 64"
      width={size}
    >
      <defs>
        <linearGradient id={gradientId} x1="8" x2="54" y1="8" y2="58">
          <stop stopColor="#8f7cff" />
          <stop offset="0.5" stopColor="#5b5fef" />
          <stop offset="1" stopColor="#57c7e6" />
        </linearGradient>
        <filter id={glowId} height="180%" width="180%" x="-40%" y="-40%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <rect height="60" rx="20" width="60" x="2" y="2" />
      <path
        className="orbit-mark__halo"
        d="M50.7 15.4A24 24 0 1 1 18 11.8"
        fill="none"
        filter={`url(#${glowId})`}
        opacity=".55"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        className="orbit-mark__orbit"
        d="M50.7 15.4A24 24 0 1 1 18 11.8"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle className="orbit-mark__satellite" cx="50.7" cy="15.4" fill="#f28163" r="3.6" />
      <path
        d="m19.8 42.4 2.6-22.2 9.8 13.2 9.8-13.2 2.4 22.2h-6.1l-1-10.2-5.1 7-5.1-7-1.1 10.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? 'brand-lockup--compact' : ''}`}>
      <OrbitMark size={compact ? 38 : 44} />
      <span className="brand-lockup__type">
        <strong>MOMENTUM</strong>
        {!compact ? <span>Adaptive wellness coach</span> : null}
      </span>
    </span>
  )
}
