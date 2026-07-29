import { useId, type SVGProps } from 'react'
import { cx } from '../../lib/class-names'

export type MomentumLogoMotion = 'none' | 'splash' | 'header'

interface MomentumLogoProps extends SVGProps<SVGSVGElement> {
  motion?: MomentumLogoMotion
  title?: string
}

/**
 * Momentum's editable vector mark.
 *
 * Keep its geometry aligned with public/brand/momentum-mark-master.svg so the
 * product and the designer hand-off always share one visual source.
 */
export function MomentumLogo({
  className,
  motion = 'none',
  title,
  ...props
}: MomentumLogoProps) {
  const instanceId = useId().replaceAll(':', '')
  const backgroundGradientId = `${instanceId}-momentum-background`
  const accentGradientId = `${instanceId}-momentum-accent`
  const dotGradientId = `${instanceId}-momentum-dot`

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cx('momentum-logo', `momentum-logo--${motion}`, className)}
      fill="none"
      role={title ? 'img' : undefined}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient
          id={backgroundGradientId}
          x1="84"
          x2="428"
          y1="56"
          y2="456"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-logo-background-start)" />
          <stop offset="1" stopColor="var(--color-logo-background-end)" />
        </linearGradient>
        <linearGradient
          id={accentGradientId}
          x1="104"
          x2="398"
          y1="98"
          y2="408"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-logo-accent-start)" />
          <stop offset="1" stopColor="var(--color-logo-accent-end)" />
        </linearGradient>
        <linearGradient
          id={dotGradientId}
          x1="366"
          x2="400"
          y1="116"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-logo-dot-start)" />
          <stop offset="1" stopColor="var(--color-logo-dot-end)" />
        </linearGradient>
      </defs>

      <rect
        className="momentum-logo__tile"
        height="480"
        rx="120"
        width="480"
        x="16"
        y="16"
        fill={`url(#${backgroundGradientId})`}
      />
      <rect
        className="momentum-logo__tile-border"
        height="478"
        rx="119"
        width="478"
        x="17"
        y="17"
        stroke="var(--color-logo-border)"
        strokeWidth="2"
      />

      <circle
        className="momentum-logo__pulse"
        cx="256"
        cy="256"
        r="178"
        stroke="var(--color-logo-accent-start)"
        strokeWidth="6"
      />
      <circle
        className="momentum-logo__orbit-track"
        cx="256"
        cy="256"
        r="170"
        stroke="var(--color-logo-orbit-track)"
        strokeWidth="22"
      />
      <circle
        className="momentum-logo__orbit-arc"
        cx="256"
        cy="256"
        r="170"
        stroke={`url(#${accentGradientId})`}
        strokeDasharray="812 256"
        strokeLinecap="round"
        strokeWidth="24"
        transform="rotate(-52 256 256)"
      />

      <path
        className="momentum-logo__letter"
        d="M164 324V207C164 185 193 177 207 197L256 271L305 197C319 177 348 185 348 207V324"
        stroke="var(--color-logo-letter)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="34"
      />

      <circle
        className="momentum-logo__orbit-dot-halo"
        cx="382"
        cy="130"
        r="25"
        fill="var(--color-logo-dot-halo)"
      />
      <circle
        className="momentum-logo__orbit-dot"
        cx="382"
        cy="130"
        r="13"
        fill={`url(#${dotGradientId})`}
      />
    </svg>
  )
}
