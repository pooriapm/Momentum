import { AlertTriangle, Check, CircleStop, Dumbbell, Pause, Play, Save, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import {
  createPreviewWorkoutSession,
  loadWorkoutSession,
  mutateWorkoutSession,
  startWorkoutSession,
  type WorkoutMutation,
  type WorkoutSession,
} from '../data/workout'
import { localize, type WorkoutBlock } from '../data/types'
import type { WorkoutRunStatus } from '../pages/app/today-state'
import { Button, ContentCard, StatusPill } from '../ui/primitives'

interface SetDraft { weight: string; reps: string; rpe: string; rest: string }

function applyPreviewMutation(session: WorkoutSession, mutation: WorkoutMutation): WorkoutSession {
  const next = structuredClone(session)
  const exercise = 'exerciseKey' in mutation
    ? next.exercises.find((item) => item.exercise_key === mutation.exerciseKey)
    : undefined
  if (mutation.action === 'update_set' && exercise) {
    const set = exercise.sets.find((item) => item.set_number === mutation.setNumber)
    if (set) {
      set.status = mutation.values.completed ? 'completed' : 'planned'
      set.completed_at = mutation.values.completed ? new Date().toISOString() : null
      set.weight_kg = mutation.values.weight_kg ?? null
      set.reps = mutation.values.reps ?? null
      set.rpe = mutation.values.rpe ?? null
      set.rest_seconds = mutation.values.rest_seconds ?? null
      if (mutation.values.completed && exercise.status === 'planned') exercise.status = 'in_progress'
    }
  } else if (mutation.action === 'complete_exercise' && exercise) exercise.status = 'completed'
  else if (mutation.action === 'skip_exercise' && exercise) {
    exercise.status = 'skipped'; exercise.skip_reason = mutation.values.reason
    exercise.sets.forEach((set) => { if (set.status === 'planned') set.status = 'skipped' })
  } else if (mutation.action === 'substitute_exercise' && exercise) {
    exercise.status = 'in_progress'; exercise.substitute_name = mutation.values.name
  } else if (mutation.action === 'exercise_notes' && exercise) exercise.notes = mutation.values.notes || null
  else if (mutation.action === 'session_notes') next.notes = mutation.values.notes || null
  else if (mutation.action === 'report_pain') {
    next.pain_reported = true; next.pain_area = mutation.values.area; next.pain_severity = mutation.values.severity
    if (mutation.values.severity >= 4) { next.status = 'stopped'; next.ended_at = new Date().toISOString(); next.stop_reason = 'pain_reported' }
  } else if (mutation.action === 'stop') {
    next.status = 'stopped'; next.ended_at = new Date().toISOString(); next.stop_reason = mutation.values.reason
  } else if (mutation.action === 'finish') { next.status = 'completed'; next.ended_at = new Date().toISOString() }
  return next
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function WorkoutLogger({
  workout, localDate, locale, preview, enabled, onStatusChange,
}: {
  workout: WorkoutBlock
  localDate: string
  locale: AppLocale
  preview: boolean
  enabled: boolean
  onStatusChange?: (status: WorkoutRunStatus) => void
}) {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const [notes, setNotes] = useState('')
  const [painArea, setPainArea] = useState('')
  const [painSeverity, setPainSeverity] = useState('1')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [painCaution, setPainCaution] = useState(false)

  useEffect(() => {
    let active = true
    if (preview || !enabled) return () => { active = false }
    void loadWorkoutSession(localDate, workout.id)
      .then((value) => { if (active) { setSession(value); setNotes(value?.notes ?? '') } })
      .catch(() => { if (active) setError(locale === 'fa' ? 'وضعیت تمرین بارگیری نشد.' : 'Workout status could not be loaded.') })
    return () => { active = false }
  }, [enabled, localDate, locale, preview, workout.id])

  useEffect(() => {
    onStatusChange?.(paused ? 'paused' : session?.status ?? 'idle')
  }, [onStatusChange, paused, session])

  const finishedExercises = useMemo(
    () => session?.exercises.filter((item) => item.status === 'completed' || item.status === 'skipped').length ?? 0,
    [session],
  )

  async function begin() {
    if (!enabled) return
    setBusy('start'); setError(''); setPaused(false); setPainCaution(false)
    try {
      const value = preview
        ? createPreviewWorkoutSession(workout, localDate)
        : await startWorkoutSession(localDate, workout.id)
      setSession(value); setNotes(value.notes ?? '')
    } catch {
      setError(locale === 'fa' ? 'شروع تمرین ثبت نشد؛ دوباره تلاش کن.' : 'The workout could not be started. Try again.')
    } finally { setBusy('') }
  }

  async function mutate(key: string, mutation: WorkoutMutation) {
    if (!session || session.status !== 'in_progress') return
    if (paused && mutation.action !== 'stop') return
    setBusy(key); setError('')
    try {
      const value = preview ? applyPreviewMutation(session, mutation) : await mutateWorkoutSession(session.id, mutation)
      setSession(value)
      if (mutation.action === 'report_pain' && mutation.values.severity < 4) setPainCaution(true)
    } catch {
      setError(locale === 'fa' ? 'تغییرات ذخیره نشد. مقدارها و وضعیت حرکت را بررسی کن.' : 'Changes were not saved. Check the values and exercise status.')
    } finally { setBusy('') }
  }

  function draftFor(exerciseKey: string, setNumber: number, restSeconds: number): SetDraft {
    const key = `${exerciseKey}:${setNumber}`
    const loggedSet = session?.exercises.find((item) => item.exercise_key === exerciseKey)?.sets.find((item) => item.set_number === setNumber)
    return drafts[key] ?? {
      weight: loggedSet?.weight_kg?.toString() ?? '', reps: loggedSet?.reps?.toString() ?? '',
      rpe: loggedSet?.rpe?.toString() ?? '', rest: (loggedSet?.rest_seconds ?? restSeconds).toString(),
    }
  }

  function setDraft(exerciseKey: string, setNumber: number, field: keyof SetDraft, value: string, restSeconds: number) {
    const key = `${exerciseKey}:${setNumber}`
    setDrafts((current) => ({ ...current, [key]: { ...draftFor(exerciseKey, setNumber, restSeconds), [field]: value } }))
  }

  if (!session) return (
    <ContentCard className="workout-start-card">
      <div><h3>{locale === 'fa' ? 'اجرای تمرین' : 'Run this workout'}</h3><p>{locale === 'fa' ? 'ست‌ها، وزنه، تکرار، RPE و استراحت را حین تمرین ثبت کن.' : 'Log sets, weight, reps, RPE, and rest as you train.'}</p></div>
      <Button disabled={!enabled} loading={busy === 'start'} onClick={() => void begin()}><Play size={17} />{locale === 'fa' ? 'شروع تمرین' : 'Start workout'}</Button>
      {!enabled ? <p className="inline-notice">{locale === 'fa' ? 'ثبت تمرین فقط در روز برنامه فعال است.' : 'Workout logging unlocks on the scheduled day.'}</p> : null}
      {error ? <p className="inline-notice inline-notice--error" role="alert">{error}</p> : null}
    </ContentCard>
  )

  const finished = session.status !== 'in_progress'
  const closed = finished || paused
  return (
    <div className="workout-logger">
      <div className="workout-logger__status">
        <StatusPill tone={session.status === 'completed' ? 'success' : session.status === 'stopped' || paused ? 'neutral' : 'energy'}>
          {session.status === 'completed' ? (locale === 'fa' ? 'تمرین تمام شد' : 'Workout completed') : session.status === 'stopped' ? (locale === 'fa' ? 'تمرین متوقف شد' : 'Workout stopped') : paused ? (locale === 'fa' ? 'متوقف موقت' : 'Paused') : (locale === 'fa' ? 'در حال تمرین' : 'In progress')}
        </StatusPill>
        <span>{finishedExercises}/{session.exercises.length} {locale === 'fa' ? 'حرکت' : 'exercises'}</span>
      </div>
      {paused && !finished ? (
        <div className="inline-notice" role="status">
          <Pause size={16} />
          <span>{locale === 'fa' ? 'تمرین موقتاً متوقف است. پیشرفت از بین نمی‌رود.' : 'Workout is paused. Progress is kept.'}</span>
          <Button onClick={() => setPaused(false)} variant="secondary"><Play size={16} />{locale === 'fa' ? 'ادامه' : 'Resume'}</Button>
        </div>
      ) : null}
      {painCaution && !finished ? (
        <div className="inline-notice inline-notice--warning" role="alert">
          <AlertTriangle size={16} />
          <span>{locale === 'fa' ? 'درد ثبت شد. شدت را کم کن یا متوقف شو. Momentum تشخیص پزشکی نمی‌دهد.' : 'Pain is logged. Reduce intensity or stop. Momentum does not diagnose.'}</span>
          <Button onClick={() => setPainCaution(false)} variant="secondary">{locale === 'fa' ? 'ادامه با سازگاری' : 'Continue with adaptation'}</Button>
          <Button onClick={() => void mutate('stop', { action: 'stop', values: { reason: 'pain_caution' } })} variant="danger">{locale === 'fa' ? 'توقف ایمن' : 'Stop safely'}</Button>
        </div>
      ) : null}

      {session.exercises.map((exercise) => {
        const planned = workout.exerciseDetails.find((item) => item.key === exercise.exercise_key)
        return (
          <ContentCard className={`workout-exercise-log is-${exercise.status}`} key={exercise.id}>
            <header><div><small>{locale === 'fa' ? `حرکت ${exercise.position + 1}` : `Exercise ${exercise.position + 1}`}</small><h3>{exercise.substitute_name ?? localize(planned?.name ?? { fa: exercise.planned_name, en: exercise.planned_name }, locale)}</h3><p>{exercise.planned_sets} × {exercise.planned_reps} · {exercise.planned_rest_seconds}s {locale === 'fa' ? 'استراحت' : 'rest'}</p></div><StatusPill tone={exercise.status === 'completed' ? 'success' : 'neutral'}>{exercise.status === 'skipped' ? (locale === 'fa' ? 'رد شد' : 'Skipped') : exercise.status === 'completed' ? (locale === 'fa' ? 'کامل' : 'Done') : (locale === 'fa' ? 'باز' : 'Open')}</StatusPill></header>
            <div className="workout-set-grid" role="group" aria-label={locale === 'fa' ? 'ست‌های حرکت' : 'Exercise sets'}>
              {exercise.sets.map((set) => {
                const draft = draftFor(exercise.exercise_key, set.set_number, exercise.planned_rest_seconds)
                const field = (name: keyof SetDraft, label: string, min: number, max: number, step = 1) => <label><span>{label}</span><input disabled={closed || exercise.status === 'skipped'} inputMode="decimal" max={max} min={min} onChange={(event) => setDraft(exercise.exercise_key, set.set_number, name, event.target.value, exercise.planned_rest_seconds)} step={step} type="number" value={draft[name]} /></label>
                return <div className={set.status === 'completed' ? 'workout-set-row is-complete' : 'workout-set-row'} key={set.id}><strong>{locale === 'fa' ? `ست ${set.set_number}` : `Set ${set.set_number}`}</strong>{field('weight', locale === 'fa' ? 'کیلو' : 'kg', 0, 1000, .25)}{field('reps', locale === 'fa' ? 'تکرار' : 'reps', 0, 1000)}{field('rpe', 'RPE', 1, 10, .5)}{field('rest', locale === 'fa' ? 'استراحت (ث)' : 'rest (s)', 0, 3600)}<Button disabled={closed || exercise.status === 'skipped'} loading={busy === set.id} onClick={() => void mutate(set.id, { action: 'update_set', exerciseKey: exercise.exercise_key, setNumber: set.set_number, values: { completed: set.status !== 'completed', weight_kg: numberOrNull(draft.weight), reps: numberOrNull(draft.reps), rpe: numberOrNull(draft.rpe), rest_seconds: numberOrNull(draft.rest) } })} variant={set.status === 'completed' ? 'secondary' : 'primary'}><Check size={15} />{set.status === 'completed' ? (locale === 'fa' ? 'بازکردن' : 'Undo') : (locale === 'fa' ? 'ثبت ست' : 'Log set')}</Button></div>
              })}
            </div>
            {!closed && exercise.status !== 'skipped' ? <div className="workout-exercise-log__actions"><Button disabled={!exercise.sets.some((set) => set.status === 'completed')} onClick={() => void mutate(`complete-${exercise.id}`, { action: 'complete_exercise', exerciseKey: exercise.exercise_key })} variant="secondary"><Check size={16} />{locale === 'fa' ? 'پایان حرکت' : 'Complete exercise'}</Button><Button onClick={() => { const name = window.prompt(locale === 'fa' ? 'نام حرکت جایگزین' : 'Substitute exercise name', planned?.substitution ? localize(planned.substitution, locale) : ''); if (name?.trim()) void mutate(`sub-${exercise.id}`, { action: 'substitute_exercise', exerciseKey: exercise.exercise_key, values: { name: name.trim() } }) }} variant="ghost">{locale === 'fa' ? 'جایگزین' : 'Substitute'}</Button><Button onClick={() => { const reason = window.prompt(locale === 'fa' ? 'دلیل ردکردن حرکت' : 'Why are you skipping this exercise?'); if (reason?.trim()) void mutate(`skip-${exercise.id}`, { action: 'skip_exercise', exerciseKey: exercise.exercise_key, values: { reason: reason.trim() } }) }} variant="ghost"><SkipForward size={15} />{locale === 'fa' ? 'رد کردن' : 'Skip'}</Button></div> : null}
          </ContentCard>
        )
      })}

      <ContentCard className="workout-session-notes">
        <label><strong>{locale === 'fa' ? 'یادداشت تمرین' : 'Workout notes'}</strong><textarea disabled={closed} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder={locale === 'fa' ? 'حس کلی، تکنیک یا نکته‌ای برای دفعه بعد…' : 'Overall feel, technique, or a note for next time…'} value={notes} /></label>
        {!closed ? <Button loading={busy === 'notes'} onClick={() => void mutate('notes', { action: 'session_notes', values: { notes } })} variant="secondary"><Save size={16} />{locale === 'fa' ? 'ذخیره یادداشت' : 'Save notes'}</Button> : null}
      </ContentCard>

      {!closed ? <ContentCard className="workout-safety-log"><div><AlertTriangle size={20} /><div><h3>{locale === 'fa' ? 'درد یا ناراحتی' : 'Pain or discomfort'}</h3><p>{locale === 'fa' ? 'درد شدید (۴ یا ۵) تمرین را برای ایمنی متوقف می‌کند.' : 'Severe pain (4 or 5) stops the workout for safety.'}</p></div></div><div className="workout-safety-log__fields"><label><span>{locale === 'fa' ? 'محل درد' : 'Pain area'}</span><input maxLength={160} onChange={(event) => setPainArea(event.target.value)} value={painArea} /></label><label><span>{locale === 'fa' ? 'شدت ۱ تا ۵' : 'Severity 1–5'}</span><input max={5} min={1} onChange={(event) => setPainSeverity(event.target.value)} type="number" value={painSeverity} /></label><Button disabled={!painArea.trim()} onClick={() => void mutate('pain', { action: 'report_pain', values: { area: painArea.trim(), severity: Number(painSeverity) } })} variant="danger">{locale === 'fa' ? 'ثبت درد' : 'Log pain'}</Button></div></ContentCard> : null}

      {!finished ? <div className="workout-finish-actions"><Button disabled={paused || finishedExercises !== session.exercises.length} loading={busy === 'finish'} onClick={() => void mutate('finish', { action: 'finish' })}><Check size={17} />{locale === 'fa' ? 'پایان تمرین' : 'Finish workout'}</Button>{paused ? null : <Button onClick={() => setPaused(true)} variant="secondary"><Pause size={17} />{locale === 'fa' ? 'مکث' : 'Pause'}</Button>}<Button onClick={() => { const reason = window.prompt(locale === 'fa' ? 'چرا تمرین را متوقف می‌کنی؟' : 'Why are you stopping the workout?'); if (reason?.trim()) void mutate('stop', { action: 'stop', values: { reason: reason.trim() } }) }} variant="danger"><CircleStop size={17} />{locale === 'fa' ? 'توقف تمرین' : 'Stop workout'}</Button></div> : null}
      {closed && session.stop_reason ? <p className="inline-notice"><Dumbbell size={15} />{locale === 'fa' ? 'دلیل توقف: ' : 'Stop reason: '}{session.stop_reason}</p> : null}
      {error ? <p className="inline-notice inline-notice--error" role="alert">{error}</p> : null}
    </div>
  )
}
