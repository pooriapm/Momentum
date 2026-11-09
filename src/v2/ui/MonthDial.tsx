import type { CSSProperties, ReactNode } from 'react'
import './month-dial.css'

/**
 * The thirty-day plan drawn as one orbit: a tick per day from twelve o'clock,
 * training days longer and in the training colour, days already lived in the
 * food colour, and a satellite on today. It runs with the reading direction.
 * Decorative unless `label` is given.
 */
export interface MonthDialProps {
  /** 1-based day of the period that the satellite sits on. */
  day: number
  /** 1-based training days. */
  trainingDays?: readonly number[]
  days?: number
  size?: number
  label?: string
  /** Ticks draw in one after another on mount (skipped for reduced motion). */
  animated?: boolean
  className?: string
  children?: ReactNode
}

const VIEW = 200
const CENTER = VIEW / 2

export function MonthDial({
  day,
  trainingDays = [],
  days = 30,
  size,
  label,
  animated = false,
  className = '',
  children,
}: MonthDialProps) {
  const training = new Set(trainingDays)
  const satellite = polar(((day - 1) / days) * 360, 76)
  const style = size ? ({ '--dial-size': `${size / 16}rem` } as CSSProperties) : undefined

  return (
    <div
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`month-dial${animated ? ' month-dial--animated' : ''} ${className}`.trim()}
      role={label ? 'img' : undefined}
      style={style}
    >
      <svg className="month-dial__svg" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <circle className="month-dial__track" cx={CENTER} cy={CENTER} r="76" />
        <g className="month-dial__ticks">
          {Array.from({ length: days }, (_, index) => {
            const n = index + 1
            const angle = (index / days) * 360
            const isTraining = training.has(n)
            const outer = polar(angle, isTraining ? 98 : 94)
            const inner = polar(angle, 84)
            const state = n < day ? 'past' : n === day ? 'today' : 'future'
            return (
              <line
                className={`month-dial__tick month-dial__tick--${state}${isTraining ? ' month-dial__tick--training' : ''}`}
                key={n}
                style={animated ? { animationDelay: `${index * 24 + 120}ms` } : undefined}
                x1={inner.x}
                x2={outer.x}
                y1={inner.y}
                y2={outer.y}
              />
            )
          })}
        </g>
        <circle
          className="month-dial__arc"
          cx={CENTER}
          cy={CENTER}
          pathLength={days}
          r="76"
          strokeDasharray={`${Math.max(0, day - 1)} ${days}`}
        />
        <circle className="month-dial__halo" cx={satellite.x} cy={satellite.y} r="9" />
        <circle className="month-dial__satellite" cx={satellite.x} cy={satellite.y} r="4.5" />
      </svg>
      {children ? <div className="month-dial__core">{children}</div> : null}
    </div>
  )
}

function polar(degrees: number, radius: number) {
  const radians = ((degrees - 90) * Math.PI) / 180
  return {
    x: +(CENTER + radius * Math.cos(radians)).toFixed(2),
    y: +(CENTER + radius * Math.sin(radians)).toFixed(2),
  }
}
