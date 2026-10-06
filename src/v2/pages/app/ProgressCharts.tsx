import type { AppLocale } from '../../../platform/i18n/catalog'
import { localize, type MomentumPlanView, type WeeklyProgressPoint } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { kilogramsToPounds, roundMeasurement } from '../../settings/measurement-system'
import { compareWeeks, completionRate, type WeekComparison } from './progress-state'

function formatDelta(value: number | null, locale: AppLocale, unit = '') {
  if (value === null) return '—'
  const digits = unit === '' ? 1 : 0
  const amount = formatNumber(Math.abs(value), locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })
  if (locale === 'fa') {
    if (value === 0) return 'بدون تغییر'
    return value > 0 ? `${amount}${unit} بیشتر` : `${amount}${unit} کمتر`
  }
  if (value === 0) return `0${unit}`
  return `${value > 0 ? '+' : '−'}${amount}${unit}`
}

function deltaClass(value: number | null) {
  if (value === null || value === 0) return ''
  return value > 0 ? 'is-up' : 'is-down'
}

export function WeekComparisonStrip({ locale, series }: { locale: AppLocale; series: WeeklyProgressPoint[] }) {
  const fa = locale === 'fa'
  const rows = compareWeeks(series)
  const current = rows.at(-1)
  const previous = rows.length > 1 ? rows.at(-2) : null
  if (!current) return null
  const percent = fa ? '٪' : '%'
  const tiles = [
    { label: fa ? 'پایبندی' : 'Adherence', value: `${formatNumber(current.adherence, locale)}${percent}`, delta: formatDelta(current.adherenceDelta, locale, percent), tone: current.adherenceDelta },
    { label: fa ? 'وعده‌ها' : 'Meals', value: `${formatNumber(current.meals, locale)}${percent}`, delta: formatDelta(current.mealsDelta, locale, percent), tone: current.mealsDelta },
    { label: fa ? 'تمرین' : 'Training', value: `${formatNumber(current.workouts, locale)}${percent}`, delta: formatDelta(current.workoutsDelta, locale, percent), tone: current.workoutsDelta },
    { label: fa ? 'انرژی' : 'Energy', value: formatNumber(current.energy, locale, { maximumFractionDigits: 1 }), delta: formatDelta(current.energyDelta, locale), tone: current.energyDelta },
  ]
  return (
    <section className="progress-compare-card">
      <div className="section-title-row">
        <div>
          <p className="orbit-eyebrow">{fa ? 'این هفته در برابر هفته قبل' : 'This week against last week'}</p>
          <h2>{previous ? (fa ? `هفته ${formatNumber(current.week, locale)} کنار هفته ${formatNumber(previous.week, locale)}` : `Week ${current.week} next to week ${previous.week}`) : (fa ? 'اولین هفته این دوره' : 'The first week of this period')}</h2>
        </div>
      </div>
      <div className="progress-compare">
        {tiles.map((tile, index) => (
          <article className="progress-compare__tile" key={tile.label} style={{ animationDelay: `${index * 70}ms` }}>
            <small>{tile.label}</small>
            <strong>{tile.value}</strong>
            <em className={current.partial ? '' : deltaClass(tile.tone)}>{current.partial ? (fa ? 'تا اینجا' : 'So far') : previous ? tile.delta : (fa ? 'مبدأ' : 'Start')}</em>
          </article>
        ))}
      </div>
      {current.partial ? (
        <p className="progress-compare__note">{fa ? 'این هفته هنوز باز است. عدد کوچک‌تر یعنی روزهایی که نرسیده‌اند، نه اینکه ماه از دست رفته باشد.' : 'This week is still open. A smaller number is the days that have not arrived yet.'}</p>
      ) : null}
    </section>
  )
}

export function SplitBars({ locale, series }: { locale: AppLocale; series: WeeklyProgressPoint[] }) {
  const fa = locale === 'fa'
  return (
    <div className="progress-split">
      <div className="progress-split__legend">
        <span><i className="is-meals" />{fa ? 'وعده‌ها' : 'Meals'}</span>
        <span><i className="is-workouts" />{fa ? 'تمرین' : 'Training'}</span>
      </div>
      <div className="progress-split__cols" style={{ gridTemplateColumns: `repeat(${Math.max(series.length, 1)}, 1fr)` }}>
        {series.map((item) => {
          const meals = completionRate(item.mealsCompleted, item.mealsPlanned)
          const workouts = completionRate(item.workoutsCompleted, item.workoutsPlanned)
          return (
            <div className="progress-split__col" key={item.week}>
              <div className="progress-split__pair">
                <span><i className="is-meals" style={{ height: `${meals}%` }} /></span>
                <span><i className="is-workouts" style={{ height: `${workouts}%` }} /></span>
              </div>
              <small>{fa ? formatNumber(item.week, locale) : item.week}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WeightChart({ locale, plan }: { locale: AppLocale; plan: MomentumPlanView }) {
  const fa = locale === 'fa'
  const usesUs = plan.displayUnitSystem === 'us_customary'
  const unit = usesUs ? (fa ? 'پوند' : 'lb') : (fa ? 'کیلوگرم' : 'kg')
  const history = plan.progress.weightHistory?.length
    ? plan.progress.weightHistory
    : [...plan.progress.recentCheckIns].reverse().flatMap((item) => item.weight == null ? [] : [{ date: item.date, weightKg: item.weight }])
  const display = (kg: number) => roundMeasurement(usesUs ? kilogramsToPounds(kg) : kg)
  if (history.length < 2) {
    return <p className="progress-compare__note">{fa ? 'با دو بار ثبت وزن، خط روند همین‌جا کشیده می‌شود.' : 'Log your weight twice and the line will draw itself here.'}</p>
  }
  const values = history.map((point) => display(point.weightKg))
  const width = 320
  const height = 140
  const pad = 16
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const padSpan = Math.max((dataMax - dataMin) * 0.45, 0.35)
  const min = dataMin - padSpan
  const max = dataMax + padSpan
  const span = max - min || 1
  const point = (value: number, index: number, count: number) => {
    const x = pad + (index / Math.max(count - 1, 1)) * (width - pad * 2)
    const y = pad + (1 - (value - min) / span) * (height - pad * 2)
    return { x, y }
  }
  const dots = values.map((value, index) => point(value, index, values.length))
  const line = dots.map((dot) => `${dot.x},${dot.y}`).join(' ')
  const guide = (kg: number) => {
    const y = point(display(kg), 0, 2).y
    return y >= pad && y <= height - pad ? y : null
  }
  const startY = guide(plan.progress.startWeight)
  const targetY = guide(plan.progress.targetWeight)
  return (
    <figure className="progress-weight">
      <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`}>
        {startY != null ? <line className="progress-weight__guide" x1={pad} x2={width - pad} y1={startY} y2={startY} /> : null}
        {targetY != null ? <line className="progress-weight__target" x1={pad} x2={width - pad} y1={targetY} y2={targetY} /> : null}
        <polyline className="progress-weight__line" fill="none" pathLength="1" points={line} />
        {dots.map((dot, index) => <circle className="progress-weight__dot" cx={dot.x} cy={dot.y} key={`${dot.x}-${index}`} r="3.2" />)}
      </svg>
      <figcaption>
        <span>{fa ? 'شروع' : 'Start'} {formatNumber(display(plan.progress.startWeight), locale)} {unit}</span>
        <span>{fa ? 'هدف' : 'Target'} {formatNumber(display(plan.progress.targetWeight), locale)} {unit}</span>
        <span>{localize(history.at(-1)!.date, locale)} · {formatNumber(values.at(-1)!, locale)} {unit}</span>
      </figcaption>
    </figure>
  )
}

export function ComparisonTable({ locale, series }: { locale: AppLocale; series: WeeklyProgressPoint[] }) {
  const fa = locale === 'fa'
  const rows = compareWeeks(series)
  const showWeight = series.some((item) => typeof item.weightKg === 'number')
  return (
    <div className="progress-table-wrap">
      <table className="progress-compare-table">
        <caption>{fa ? 'هر ردیف، این هفته را با هفته قبلش مقایسه می‌کند' : 'Each row compares that week with the one before it'}</caption>
        <thead>
          <tr>
            <th>{fa ? 'هفته' : 'Week'}</th>
            <th>{fa ? 'نسبت به قبل' : 'Vs previous'}</th>
            <th>{fa ? 'وعده‌ها' : 'Meals'}</th>
            <th>{fa ? 'تمرین' : 'Training'}</th>
            <th>{fa ? 'انرژی' : 'Energy'}</th>
            {showWeight ? <th>{fa ? 'وزن' : 'Weight'}</th> : null}
            <th>{fa ? 'پایبندی' : 'Adherence'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ComparisonRow fa={fa} key={row.week} locale={locale} row={row} showWeight={showWeight} weightKg={series.find((item) => item.week === row.week)?.weightKg} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ComparisonRow({
  fa,
  locale,
  row,
  showWeight,
  weightKg,
}: {
  fa: boolean
  locale: AppLocale
  row: WeekComparison
  showWeight: boolean
  weightKg?: number | null
}) {
  const week = row.partial
    ? (fa ? `هفته ${formatNumber(row.week, locale)} · باز` : `Week ${row.week} · open`)
    : (fa ? `هفته ${formatNumber(row.week, locale)}` : `Week ${row.week}`)
  return (
    <tr>
      <th scope="row">{week}</th>
      <td className={row.partial ? '' : deltaClass(row.adherenceDelta)}><bdi dir={locale === 'fa' ? 'rtl' : 'ltr'}>{row.partial ? (fa ? 'تا اینجا' : 'So far') : formatDelta(row.adherenceDelta, locale, locale === 'fa' ? '٪' : '%')}</bdi></td>
      <td>{`${formatNumber(row.mealsCompleted, locale)} / ${formatNumber(row.mealsPlanned, locale)}`}</td>
      <td>{`${formatNumber(row.workoutsCompleted, locale)} / ${formatNumber(row.workoutsPlanned, locale)}`}</td>
      <td>{formatNumber(row.energy, locale, { maximumFractionDigits: 1 })}</td>
      {showWeight ? <td>{typeof weightKg === 'number' ? formatNumber(weightKg, locale, { maximumFractionDigits: 1 }) : '—'}</td> : null}
      <td>{formatNumber(row.adherence, locale)}%</td>
    </tr>
  )
}
