import { AlertTriangle, Check, ShieldAlert, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { sanitizeLocalizedNumberInput } from '../../lib/numbers/localized-number'
import type { AppLocale } from '../../platform/i18n/catalog'
import {
  dailyCheckInInputSchema,
  type CheckInSafety,
  type DailyCheckInInput,
} from '../checkins/contracts'
import { Input, Select, Textarea } from '../ui/FormControls'
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

export function CheckInSheet({
  locale,
  onClose,
  onSave,
}: {
  locale: AppLocale
  onClose: () => void
  onSave: (input: DailyCheckInInput) => Promise<{ safety: CheckInSafety }>
}) {
  const fa = locale === 'fa'
  const [energy, setEnergy] = useState(3)
  const [hunger, setHunger] = useState(3)
  const [mood, setMood] = useState(3)
  const [recovery, setRecovery] = useState(3)
  const [sleepHours, setSleepHours] = useState('')
  const [weight, setWeight] = useState('')
  const [adherence, setAdherence] = useState('')
  const [painScore, setPainScore] = useState('0')
  const [painLocation, setPainLocation] = useState('')
  const [trainingDifficulty, setTrainingDifficulty] = useState('')
  const [notes, setNotes] = useState('')
  const [redFlags, setRedFlags] = useState<RedFlag[]>([])
  const [safety, setSafety] = useState<CheckInSafety | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleRedFlag(flag: RedFlag) {
    setRedFlags((current) => current.includes(flag)
      ? current.filter((item) => item !== flag)
      : [...current, flag])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = dailyCheckInInputSchema.safeParse({
      adherencePercent: adherence ? Number(adherence) : undefined,
      energyScore: energy,
      hungerScore: hunger,
      moodScore: mood,
      sleepMinutes: Math.round(Number(sleepHours) * 60),
      weightKg: weight ? Number(weight) : undefined,
      painScore: Number(painScore),
      painLocation: painLocation || undefined,
      trainingDifficultyScore: trainingDifficulty ? Number(trainingDifficulty) : undefined,
      recoveryScore: recovery,
      notes: notes || undefined,
      redFlags,
    })
    if (!parsed.success) {
      const painLocationMissing = parsed.error.issues.some((issue) => issue.message === 'pain_location_required')
      setError(painLocationMissing
        ? (fa ? 'محل درد یا ناراحتی را کوتاه توضیح بده.' : 'Briefly describe where you feel pain or discomfort.')
        : (fa ? 'مقادیر واردشده را بررسی کن.' : 'Check the values you entered.'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await onSave(parsed.data)
      if (result.safety.level === 'normal') onClose()
      else setSafety(result.safety)
    } catch {
      setError(fa ? 'چک‌این ذخیره نشد. اتصال را بررسی و دوباره تلاش کن.' : 'Check-in was not saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (safety) {
    const urgent = safety.level === 'urgent'
    return (
      <ModalShell className="check-in-sheet" labelId="check-in-safety-title" onClose={onClose}>
        <header>
          <div><p className="orbit-eyebrow"><ShieldAlert size={15} />{fa ? 'چک‌این ذخیره شد' : 'Check-in saved'}</p><h2 id="check-in-safety-title">{urgent ? (fa ? 'فعلاً فعالیت را متوقف کن' : 'Stop activity for now') : (fa ? 'امروز با احتیاط پیش برو' : 'Take extra care today')}</h2></div>
          <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className={`check-in-safety-result check-in-safety-result--${safety.level}`} role="alert">
          <AlertTriangle size={28} />
          <div>
            <strong>{urgent ? (fa ? 'این علائم نیازمند بررسی فوری هستند.' : 'These symptoms need prompt attention.') : (fa ? 'شدت تمرین را کم کن یا استراحت کن.' : 'Reduce training intensity or rest.')}</strong>
            <p>{urgent
              ? (fa ? 'Momentum سرویس اورژانسی نیست. اگر علائم شدید، ناگهانی یا ادامه‌دار هستند همین حالا با اورژانس محلی یا یک متخصص واجد شرایط تماس بگیر.' : 'Momentum is not an emergency service. If symptoms are severe, sudden, or ongoing, contact local emergency services or a qualified clinician now.')
              : (fa ? 'اگر درد یا وضعیتت بدتر شد، تمرین را متوقف کن و با متخصص واجد شرایط گفتگو کن. برنامه به‌طور خودکار تشخیص پزشکی نمی‌دهد.' : 'If pain or symptoms worsen, stop training and speak with a qualified clinician. The app does not make a medical diagnosis.')}</p>
          </div>
        </div>
        <Button block onClick={onClose} type="button"><Check size={18} />{fa ? 'متوجه شدم' : 'I understand'}</Button>
      </ModalShell>
    )
  }

  return (
    <ModalShell className="check-in-sheet" labelId="check-in-title" onClose={onClose}>
      <header>
        <div><p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'وضعیت امروز' : 'How today feels'}</p><h2 id="check-in-title">{fa ? 'چک‌این روزانه' : 'Daily check-in'}</h2></div>
        <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
      </header>
      <form onSubmit={submit}>
        <ScoreField label={fa ? 'انرژی' : 'Energy'} locale={locale} onChange={setEnergy} value={energy} />
        <ScoreField label={fa ? 'گرسنگی' : 'Hunger'} locale={locale} onChange={setHunger} value={hunger} />
        <ScoreField label={fa ? 'حال روحی' : 'Mood'} locale={locale} onChange={setMood} value={mood} />
        <ScoreField label={fa ? 'ریکاوری و آمادگی بدن' : 'Recovery and readiness'} locale={locale} onChange={setRecovery} value={recovery} />
        <div className="check-in-sheet__numbers">
          <Input inputMode="decimal" label={fa ? 'خواب دیشب (ساعت)' : 'Sleep last night (hours)'} max={24} min={0} onChange={(event) => setSleepHours(sanitizeLocalizedNumberInput(event.target.value, true))} required type="text" value={sleepHours} />
          <Input inputMode="decimal" label={fa ? 'وزن امروز (اختیاری)' : 'Weight today (optional)'} max={500} min={20} onChange={(event) => setWeight(sanitizeLocalizedNumberInput(event.target.value, true))} type="text" value={weight} />
          <Input inputMode="numeric" label={fa ? 'پایبندی دیروز % (اختیاری)' : 'Yesterday adherence % (optional)'} max={100} min={0} onChange={(event) => setAdherence(sanitizeLocalizedNumberInput(event.target.value, false))} type="text" value={adherence} />
          <Select label={fa ? 'درد یا ناراحتی (۰ تا ۱۰)' : 'Pain or discomfort (0–10)'} onChange={(event) => setPainScore(event.target.value)} value={painScore}>
            {Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value} {value === 0 ? (fa ? '— بدون درد' : '— no pain') : value === 10 ? (fa ? '— شدیدترین' : '— worst') : ''}</option>)}
          </Select>
          <Select label={fa ? 'سختی تمرین امروز (اختیاری)' : 'Training difficulty today (optional)'} onChange={(event) => setTrainingDifficulty(event.target.value)} value={trainingDifficulty}>
            <option value="">{fa ? 'امروز تمرین نکردم' : 'No training today'}</option>
            {scoreOptions.map((score) => <option key={score} value={score}>{score} {score === 1 ? (fa ? '— خیلی سبک' : '— very easy') : score === 5 ? (fa ? '— بیش‌ازحد سخت' : '— too hard') : ''}</option>)}
          </Select>
        </div>
        {Number(painScore) > 0 ? <Input label={fa ? 'محل و نوع درد یا ناراحتی' : 'Where and what kind of pain'} maxLength={240} onChange={(event) => setPainLocation(event.target.value)} required value={painLocation} /> : null}
        <fieldset className="check-in-red-flags">
          <legend>{fa ? 'آیا همین حالا یکی از این علائم را داری؟' : 'Are you experiencing any of these symptoms now?'}</legend>
          <p>{fa ? 'اگر بله، تمرین را شروع نکن یا ادامه نده.' : 'If yes, do not start or continue training.'}</p>
          <div>{redFlagOptions.map((option) => <label key={option.key}><input checked={redFlags.includes(option.key)} onChange={() => toggleRedFlag(option.key)} type="checkbox" /><span>{fa ? option.fa : option.en}</span></label>)}</div>
        </fieldset>
        <Textarea label={fa ? 'یادداشت امروز (اختیاری)' : 'Today’s notes (optional)'} maxLength={2000} onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
        {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
        <Button block loading={saving} type="submit"><Check size={18} />{fa ? 'ثبت چک‌این' : 'Save check-in'}</Button>
      </form>
    </ModalShell>
  )
}

function ScoreField({ label, locale, onChange, value }: { label: string; locale: AppLocale; onChange: (value: number) => void; value: number }) {
  return (
    <fieldset className="score-field">
      <legend>{label}</legend>
      <div>
        {scoreOptions.map((score) => <button aria-pressed={value === score} className={value === score ? 'is-selected' : ''} key={score} onClick={() => onChange(score)} type="button"><span>{score}</span><small>{score === 1 ? (locale === 'fa' ? 'کم' : 'Low') : score === 5 ? (locale === 'fa' ? 'زیاد' : 'High') : ''}</small></button>)}
      </div>
    </fieldset>
  )
}
