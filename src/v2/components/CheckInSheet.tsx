import { Check, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { sanitizeLocalizedNumberInput } from '../../lib/numbers/localized-number'
import type { AppLocale } from '../../platform/i18n/catalog'
import type { DailyCheckInInput } from '../data/repository'
import { Input } from '../ui/FormControls'
import { Button } from '../ui/primitives'
import { ModalShell } from './ModalShell'

const scoreOptions = [1, 2, 3, 4, 5]

export function CheckInSheet({
  locale,
  onClose,
  onSave,
}: {
  locale: AppLocale
  onClose: () => void
  onSave: (input: DailyCheckInInput) => Promise<void>
}) {
  const fa = locale === 'fa'
  const [energy, setEnergy] = useState(3)
  const [hunger, setHunger] = useState(3)
  const [mood, setMood] = useState(3)
  const [sleepHours, setSleepHours] = useState('')
  const [weight, setWeight] = useState('')
  const [adherence, setAdherence] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const sleep = Number(sleepHours)
    const weightValue = weight ? Number(weight) : undefined
    const adherenceValue = adherence ? Number(adherence) : undefined
    if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24 || (weightValue !== undefined && (!Number.isFinite(weightValue) || weightValue < 20 || weightValue > 500)) || (adherenceValue !== undefined && (!Number.isFinite(adherenceValue) || adherenceValue < 0 || adherenceValue > 100))) {
      setError(fa ? 'مقادیر واردشده را بررسی کن.' : 'Check the values you entered.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        adherencePercent: adherenceValue,
        energyScore: energy,
        hungerScore: hunger,
        moodScore: mood,
        sleepMinutes: Math.round(sleep * 60),
        weightKg: weightValue,
      })
      onClose()
    } catch {
      setError(fa ? 'چک‌این ذخیره نشد. اتصال را بررسی و دوباره تلاش کن.' : 'Check-in was not saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell className="check-in-sheet" labelId="check-in-title" onClose={onClose}>
      <header>
        <div><p className="orbit-eyebrow"><Sparkles size={15} />{fa ? '۳۰ ثانیه برای امروز' : '30 seconds for today'}</p><h2 id="check-in-title">{fa ? 'چک‌این روزانه' : 'Daily check-in'}</h2></div>
        <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
      </header>
      <form onSubmit={submit}>
        <ScoreField label={fa ? 'انرژی' : 'Energy'} locale={locale} onChange={setEnergy} value={energy} />
        <ScoreField label={fa ? 'گرسنگی' : 'Hunger'} locale={locale} onChange={setHunger} value={hunger} />
        <ScoreField label={fa ? 'حال روحی' : 'Mood'} locale={locale} onChange={setMood} value={mood} />
        <div className="check-in-sheet__numbers">
          <Input inputMode="decimal" label={fa ? 'خواب دیشب (ساعت)' : 'Sleep last night (hours)'} max={24} min={0} onChange={(event) => setSleepHours(sanitizeLocalizedNumberInput(event.target.value, true))} required type="text" value={sleepHours} />
          <Input inputMode="decimal" label={fa ? 'وزن امروز (اختیاری)' : 'Weight today (optional)'} max={500} min={20} onChange={(event) => setWeight(sanitizeLocalizedNumberInput(event.target.value, true))} type="text" value={weight} />
          <Input inputMode="numeric" label={fa ? 'پایبندی دیروز % (اختیاری)' : 'Yesterday adherence % (optional)'} max={100} min={0} onChange={(event) => setAdherence(sanitizeLocalizedNumberInput(event.target.value, false))} type="text" value={adherence} />
        </div>
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
