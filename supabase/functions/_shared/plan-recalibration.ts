import { HttpError } from './http.ts'

export interface RecalibrationTrend {
  dailyCount: number
  averageAdherence: number | null
  averageRecovery: number | null
  averagePain: number | null
  weeklyRecovery: string | null
  weeklyTraining: string | null
  weeklyPain: string | null
  circumstancesChanged: boolean
  conditionChange: string | null
  changeNotes: string | null
}

export interface PlanRecalibrationResult {
  content: Record<string, unknown>
  changeReason: Record<string, unknown>
  diff: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100
}

export function recalibratePlan(
  source: Record<string, unknown>,
  trend: RecalibrationTrend,
  locale: 'fa-IR' | 'en-US',
  userReason?: string,
): PlanRecalibrationResult {
  if (!Array.isArray(source.days) || source.days.length < 3) {
    throw new HttpError(409, 'plan_not_recalibratable', 'The active plan cannot be recalibrated.')
  }
  if (trend.dailyCount < 3 && !trend.weeklyRecovery) {
    throw new HttpError(
      409,
      'insufficient_recalibration_trend',
      'At least three daily check-ins or a weekly check-in are required.',
    )
  }
  if (
    trend.conditionChange &&
    ['new_condition', 'medication_change', 'injury_or_worsening_pain'].includes(
      trend.conditionChange,
    )
  ) {
    throw new HttpError(
      409,
      'clinical_review_required',
      'This change requires qualified human review before recalibration.',
    )
  }

  const needsDeload = (trend.averageRecovery !== null && trend.averageRecovery < 3) ||
    (trend.averagePain !== null && trend.averagePain >= 4) ||
    trend.weeklyRecovery === 'worse' ||
    trend.weeklyTraining === 'harder' ||
    trend.weeklyPain === 'worse'
  const canProgress = !needsDeload &&
    (trend.averageAdherence ?? 0) >= 80 &&
    (trend.averageRecovery ?? 0) >= 4 &&
    (trend.averagePain ?? 0) <= 2
  const mode = needsDeload ? 'deload' : canProgress ? 'progression' : 'stabilize'
  const copy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
  const operations: Array<Record<string, unknown>> = []
  let changedWorkouts = 0
  let changedExercises = 0

  for (const [dayIndex, rawDay] of (copy.days as unknown[]).entries()) {
    if (!isRecord(rawDay)) continue
    const workout = rawDay.workout
    if (!isRecord(workout)) continue
    changedWorkouts += 1
    const previousDuration = Number(workout.duration_minutes)
    const previousIntensity = String(workout.intensity)
    if (mode === 'deload') {
      workout.duration_minutes = Math.max(5, Math.round(previousDuration * 0.85))
      workout.intensity = 'low'
    } else if (mode === 'progression') {
      workout.duration_minutes = Math.min(300, previousDuration + 5)
      if (previousIntensity === 'low') workout.intensity = 'moderate'
    }
    if (
      workout.duration_minutes !== previousDuration ||
      workout.intensity !== previousIntensity
    ) {
      operations.push({
        path: `/days/${dayIndex}/workout`,
        duration_minutes: { from: previousDuration, to: workout.duration_minutes },
        intensity: { from: previousIntensity, to: workout.intensity },
      })
    }
    if (!Array.isArray(workout.exercises)) continue
    for (const [exerciseIndex, rawExercise] of workout.exercises.entries()) {
      if (!isRecord(rawExercise)) continue
      const previousSets = Number(rawExercise.sets)
      const previousRest = Number(rawExercise.rest_seconds)
      if (mode === 'deload') {
        rawExercise.sets = Math.max(1, previousSets - 1)
        rawExercise.rest_seconds = Math.min(600, previousRest + 15)
      } else if (mode === 'progression') {
        rawExercise.sets = Math.min(20, previousSets + 1)
      }
      if (rawExercise.sets !== previousSets || rawExercise.rest_seconds !== previousRest) {
        changedExercises += 1
        operations.push({
          path: `/days/${dayIndex}/workout/exercises/${exerciseIndex}`,
          exercise_id: rawExercise.exercise_id ?? null,
          sets: { from: previousSets, to: rawExercise.sets },
          rest_seconds: { from: previousRest, to: rawExercise.rest_seconds },
        })
      }
    }
  }

  const rationale = locale === 'fa-IR'
    ? mode === 'deload'
      ? 'حجم تمرین بر اساس روند ریکاوری و درد کاهش یافت.'
      : mode === 'progression'
      ? 'با توجه به پایبندی و ریکاوری پایدار، حجم تمرین کمی بیشتر شد.'
      : 'برنامه برای ثبات و ادامه پایبندی بازتنظیم شد.'
    : mode === 'deload'
    ? 'Training load was reduced from the multi-day recovery and pain trend.'
    : mode === 'progression'
    ? 'Training load was progressed modestly from stable adherence and recovery.'
    : 'The plan was recalibrated for stability and continued adherence.'
  copy.summary = rationale
  for (const rawDay of copy.days as unknown[]) {
    if (isRecord(rawDay) && isRecord(rawDay.target_strategy)) {
      rawDay.target_strategy.rationale = rationale
      if (mode === 'deload') rawDay.target_strategy.mode = 'recovery_day'
    }
  }
  operations.push({ path: '/summary', to: rationale })

  return {
    content: copy,
    changeReason: {
      code: mode,
      rationale,
      user_reason: userReason?.trim() || null,
      circumstances_changed: trend.circumstancesChanged,
      condition_change: trend.conditionChange,
      change_notes: trend.changeNotes,
    },
    diff: {
      mode,
      changed_workouts: changedWorkouts,
      changed_exercises: changedExercises,
      nutrition_changed: false,
      trend: {
        daily_count: trend.dailyCount,
        average_adherence: trend.averageAdherence === null ? null : rounded(trend.averageAdherence),
        average_recovery: trend.averageRecovery === null ? null : rounded(trend.averageRecovery),
        average_pain: trend.averagePain === null ? null : rounded(trend.averagePain),
        weekly_recovery: trend.weeklyRecovery,
        weekly_training: trend.weeklyTraining,
        weekly_pain: trend.weeklyPain,
      },
      operations,
    },
  }
}
