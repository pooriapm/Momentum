import { AlertTriangle, CalendarCheck2, CalendarDays, Check, LineChart, Scale, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { currentWeekStart, saveWeeklyCheckIn } from '../../checkins/repository'
import { LazyOverlay, WeeklyCheckInSheet } from '../../components/LazyOverlay'
import { localize, type MomentumPlanView } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard, PageSkeleton, StatusPill } from '../../ui/primitives'
import { Textarea } from '../../ui/FormControls'
import { currentLocalDate, loadNextCycleNote, saveNextCycleNote } from '../../data/repository'
import { kilogramsToPounds, roundMeasurement } from '../../settings/measurement-system'
import {
  deriveMembershipStatus,
  NEXT_CYCLE_NOTE_MAX,
  NEXT_CYCLE_NOTE_SOFT,
} from './me-state'
import {
  currentWeekIndex,
  deriveProgressSurface,
  formatLastSync,
  resolveWeeklySeries,
  type ProgressChartView,
  type ProgressSurface,
} from './progress-state'
import '../../../styles/me.css'

export function ProgressPage({
  locale,
  plan,
  preview,
  surface,
  lastSyncedAt,
  loadError = false,
  loading = false,
  onRetry,
}: {
  locale: AppLocale
  plan: MomentumPlanView | null
  preview: boolean
  surface?: ProgressSurface
  lastSyncedAt?: string
  loadError?: boolean
  loading?: boolean
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const fa = locale === 'fa'
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)
  const [weeklyOutcome, setWeeklyOutcome] = useState<'normal' | 'caution' | 'referral' | null>(null)
  const [chartView, setChartView] = useState<ProgressChartView>('chart')
  const [cycleNote, setCycleNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState(false)
  const today = currentLocalDate(plan?.timezone)
  const derived = deriveProgressSurface({
    plan,
    online: preview ? (surface === 'offline' ? false : online) : online,
    today,
    loading: loading || surface === 'loading',
    loadError: loadError || surface === 'load-error',
  })
  const view = surface && surface !== 'overview' ? surface : derived
  const syncedAt = lastSyncedAt
  const series = resolveWeeklySeries(plan)
  const membership = deriveMembershipStatus(plan)
  const showNextCycle = membership === 'gift' || membership === 'expired' || membership === 'none' || plan?.progress.cycleEnding
  const writesLocked = !online || view === 'offline' || view === 'stale' || view === 'load-error'

  useEffect(() => {
    if (!showNextCycle || preview || !online) return
    let active = true
    void loadNextCycleNote()
      .then((note) => { if (active) setCycleNote(note) })
      .catch(() => undefined)
    return () => { active = false }
  }, [online, preview, showNextCycle])

  async function persistNextCycleNote() {
    setNoteError(false)
    if (preview) {
      setNoteSaved(true)
      return
    }
    setNoteSaving(true)
    try {
      await saveNextCycleNote(cycleNote)
      setNoteSaved(true)
    } catch {
      setNoteError(true)
    } finally {
      setNoteSaving(false)
    }
  }

  if (view === 'loading') return <PageSkeleton />

  if (view === 'load-error' && !plan) {
    return (
      <main className="app-page progress-page screen-enter">
        <ContentCard className="progress-status-card">
          <p className="orbit-eyebrow"><AlertTriangle size={15} />{fa ? 'خطای قابل بازیابی' : 'Recoverable error'}</p>
          <h1>{fa ? 'پیشرفت دریافت نشد' : 'Progress could not be loaded'}</h1>
          <p>{fa ? 'داده ذخیره‌شده حذف نشده است. اتصال را بررسی و دوباره تلاش کن.' : 'Saved data was not deleted. Check your connection and try again.'}</p>
          <Button onClick={() => (onRetry ? onRetry() : window.location.reload())}>{fa ? 'تلاش دوباره' : 'Try again'}</Button>
        </ContentCard>
      </main>
    )
  }

  if (view === 'empty') {
    return (
      <main className="app-page progress-page screen-enter">
        <section className="page-heading">
          <div>
            <p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'شروع مسیر' : 'Getting started'}</p>
            <h1>{fa ? 'هنوز داده‌ای ثبت نشده' : 'No progress data yet'}</h1>
            <p>{fa ? 'روندها بعد از چند روز ثبت تمرین یا وعده دیده می‌شوند. این یک نمره نیست.' : 'Trends appear after a few logged workouts or meals. This is not a grade.'}</p>
          </div>
        </section>
        <ContentCard className="progress-weekly-cta">
          <StatusPill>{fa ? 'گزارش هفته' : 'Weekly report'}</StatusPill>
          <h2>{fa ? 'اولین گزارش هفتگی را ثبت کن' : 'Save your first weekly report'}</h2>
          <p>{fa ? 'اختیاری است، اما اینجا مسیر اصلی پیشرفت است. هوش مصنوعی صدا زده نمی‌شود.' : 'It is optional, but this is the main Progress action. No AI is called.'}</p>
          <Button disabled={writesLocked} onClick={() => setWeeklyOpen(true)}><CalendarCheck2 size={17} />{fa ? 'شروع گزارش هفتگی' : 'Start weekly report'}</Button>
        </ContentCard>
        {weeklyOpen ? <LazyOverlay><WeeklySheet locale={locale} onClose={() => setWeeklyOpen(false)} onOutcome={setWeeklyOutcome} onSaved={() => setWeeklySaved(true)} plan={plan} preview={preview} /></LazyOverlay> : null}
      </main>
    )
  }

  const weekIndex = currentWeekIndex(series)
  const change = plan ? plan.progress.currentWeight - plan.progress.startWeight : 0
  const usesUsCustomary = plan?.displayUnitSystem === 'us_customary'
  const currentWeight = plan
    ? roundMeasurement(usesUsCustomary ? kilogramsToPounds(plan.progress.currentWeight) : plan.progress.currentWeight)
    : 0
  const weightChange = roundMeasurement(usesUsCustomary ? kilogramsToPounds(Math.abs(change)) : Math.abs(change))
  const weightUnit = usesUsCustomary ? (fa ? 'پوند' : 'lb') : (fa ? 'کیلوگرم' : 'kg')

  return (
    <main className="app-page progress-page screen-enter">
      {view === 'offline' || view === 'stale' || (view === 'load-error' && plan) ? (
        <div className={`inline-notice ${view === 'load-error' ? 'inline-notice--error' : 'inline-notice--warning'} progress-banner`} role="status">
          {view === 'load-error'
            ? (fa ? 'به‌روزرسانی انجام نشد؛ خلاصه ذخیره‌شده نمایش داده می‌شود.' : 'Refresh failed; showing the saved summary.')
            : view === 'offline'
              ? (fa ? `نسخه ذخیره‌شده · آخرین همگام‌سازی ${formatLastSync(syncedAt, locale)}` : `Saved summary · last synced ${formatLastSync(syncedAt, locale)}`)
              : (fa ? 'این خلاصه ممکن است کامل نباشد و تا اتصال دوباره فقط‌خواندنی است.' : 'This summary may be incomplete and stays read-only until reconnection.')}
        </div>
      ) : null}
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'دوره جاری' : 'Current period'}</p>
          <h1>{t('app.progressTitle')}</h1>
          <p>{fa ? 'پیشرفت روند است نه نمره. جدول و خلاصه متنی همان اطلاعات نمودار را دارند.' : 'Progress is a trend, not a grade. The table and text summary carry the same information as the chart.'}</p>
        </div>
        <div className="progress-heading-actions">
          <StatusPill tone="success">{fa ? `هفته ${formatNumber(weekIndex + 1, locale)} از ۴` : `Week ${weekIndex + 1} of 4`}</StatusPill>
          <Button disabled={writesLocked} onClick={() => setWeeklyOpen(true)} variant="secondary">
            <CalendarCheck2 size={17} />{weeklySaved ? (fa ? 'گزارش هفته ثبت شد' : 'Weekly report saved') : (fa ? 'گزارش هفتگی' : 'Weekly report')}
          </Button>
        </div>
      </section>
      <ContentCard className="progress-weekly-cta">
        <StatusPill>{fa ? 'گزارش هفته' : 'Weekly report'}</StatusPill>
        <h2>{weeklySaved ? (fa ? 'گزارش این هفته ذخیره شد. برنامه ماه عوض نشد.' : 'This week’s report is saved. This month’s plan is unchanged.') : (fa ? 'گزارش این هفته آماده است' : 'This week’s report is ready')}</h2>
        <p>{fa ? 'اختیاری است، اما این کارت مسیر اصلی پیشرفت است. هوش مصنوعی صدا زده نمی‌شود.' : 'Optional, but this card is the main Progress action. No AI is called.'}</p>
        <Button disabled={writesLocked} onClick={() => setWeeklyOpen(true)}><CalendarCheck2 size={17} />{weeklySaved ? (fa ? 'مشاهده نتیجه' : 'View result') : (fa ? 'ثبت گزارش هفتگی' : 'Save weekly report')}</Button>
      </ContentCard>
      {weeklyOutcome ? <WeeklyOutcomeCard locale={locale} outcome={weeklyOutcome} /> : null}
      {showNextCycle ? (
        <ContentCard className="progress-next-cycle">
          <StatusPill tone="brand">{membership === 'gift' ? (fa ? 'هدیه ماه اول استفاده شد' : 'First-month gift used') : (fa ? 'ماه بعد' : 'Next month')}</StatusPill>
          <h2>{fa ? 'ماه رایگان تمام می‌شود؛ برنامه بعد با عضویت ساخته می‌شود' : 'The free month is ending; the next plan needs membership'}</h2>
          <p>{fa ? 'از آخرین گزارش هفتگی می‌فهمی ماه بعد چیست. هدیه آزمایش ۷روزه نیست.' : 'The last weekly report is where you see what happens next. The gift is not a 7-day trial.'}</p>
          <Textarea
            label={fa ? 'یادداشت برای ماه بعد (اختیاری)' : 'Note for next month (optional)'}
            maxLength={NEXT_CYCLE_NOTE_MAX}
            onChange={(event) => { setCycleNote(event.target.value); setNoteSaved(false) }}
            rows={3}
            value={cycleNote}
          />
          <span className="me-char-count">{cycleNote.length >= NEXT_CYCLE_NOTE_SOFT ? `${cycleNote.length}/${NEXT_CYCLE_NOTE_MAX}` : null}</span>
          {noteError ? <div className="inline-notice inline-notice--error" role="alert">{fa ? 'یادداشت ذخیره نشد. متن روی صفحه مانده است.' : 'The note was not saved. Your text remains on this page.'}</div> : null}
          <div className="progress-next-cycle__actions">
            <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/pricing')}>{fa ? 'شروع عضویت' : 'Start membership'}</Link>
            <Button disabled={writesLocked} loading={noteSaving} onClick={() => void persistNextCycleNote()} variant="secondary">{noteSaved ? (fa ? 'یادداشت ذخیره شد' : 'Note saved') : (fa ? 'ذخیره یادداشت' : 'Save note')}</Button>
          </div>
        </ContentCard>
      ) : null}
      {plan ? (
        <div className="progress-metrics-grid">
          <ContentCard><span><Scale size={19} /></span><small>{fa ? 'وزن فعلی' : 'Current weight'}</small><strong>{formatNumber(currentWeight, locale)} {weightUnit}</strong><em><TrendingUp size={15} />{formatNumber(weightChange, locale)} {weightUnit}</em></ContentCard>
          <ContentCard><span><Check size={19} /></span><small>{t('app.consistency')}</small><strong>{formatNumber(plan.progress.weeklyAdherence, locale)}%</strong><em>{fa ? 'میانگین ۷ روز اخیر' : 'Last 7-day average'}</em></ContentCard>
          <ContentCard><span><CalendarDays size={19} /></span><small>{t('app.recovery')}</small><strong>{formatNumber(plan.progress.recovery, locale)}%</strong><em>{fa ? 'آخرین چک‌این' : 'Latest check-in'}</em></ContentCard>
          <ContentCard><span><LineChart size={19} /></span><small>{fa ? 'انرژی' : 'Energy'}</small><strong>{formatNumber(plan.progress.energyScore, locale)}</strong><em>{fa ? 'بدون فشار روند متوالی' : 'No streak pressure'}</em></ContentCard>
        </div>
      ) : null}
      <ContentCard className="trend-card">
        <div className="section-title-row">
          <div>
            <p className="orbit-eyebrow">{fa ? 'پایبندی چهار هفته' : 'Four-week adherence'}</p>
            <h2>{chartView === 'text' ? (fa ? 'خلاصه متنی' : 'Text summary') : chartView === 'table' ? (fa ? 'جدول داده' : 'Data table') : (fa ? 'پایبندی چهار هفته' : 'Four-week adherence')}</h2>
          </div>
        </div>
        <div className="progress-chart-content" key={chartView}>
          {chartView === 'chart' ? <WeekBars locale={locale} series={series} /> : null}
          {chartView === 'text' ? <p className="progress-text-alt">{textSummary(series, locale)}</p> : null}
          {chartView === 'table' ? <ProgressTable locale={locale} series={series} /> : null}
        </div>
        <div className="progress-chart-actions">
          <Button onClick={() => setChartView('chart')} variant={chartView === 'chart' ? 'primary' : 'secondary'}>{fa ? 'نمودار' : 'Chart'}</Button>
          <Button onClick={() => setChartView('text')} variant={chartView === 'text' ? 'primary' : 'secondary'}>{fa ? 'خلاصه متنی نمودار' : 'Text chart summary'}</Button>
          <Button onClick={() => setChartView('table')} variant={chartView === 'table' ? 'primary' : 'secondary'}>{fa ? 'نمایش جدول' : 'View data table'}</Button>
        </div>
      </ContentCard>
      {plan ? (
        <ContentCard className="checkin-history-card">
          <div className="section-title-row"><h2>{fa ? 'چک‌این‌های اخیر' : 'Recent check-ins'}</h2><CalendarDays size={18} /></div>
          <ul>{plan.progress.recentCheckIns.map((checkIn) => <li key={`${checkIn.date.en}-${checkIn.score}`}><span><strong>{localize(checkIn.date, locale)}</strong><small>{localize(checkIn.note, locale)}</small></span><em>{formatNumber(checkIn.score, locale)}%</em></li>)}</ul>
        </ContentCard>
      ) : null}
      {weeklyOpen ? <LazyOverlay><WeeklySheet locale={locale} onClose={() => setWeeklyOpen(false)} onOutcome={setWeeklyOutcome} onSaved={() => setWeeklySaved(true)} plan={plan} preview={preview} /></LazyOverlay> : null}
    </main>
  )
}

function WeeklySheet({
  locale,
  onClose,
  onOutcome,
  onSaved,
  plan,
  preview,
}: {
  locale: AppLocale
  onClose: () => void
  onOutcome: (value: 'normal' | 'caution' | 'referral') => void
  onSaved: () => void
  plan: MomentumPlanView | null
  preview: boolean
}) {
  const timezone = plan?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const weekStart = currentWeekStart(timezone)
  const pendingAttempt = useRef<{ signature: string; idempotencyKey: string } | null>(null)
  return (
    <WeeklyCheckInSheet locale={locale} onClose={onClose} onSave={async (input) => {
      const referral = input.conditionChange === 'new_condition' || input.conditionChange === 'injury_or_worsening_pain'
      const caution = input.painTrend === 'worse' || input.recoveryTrend === 'worse'
      const level = input.redFlags?.length ? 'urgent' as const : referral ? 'caution' as const : caution ? 'caution' as const : 'normal' as const
      const result = preview || !plan
        ? {
            checkin: {
              id: crypto.randomUUID(),
              week_start: weekStart,
              updated_at: new Date().toISOString(),
              trend_summary: {
                current: { adherence_percent: 84, pain_score: 1.5, recovery_score: 3.8, training_difficulty_score: 3.2 },
                previous: { adherence_percent: 79, pain_score: 2.1, recovery_score: 3.4, training_difficulty_score: 3.6 },
                delta: { adherence_percent: 5, pain_score: -0.6, recovery_score: 0.4, training_difficulty_score: -0.4 },
                current_daily_count: 5,
                previous_daily_count: 6,
              },
            },
            safety: { level, reasons: referral ? ['professional_referral'] : [] },
          }
        : await (async () => {
            const signature = JSON.stringify(input)
            if (pendingAttempt.current?.signature !== signature) {
              pendingAttempt.current = { signature, idempotencyKey: crypto.randomUUID() }
            }
            const saved = await saveWeeklyCheckIn(input, weekStart, timezone, pendingAttempt.current.idempotencyKey)
            pendingAttempt.current = null
            return saved
          })()
      onSaved()
      onOutcome(result.safety.reasons.includes('professional_referral') ? 'referral' : result.safety.level === 'caution' || result.safety.level === 'urgent' ? 'caution' : 'normal')
      return result
    }} />
  )
}

function WeeklyOutcomeCard({ locale, outcome }: { locale: AppLocale; outcome: 'normal' | 'caution' | 'referral' }) {
  const fa = locale === 'fa'
  const copy = {
    normal: {
      title: fa ? 'روندت پایدار است' : 'Your trend is steady',
      body: fa ? 'برنامه فعلی بدون تغییر ادامه پیدا می‌کند. هوش مصنوعی صدا زده نشد.' : 'Your current plan continues unchanged. No AI was called.',
    },
    caution: {
      title: fa ? 'این هفته کمی سبک‌تر پیش برو' : 'Take it a little easier this week',
      body: fa ? 'گزارش ذخیره شد. برنامه ماه بازتولید نمی‌شود.' : 'The report is saved. The monthly plan is not regenerated.',
    },
    referral: {
      title: fa ? 'پیش از ادامه با یک متخصص صحبت کن' : 'Talk with a qualified professional before continuing',
      body: fa ? 'این تشخیص یا وضعیت فوری نیست. برنامه ماهانه بازتولید نمی‌شود.' : 'This is not a diagnosis or emergency. The monthly plan is not regenerated.',
    },
  }[outcome]
  return (
    <div className={`inline-notice ${outcome === 'normal' ? 'inline-notice--success' : 'inline-notice--warning'}`} role="status">
      <strong>{copy.title}</strong>
      <span> {copy.body}</span>
    </div>
  )
}

function WeekBars({ locale, series }: { locale: AppLocale; series: ReturnType<typeof resolveWeeklySeries> }) {
  const fa = locale === 'fa'
  return (
    <div className="progress-week-bars">
      {series.map((item) => (
        <div className="progress-week-bars__row" key={item.week}>
          <small>{item.partial ? (fa ? `هفته ${item.week} · ناقص` : `Week ${item.week} · partial`) : (fa ? `هفته ${item.week}` : `Week ${item.week}`)}</small>
          <span className="progress-week-bars__track"><i className="progress-week-bars__fill" style={{ width: `${Math.min(100, item.adherence)}%` }} /></span>
          <strong>{formatNumber(item.adherence, locale)}%</strong>
        </div>
      ))}
    </div>
  )
}

function ProgressTable({ locale, series }: { locale: AppLocale; series: ReturnType<typeof resolveWeeklySeries> }) {
  const fa = locale === 'fa'
  return (
    <table className="progress-data-table">
      <caption>{fa ? 'این جدول دقیقاً همان داده نمودار را دارد' : 'This table contains exactly the chart data'}</caption>
      <thead>
        <tr>
          <th>{fa ? 'هفته' : 'Week'}</th>
          <th>{fa ? 'تمرین' : 'Workouts'}</th>
          <th>{fa ? 'وعده‌ها' : 'Meals'}</th>
          <th>{fa ? 'انرژی' : 'Energy'}</th>
          <th>{fa ? 'پایبندی' : 'Adherence'}</th>
        </tr>
      </thead>
      <tbody>
        {series.map((item) => (
          <tr key={item.week}>
            <td>{item.partial ? (fa ? `هفته ${item.week} · ناقص` : `Week ${item.week} · partial`) : (fa ? `هفته ${item.week}` : `Week ${item.week}`)}</td>
            <td>{`${formatNumber(item.workoutsCompleted, locale)} / ${formatNumber(item.workoutsPlanned, locale)}`}</td>
            <td>{`${formatNumber(item.mealsCompleted, locale)} / ${formatNumber(item.mealsPlanned, locale)}`}</td>
            <td>{formatNumber(item.energy, locale, { maximumFractionDigits: 1 })}</td>
            <td>{formatNumber(item.adherence, locale)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function textSummary(series: ReturnType<typeof resolveWeeklySeries>, locale: AppLocale) {
  const parts = series.map((item) => locale === 'fa'
    ? `هفته ${item.week}${item.partial ? ' (ناقص)' : ''} ${formatNumber(item.adherence, locale)}٪`
    : `week ${item.week}${item.partial ? ' (partial)' : ''} ${item.adherence}%`)
  return locale === 'fa'
    ? `پایبندی ${parts.join('، ')} است. مقدار ناقص صفر تفسیر نمی‌شود.`
    : `Adherence is ${parts.join(', ')}. A partial week is neither omitted nor treated as zero.`
}
