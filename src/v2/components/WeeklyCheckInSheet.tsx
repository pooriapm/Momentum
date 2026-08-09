import { AlertTriangle, BarChart3, Check, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import {
  weeklyCheckInInputSchema,
  type WeeklyCheckInInput,
  type WeeklyCheckInResult,
} from '../checkins/contracts'
import { formatNumber } from '../lib/format'
import { Select, Textarea } from '../ui/FormControls'
import { Button } from '../ui/primitives'
import { ModalShell } from './ModalShell'

const scoreOptions = [1, 2, 3, 4, 5]
const redFlagOptions = [
  { key: 'chest_pain', fa: 'درد یا فشار قفسه سینه', en: 'Chest pain or pressure' },
  { key: 'fainting', fa: 'غش یا نزدیک به غش', en: 'Fainting or near-fainting' },
  { key: 'severe_shortness_of_breath', fa: 'تنگی نفس شدید یا غیرعادی', en: 'Severe or unusual shortness of breath' },
  { key: 'sudden_weakness_or_numbness', fa: 'ضعف یا بی‌حسی ناگهانی', en: 'Sudden weakness or numbness' },
] as const
type RedFlag = typeof redFlagOptions[number]['key']

export function WeeklyCheckInSheet({
  locale,
  onClose,
  onSave,
}: {
  locale: AppLocale
  onClose: () => void
  onSave: (input: WeeklyCheckInInput) => Promise<WeeklyCheckInResult>
}) {
  const fa = locale === 'fa'
  const [overallScore, setOverallScore] = useState(3)
  const [recoveryTrend, setRecoveryTrend] = useState<WeeklyCheckInInput['recoveryTrend']>('stable')
  const [trainingTrend, setTrainingTrend] = useState<WeeklyCheckInInput['trainingTrend']>('same')
  const [painTrend, setPainTrend] = useState<WeeklyCheckInInput['painTrend']>('no_pain')
  const [circumstancesChanged, setCircumstancesChanged] = useState(false)
  const [conditionChange, setConditionChange] = useState<WeeklyCheckInInput['conditionChange']>('none')
  const [changeNotes, setChangeNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [redFlags, setRedFlags] = useState<RedFlag[]>([])
  const [result, setResult] = useState<WeeklyCheckInResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleRedFlag(flag: RedFlag) {
    setRedFlags((current) => current.includes(flag)
      ? current.filter((item) => item !== flag)
      : [...current, flag])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = weeklyCheckInInputSchema.safeParse({
      overallScore,
      recoveryTrend,
      trainingTrend,
      painTrend,
      circumstancesChanged,
      conditionChange,
      changeNotes: changeNotes || undefined,
      notes: notes || undefined,
      redFlags,
    })
    if (!parsed.success) {
      setError(parsed.error.issues.some((issue) => issue.message === 'change_notes_required')
        ? (fa ? 'تغییری که این هفته رخ داده را کوتاه توضیح بده.' : 'Briefly describe what changed this week.')
        : (fa ? 'پاسخ‌ها را بررسی کن.' : 'Check your answers.'))
      return
    }
    setSaving(true)
    setError('')
    try {
      setResult(await onSave(parsed.data))
    } catch {
      setError(fa ? 'چک‌این هفتگی ذخیره نشد. اتصال را بررسی و دوباره تلاش کن.' : 'Weekly check-in was not saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    const trend = result.checkin.trend_summary
    const urgent = result.safety.level === 'urgent'
    const caution = result.safety.level === 'caution'
    return (
      <ModalShell className="check-in-sheet weekly-check-in-sheet" labelId="weekly-result-title" onClose={onClose}>
        <header>
          <div><p className="orbit-eyebrow"><BarChart3 size={15} />{fa ? 'مقایسه هفتگی' : 'Weekly comparison'}</p><h2 id="weekly-result-title">{fa ? 'چک‌این هفتگی ذخیره شد' : 'Weekly check-in saved'}</h2></div>
          <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="weekly-trend-summary">
          <TrendValue label={fa ? 'پایبندی' : 'Adherence'} locale={locale} suffix="%" value={trend.current.adherence_percent} delta={trend.delta.adherence_percent} />
          <TrendValue label={fa ? 'ریکاوری' : 'Recovery'} locale={locale} value={trend.current.recovery_score} delta={trend.delta.recovery_score} />
          <TrendValue label={fa ? 'درد' : 'Pain'} locale={locale} value={trend.current.pain_score} delta={trend.delta.pain_score} />
          <TrendValue label={fa ? 'سختی تمرین' : 'Training difficulty'} locale={locale} value={trend.current.training_difficulty_score} delta={trend.delta.training_difficulty_score} />
        </div>
        <p className="weekly-trend-summary__coverage">{fa
          ? `${formatNumber(trend.current_daily_count, locale)} ثبت روزانه این هفته با ${formatNumber(trend.previous_daily_count, locale)} ثبت هفته قبل مقایسه شد.`
          : `${trend.current_daily_count} daily logs this week were compared with ${trend.previous_daily_count} from the prior week.`}</p>
        {urgent || caution ? <div className={`check-in-safety-result check-in-safety-result--${result.safety.level}`} role="alert"><AlertTriangle size={25} /><div><strong>{urgent ? (fa ? 'فعلاً فعالیت را متوقف کن.' : 'Stop activity for now.') : (fa ? 'این هفته با احتیاط پیش برو.' : 'Take extra care this week.')}</strong><p>{urgent ? (fa ? 'اگر علائم شدید، ناگهانی یا ادامه‌دار هستند همین حالا با اورژانس محلی یا متخصص واجد شرایط تماس بگیر. Momentum سرویس اورژانسی نیست.' : 'If symptoms are severe, sudden, or ongoing, contact local emergency services or a qualified clinician now. Momentum is not an emergency service.') : (fa ? 'با بدترشدن درد یا شرایط، تمرین را متوقف کن و با متخصص واجد شرایط گفتگو کن.' : 'If pain or symptoms worsen, stop training and speak with a qualified clinician.')}</p></div></div> : null}
        <Button block onClick={onClose} type="button"><Check size={18} />{fa ? 'تمام' : 'Done'}</Button>
      </ModalShell>
    )
  }

  return (
    <ModalShell className="check-in-sheet weekly-check-in-sheet" labelId="weekly-check-in-title" onClose={onClose}>
      <header>
        <div><p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'مرور ۷ روز گذشته' : 'Review the past 7 days'}</p><h2 id="weekly-check-in-title">{fa ? 'چک‌این هفتگی' : 'Weekly check-in'}</h2></div>
        <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
      </header>
      <form onSubmit={submit}>
        <ScoreField label={fa ? 'در مجموع هفته چطور بود؟' : 'How was the week overall?'} locale={locale} onChange={setOverallScore} value={overallScore} />
        <div className="check-in-sheet__numbers">
          <Select label={fa ? 'روند ریکاوری' : 'Recovery trend'} onChange={(event) => setRecoveryTrend(event.target.value as WeeklyCheckInInput['recoveryTrend'])} value={recoveryTrend}><option value="improved">{fa ? 'بهتر شد' : 'Improved'}</option><option value="stable">{fa ? 'بدون تغییر' : 'Stable'}</option><option value="worse">{fa ? 'بدتر شد' : 'Worse'}</option></Select>
          <Select label={fa ? 'تمرین‌ها چه حسی داشتند؟' : 'How did training feel?'} onChange={(event) => setTrainingTrend(event.target.value as WeeklyCheckInInput['trainingTrend'])} value={trainingTrend}><option value="easier">{fa ? 'آسان‌تر' : 'Easier'}</option><option value="same">{fa ? 'مثل قبل' : 'About the same'}</option><option value="harder">{fa ? 'سخت‌تر' : 'Harder'}</option><option value="not_applicable">{fa ? 'تمرین نکردم' : 'Did not train'}</option></Select>
          <Select label={fa ? 'روند درد یا ناراحتی' : 'Pain or discomfort trend'} onChange={(event) => setPainTrend(event.target.value as WeeklyCheckInInput['painTrend'])} value={painTrend}><option value="no_pain">{fa ? 'درد نداشتم' : 'No pain'}</option><option value="improved">{fa ? 'بهتر شد' : 'Improved'}</option><option value="stable">{fa ? 'بدون تغییر' : 'Stable'}</option><option value="worse">{fa ? 'بدتر شد' : 'Worse'}</option></Select>
          <Select label={fa ? 'تغییر وضعیت سلامتی' : 'Health condition change'} onChange={(event) => setConditionChange(event.target.value as WeeklyCheckInInput['conditionChange'])} value={conditionChange}><option value="none">{fa ? 'بدون تغییر' : 'No change'}</option><option value="new_condition">{fa ? 'شرایط یا تشخیص جدید' : 'New condition or diagnosis'}</option><option value="medication_change">{fa ? 'تغییر دارو' : 'Medication change'}</option><option value="injury_or_worsening_pain">{fa ? 'آسیب یا درد رو به بدترشدن' : 'Injury or worsening pain'}</option><option value="other">{fa ? 'تغییر دیگر' : 'Other change'}</option></Select>
        </div>
        <label className="weekly-change-toggle"><input checked={circumstancesChanged} onChange={(event) => setCircumstancesChanged(event.target.checked)} type="checkbox" /><span><strong>{fa ? 'شرایط زندگی یا برنامه‌ام تغییر کرده' : 'My circumstances or schedule changed'}</strong><small>{fa ? 'مثل سفر، شیفت کاری، استرس یا دسترسی به غذا و باشگاه' : 'For example travel, work shifts, stress, or access to food and training'}</small></span></label>
        {circumstancesChanged || conditionChange !== 'none' ? <Textarea label={fa ? 'چه چیزی تغییر کرده؟' : 'What changed?'} maxLength={2000} onChange={(event) => setChangeNotes(event.target.value)} required rows={3} value={changeNotes} /> : null}
        <fieldset className="check-in-red-flags">
          <legend>{fa ? 'آیا همین حالا یکی از این علائم را داری؟' : 'Are you experiencing any of these symptoms now?'}</legend>
          <p>{fa ? 'اگر بله، تمرین را شروع نکن یا ادامه نده.' : 'If yes, do not start or continue training.'}</p>
          <div>{redFlagOptions.map((option) => <label key={option.key}><input checked={redFlags.includes(option.key)} onChange={() => toggleRedFlag(option.key)} type="checkbox" /><span>{fa ? option.fa : option.en}</span></label>)}</div>
        </fieldset>
        <Textarea label={fa ? 'یادداشت هفتگی (اختیاری)' : 'Weekly notes (optional)'} maxLength={2000} onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
        {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
        <Button block loading={saving} type="submit"><Check size={18} />{fa ? 'ثبت و محاسبه روند' : 'Save and calculate trend'}</Button>
      </form>
    </ModalShell>
  )
}

function ScoreField({ label, locale, onChange, value }: { label: string; locale: AppLocale; onChange: (value: number) => void; value: number }) {
  return <fieldset className="score-field"><legend>{label}</legend><div>{scoreOptions.map((score) => <button aria-pressed={value === score} className={value === score ? 'is-selected' : ''} key={score} onClick={() => onChange(score)} type="button"><span>{score}</span><small>{score === 1 ? (locale === 'fa' ? 'سخت' : 'Hard') : score === 5 ? (locale === 'fa' ? 'عالی' : 'Great') : ''}</small></button>)}</div></fieldset>
}

function TrendValue({ label, locale, value, delta, suffix = '' }: { label: string; locale: AppLocale; value: number | null; delta: number | null; suffix?: string }) {
  return <div><small>{label}</small><strong>{value === null ? '—' : `${formatNumber(value, locale, { maximumFractionDigits: 1 })}${suffix}`}</strong><span>{delta === null ? (locale === 'fa' ? 'داده مقایسه‌ای کافی نیست' : 'Not enough comparison data') : `${delta > 0 ? '+' : ''}${formatNumber(delta, locale, { maximumFractionDigits: 1 })} ${locale === 'fa' ? 'نسبت به هفته قبل' : 'vs prior week'}`}</span></div>
}
