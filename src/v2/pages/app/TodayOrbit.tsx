import type { AppLocale } from '../../../platform/i18n/catalog'
import { ContentCard } from '../../ui/primitives'
import { formatNumber } from '../../lib/format'
import type { OrbitRing } from './orbit-rings'

const SIZE = 132
const STROKE = 10
const GAP = 6
const RADII = [SIZE / 2 - STROKE / 2, SIZE / 2 - STROKE * 1.5 - GAP, SIZE / 2 - STROKE * 2.5 - GAP * 2]

function ratio(ring: OrbitRing) {
  return ring.kind === 'value' ? Math.min(1, Math.max(0, ring.done / ring.target)) : 0
}

function RingArc({ radius, ring, tone }: { radius: number; ring: OrbitRing; tone: string }) {
  const circumference = 2 * Math.PI * radius
  const filled = ratio(ring) * circumference
  return (
    <g className={`today-orbit__ring today-orbit__ring--${tone}`}>
      <circle
        className={`today-orbit__track${ring.kind === 'unknown' ? ' is-unknown' : ''}`}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
      />
      {filled > 0 ? (
        <circle
          className="today-orbit__arc"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          strokeDasharray={`${filled} ${circumference}`}
        />
      ) : null}
    </g>
  )
}

export function TodayOrbit({
  locale,
  meals,
  workout,
  water,
  calories,
}: {
  locale: AppLocale
  meals: OrbitRing
  workout: OrbitRing
  water: OrbitRing
  calories: { logged: number; target: number }
}) {
  const fa = locale === 'fa'
  const unknown = fa ? 'نامشخص' : 'Not known yet'
  const rows = [
    {
      tone: 'food',
      label: fa ? 'وعده‌ها' : 'Meals',
      ring: meals,
      value: meals.kind === 'value'
        ? (fa ? `${formatNumber(meals.done, locale)} از ${formatNumber(meals.target, locale)} وعده` : `${formatNumber(meals.done, locale)} of ${formatNumber(meals.target, locale)} meals`)
        : unknown,
    },
    {
      tone: 'training',
      label: fa ? 'تمرین' : 'Workout',
      ring: workout,
      value: workout.kind === 'rest'
        ? (fa ? 'روز استراحت' : 'Rest day')
        : workout.kind === 'unknown'
          ? unknown
          : workout.done >= 1
            ? (fa ? 'انجام شد' : 'Done')
            : workout.done > 0
              ? (fa ? 'در حال انجام' : 'In progress')
              : (fa ? 'هنوز شروع نشده' : 'Not started'),
    },
    {
      tone: 'water',
      label: fa ? 'آب' : 'Water',
      ring: water,
      value: water.kind === 'value'
        ? (fa
          ? `${formatNumber(water.done / 1000, locale, { maximumFractionDigits: 1 })} از ${formatNumber(water.target / 1000, locale, { maximumFractionDigits: 1 })} لیتر`
          : `${formatNumber(water.done / 1000, locale, { maximumFractionDigits: 1 })} of ${formatNumber(water.target / 1000, locale, { maximumFractionDigits: 1 })} L`)
        : (fa ? 'هدفی در برنامه نیست' : 'No target in the plan'),
    },
  ] as const

  return (
    <ContentCard aria-label={fa ? 'امروز در یک نگاه' : 'Today at a glance'} className="today-orbit" role="region">
      <svg aria-hidden="true" className="today-orbit__rings" height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE}>
        {rows.map((row, index) => <RingArc key={row.tone} radius={RADII[index]} ring={row.ring} tone={row.tone} />)}
      </svg>
      <dl className="today-orbit__legend">
        {rows.map((row) => (
          <div className={`today-orbit__item today-orbit__item--${row.tone}${row.ring.kind === 'unknown' ? ' is-unknown' : ''}`} key={row.tone}>
            <dt><i aria-hidden="true" />{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="today-orbit__intake">
        <span>{fa ? 'ثبت‌شده' : 'Logged'}</span>
        <bdi dir="ltr">{formatNumber(calories.logged, locale)} / {formatNumber(calories.target, locale)} kcal</bdi>
      </p>
    </ContentCard>
  )
}
