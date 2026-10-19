/**
 * Training level and risk tags for catalog exercises. The 316-exercise library carries no level or
 * contraindication data, so these are derived from the library slug with conservative keyword
 * rules. Unknown exercises default to beginner with no risk tags. Versioned so a stored plan can
 * say which rules filtered its exercise list.
 */
export const EXERCISE_PROFILE_VERSION = 'momentum-exercise-profile/1.0.0'

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseRiskTag = 'high_impact' | 'high_skill' | 'heavy_spinal_load'

const LEVEL_RANK: Record<TrainingLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 }

// Gymnastic, Olympic-lift and other high-skill movements.
const ADVANCED = [
  /pistol/, /muscle-up/, /handstand/, /l-sit/, /toes-to-bar/, /power-clean/, /clean-and-jerk/,
  /(^|-)snatch/, /ring-dip/, /nordic-curl/, /turkish-get-up/, /windmill/, /atomic/, /devil-press/,
  /man-maker/, /glute-ham-raise/, /hanging-leg-raise/, /burpee-box-jump/, /double-under/,
]

// Free barbell lifts, loaded explosive work and harder bodyweight variations.
const INTERMEDIATE = [
  /^barbell-/, /deadlift/, /pendlay/, /t-bar-row/, /rack-pull/, /good-morning/, /^pullup/,
  /^chinup/, /chest-dip/, /triceps-dip/, /kettlebell-swing/, /kettlebell-clean/, /thruster/,
  /push-press/, /box-jump/, /burpee/, /decline-pushup/, /diamond-pushup/, /clap-pushup/,
  /pike-pushup/, /bulgarian/, /jumping-lunge/, /jump-squat/, /tuck-jump/, /broad-jump/,
  /skater-jump/, /v-up/, /ab-wheel/, /renegade-row/, /single-leg-rdl/, /hack-squat/,
  /pendulum-squat/, /skull-crusher/, /close-grip-bench/, /incline-bench-press/,
  /decline-bench-press/, /front-squat/, /overhead-squat/, /wall-ball/, /sled/, /sandbag/,
  /assault-bike/, /ski-erg/, /battle-rope/, /medicine-ball-slam/, /hanging-knee-raise/,
  /dumbbell-clean/, /trx-power-pull/, /trx-pike/,
]

const HIGH_IMPACT = [
  /jump/, /burpee/, /hop/, /bound/, /skater/, /star-jump/, /jumping-jack/, /clap-pushup/,
  /double-under/, /plank-jack/, /high-knees/, /running-in-place/, /treadmill-run/,
  /skipping/, /butt-kicks/, /step-jacks/, /wall-ball/, /medicine-ball-slam/, /devil-press/,
  /man-maker/, /tuck-jump/, /box-jump/,
]

const HEAVY_SPINAL_LOAD = [
  /barbell-back-squat/, /barbell-front-squat/, /deadlift/, /good-morning/, /rack-pull/,
  /barbell-overhead-press/, /push-press/, /clean/, /snatch/, /thruster/, /barbell-lunge/,
  /smith-squat/, /hack-squat/, /pendulum-squat/, /belt-squat/, /pendlay/, /barbell-row/,
  /t-bar-row/, /overhead-squat/, /shrug/,
]

function slugOf(id: string): string {
  return id.replace(/^[a-z]+:/, '').replace(/@v\d+$/, '')
}

export function exerciseLevel(id: string): TrainingLevel {
  const slug = slugOf(id)
  if (ADVANCED.some((pattern) => pattern.test(slug))) return 'advanced'
  if (INTERMEDIATE.some((pattern) => pattern.test(slug))) return 'intermediate'
  return 'beginner'
}

export function exerciseRiskTags(id: string): ExerciseRiskTag[] {
  const slug = slugOf(id)
  const tags: ExerciseRiskTag[] = []
  if (HIGH_IMPACT.some((pattern) => pattern.test(slug))) tags.push('high_impact')
  if (exerciseLevel(slug) === 'advanced') tags.push('high_skill')
  if (HEAVY_SPINAL_LOAD.some((pattern) => pattern.test(slug))) tags.push('heavy_spinal_load')
  return tags
}

/** Unknown experience is treated as beginner. */
export function normalizeLevel(value: string | null | undefined): TrainingLevel {
  return value === 'intermediate' || value === 'advanced' ? value : 'beginner'
}

/**
 * Whether a user at [level] may get this exercise. A declared injury or movement limitation (the
 * onboarding question has no body region) removes every high-impact, high-skill and heavy
 * spinal-load movement.
 */
export function exerciseAllowedFor(
  id: string,
  input: { level: TrainingLevel; injury: boolean },
): boolean {
  if (LEVEL_RANK[exerciseLevel(id)] > LEVEL_RANK[input.level]) return false
  if (input.injury && exerciseRiskTags(id).length > 0) return false
  return true
}
