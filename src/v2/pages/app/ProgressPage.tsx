import { ArrowDownRight, CalendarCheck2, CalendarDays, Check, Flame, LineChart, MoonStar, Scale, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { currentWeekStart, saveWeeklyCheckIn } from '../../checkins/repository'
import { WeeklyCheckInSheet } from '../../components/WeeklyCheckInSheet'
import { localize, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'

export function ProgressPage({ locale, plan, preview }: { locale: AppLocale; plan: MomentumPlanView | null; preview: boolean }) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)
  if (!plan) return <EmptyPlanState locale={locale} />
  const change = plan.progress.currentWeight - plan.progress.startWeight
  const onTrack = plan.progress.weeklyAdherence >= 70
  const checkInWeights = plan.progress.recentCheckIns
    .filter((item) => item.weight !== undefined)
    .map((item) => ({ label: localize(item.date, locale), value: item.weight! }))
    .reverse()
  const weightSeries = checkInWeights.length >= 2
    ? checkInWeights
    : [
        { label: locale === 'fa' ? 'شروع' : 'Start', value: plan.progress.startWeight },
        { label: locale === 'fa' ? 'اکنون' : 'Now', value: plan.progress.currentWeight },
      ]
  const values = weightSeries.map((item) => item.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max(.5, (maximum - minimum) * .2)
  const chartMinimum = minimum - padding
  const chartMaximum = maximum + padding
  const chartRange = Math.max(1, chartMaximum - chartMinimum)
  const points = weightSeries.map((item, index) => {
    const x = weightSeries.length === 1 ? 300 : (index / (weightSeries.length - 1)) * 600
    const y = 205 - ((item.value - chartMinimum) / chartRange) * 170
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const latestPoint = points.split(' ').at(-1)?.split(',') ?? ['600', '110']
  const direction = change <= 0 ? ArrowDownRight : TrendingUp
  const DirectionIcon = direction
  return (
    <main className="app-page progress-page screen-enter">
      <section className="page-heading"><div><p className="orbit-eyebrow"><Sparkles size={15} />Signal over noise</p><h1>{t('app.progressTitle')}</h1><p>{locale === 'fa' ? 'اندازه‌گیری‌های ثبت‌شده کنار هم نمایش داده می‌شوند تا تغییرات واقعی را ببینی.' : 'Your logged measurements are shown together so you can see the real trend.'}</p></div><div className="progress-heading-actions"><StatusPill tone={onTrack ? 'success' : 'neutral'}><TrendingUp size={14} />{onTrack ? (locale === 'fa' ? 'در مسیر' : 'On track') : (locale === 'fa' ? 'نیازمند توجه' : 'Needs attention')}</StatusPill><Button disabled={!preview && !online} onClick={() => setWeeklyOpen(true)} variant="secondary"><CalendarCheck2 size={17} />{weeklySaved ? (locale === 'fa' ? 'چک‌این هفته ثبت شد' : 'Weekly check-in saved') : (locale === 'fa' ? 'چک‌این هفتگی' : 'Weekly check-in')}</Button></div></section>
      <div className="progress-metrics-grid">
        <ContentCard><span><Scale size={19} /></span><small>{locale === 'fa' ? 'وزن فعلی' : 'Current weight'}</small><strong>{formatNumber(plan.progress.currentWeight, locale)} kg</strong><em><DirectionIcon size={15} />{formatNumber(Math.abs(change), locale)} kg</em></ContentCard>
        <ContentCard><span><Check size={19} /></span><small>{t('app.consistency')}</small><strong>{formatNumber(plan.progress.weeklyAdherence, locale)}%</strong><em>{locale === 'fa' ? 'میانگین ۷ روز اخیر' : 'Last 7-day average'}</em></ContentCard>
        <ContentCard><span><MoonStar size={19} /></span><small>{t('app.recovery')}</small><strong>{formatNumber(plan.progress.recovery, locale)}%</strong><em>{locale === 'fa' ? 'آخرین چک‌این' : 'Latest check-in'}</em></ContentCard>
        <ContentCard><span><Flame size={19} /></span><small>{locale === 'fa' ? 'روند پیوسته' : 'Current streak'}</small><strong>{formatNumber(plan.progress.streak, locale)}</strong><em>{locale === 'fa' ? 'روز ثبت متوالی' : 'logged days'}</em></ContentCard>
      </div>
      <div className="progress-main-grid">
        <ContentCard className="trend-card">
          <div className="section-title-row"><div><p className="orbit-eyebrow">{locale === 'fa' ? 'داده‌های ثبت‌شده' : 'Logged measurements'}</p><h2>{t('app.weightTrend')}</h2></div><StatusPill tone="brand"><LineChart size={13} />{change > 0 ? '+' : change < 0 ? '−' : ''}{formatNumber(Math.abs(change), locale)} kg</StatusPill></div>
          <div className="trend-chart" aria-label="Weight trend chart">
            <div className="trend-chart__labels"><span>{formatNumber(chartMaximum, locale, { maximumFractionDigits: 1 })}</span><span>{formatNumber((chartMaximum + chartMinimum) / 2, locale, { maximumFractionDigits: 1 })}</span><span>{formatNumber(chartMinimum, locale, { maximumFractionDigits: 1 })}</span></div>
            <svg preserveAspectRatio="none" viewBox="0 0 600 220">
              <defs><linearGradient id="progress-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="var(--color-brand)" stopOpacity=".32" /><stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" /></linearGradient></defs>
              <polygon fill="url(#progress-area)" points={`0,220 ${points} 600,220`} />
              <polyline fill="none" points={points} stroke="var(--color-brand)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" vectorEffect="non-scaling-stroke" />
              <circle cx={latestPoint[0]} cy={latestPoint[1]} fill="var(--color-brand)" r="7" />
            </svg>
            <div className="trend-chart__months"><span>{weightSeries[0]?.label}</span><span>{weightSeries.at(-1)?.label}</span></div>
          </div>
        </ContentCard>
        <ContentCard className="checkin-history-card">
          <div className="section-title-row"><h2>{locale === 'fa' ? 'چک‌این‌های اخیر' : 'Recent check-ins'}</h2><CalendarDays size={18} /></div>
          <ul>{plan.progress.recentCheckIns.map((checkIn) => <li key={`${checkIn.date.en}-${checkIn.score}`}><span><strong>{localize(checkIn.date, locale)}</strong><small>{localize(checkIn.note, locale)}</small></span><em>{formatNumber(checkIn.score, locale)}%</em></li>)}</ul>
        </ContentCard>
      </div>
      {weeklyOpen ? <WeeklyCheckInSheet locale={locale} onClose={() => setWeeklyOpen(false)} onSave={async (input) => {
        const result = preview
          ? {
              checkin: {
                id: crypto.randomUUID(),
                week_start: currentWeekStart(),
                updated_at: new Date().toISOString(),
                trend_summary: {
                  current: { adherence_percent: 84, pain_score: 1.5, recovery_score: 3.8, training_difficulty_score: 3.2 },
                  previous: { adherence_percent: 79, pain_score: 2.1, recovery_score: 3.4, training_difficulty_score: 3.6 },
                  delta: { adherence_percent: 5, pain_score: -0.6, recovery_score: 0.4, training_difficulty_score: -0.4 },
                  current_daily_count: 5,
                  previous_daily_count: 6,
                },
              },
              safety: { level: input.redFlags?.length ? 'urgent' as const : input.painTrend === 'worse' || input.recoveryTrend === 'worse' ? 'caution' as const : 'normal' as const, reasons: [] },
            }
          : await saveWeeklyCheckIn(input, currentWeekStart(), plan.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'))
        setWeeklySaved(true)
        return result
      }} /> : null}
    </main>
  )
}
