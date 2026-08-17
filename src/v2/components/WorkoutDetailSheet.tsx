import { Clock3, Dumbbell, ListRestart, X } from 'lucide-react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { localize, type WorkoutBlock } from '../data/types'
import { formatNumber } from '../lib/format'
import { Button, StatusPill } from '../ui/primitives'
import { ModalShell } from './ModalShell'

export function WorkoutDetailSheet({
  locale,
  onClose,
  onSubstitute,
  readOnly = false,
  workout,
}: {
  locale: AppLocale
  onClose: () => void
  onSubstitute?: (exerciseKey: string, name: string) => void
  readOnly?: boolean
  workout: WorkoutBlock
}) {
  const fa = locale === 'fa'
  const equipment = workout.equipment?.length
    ? workout.equipment.map((item) => localize(item, locale)).join(' · ')
    : (fa ? 'بدون وسیله اجباری' : 'No required equipment')
  return (
    <ModalShell className="meal-detail-sheet workout-detail-sheet" labelId="workout-detail-title" material="content" onClose={onClose}>
      <section>
        <header>
          <div>
            <p className="orbit-eyebrow">{fa ? 'جزئیات تمرین' : 'Workout details'}</p>
            <h2 id="workout-detail-title">{localize(workout.name, locale)}</h2>
          </div>
          <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <p className="meal-detail-sheet__description">{localize(workout.focus, locale)}</p>
        <div className="meal-detail-sheet__metrics">
          <span><Clock3 size={17} /><strong>{formatNumber(workout.durationMinutes, locale)}</strong><small>{fa ? 'دقیقه' : 'min'}</small></span>
          <span><Dumbbell size={17} /><strong>{formatNumber(workout.exercises, locale)}</strong><small>{fa ? 'حرکت' : 'exercises'}</small></span>
          <span><strong>{equipment}</strong><small>{fa ? 'تجهیزات' : 'equipment'}</small></span>
        </div>
        {workout.warmup?.length ? <p>{fa ? 'گرم‌کردن: ' : 'Warm-up: '}{workout.warmup.map((item) => localize(item, locale)).join(' · ')}</p> : null}
        {workout.cooldown?.length ? <p>{fa ? 'سردکردن: ' : 'Cool-down: '}{workout.cooldown.map((item) => localize(item, locale)).join(' · ')}</p> : null}
        <ul className="meal-detail-sheet__ingredients">
          {workout.exerciseDetails.map((exercise) => (
            <li key={exercise.key}>
              <span>
                <strong>{localize(exercise.name, locale)}</strong>
                <small> · {formatNumber(exercise.sets, locale)} × {exercise.reps} · {formatNumber(exercise.restSeconds, locale)}s {fa ? 'استراحت' : 'rest'}</small>
                {exercise.adaptation ? <small> · {localize(exercise.adaptation, locale)}</small> : null}
              </span>
              {exercise.substitution && onSubstitute && !readOnly ? (
                <Button
                  onClick={() => onSubstitute(exercise.key, localize(exercise.substitution!, locale))}
                  variant="ghost"
                >
                  <ListRestart size={15} />{fa ? 'جایگزین' : 'Substitute'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="inline-notice" role="note">
          {fa
            ? 'جایگزین از کاتالوگ همان الگوی حرکتی است. اثر انتخاب قبل از ذخیره دیده می‌شود و برنامه ماهانه بازتولید نمی‌شود.'
            : 'Catalog substitutes keep the same movement pattern. The consequence is shown before saving and the monthly plan is not regenerated.'}
        </div>
        <Button block onClick={onClose} variant="secondary">{fa ? 'بستن' : 'Close'}</Button>
      </section>
    </ModalShell>
  )
}

export function PlanSubstitutionSheet({
  consequence,
  locale,
  onClose,
  onConfirm,
  options,
  title,
}: {
  consequence: string
  locale: AppLocale
  onClose: () => void
  onConfirm: (name: string) => void
  options: string[]
  title: string
}) {
  const fa = locale === 'fa'
  return (
    <ModalShell className="meal-detail-sheet" labelId="plan-substitute-title" material="content" onClose={onClose}>
      <section>
        <header>
          <div>
            <p className="orbit-eyebrow">{fa ? 'جایگزینی کنترل‌شده' : 'Governed substitution'}</p>
            <h2 id="plan-substitute-title">{title}</h2>
          </div>
          <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="inline-notice" role="status">{consequence}</div>
        <ul className="meal-detail-sheet__ingredients">
          {options.map((option) => (
            <li key={option}>
              <span>{option}</span>
              <Button onClick={() => onConfirm(option)}>{fa ? `انتخاب ${option}` : `Choose ${option}`}</Button>
            </li>
          ))}
        </ul>
        <StatusPill tone="neutral">{fa ? 'برنامه ماه جاری عوض نمی‌شود' : 'This month’s plan is unchanged'}</StatusPill>
        <Button block onClick={onClose} variant="secondary">{fa ? 'انصراف' : 'Cancel'}</Button>
      </section>
    </ModalShell>
  )
}
