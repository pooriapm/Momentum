import { cx } from '../../lib/class-names'
import { APP_CONFIG } from '../../config/app'

export function ProgressBar({
  className,
  color = 'var(--color-accent)',
  max = 100,
  value,
}: {
  className?: string
  color?: string
  max?: number
  value: number
}) {
  const percentage =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div
      aria-label={`${new Intl.NumberFormat(APP_CONFIG.locale).format(Math.round(percentage))} درصد`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(percentage)}
      className={cx(
        'h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]',
        className,
      )}
      role="progressbar"
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ background: color, width: `${percentage}%` }}
      />
    </div>
  )
}
