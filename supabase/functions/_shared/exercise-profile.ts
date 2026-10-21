import { EXERCISE_PROFILE_DATA } from './exercise-profile-data.ts'

/**
 * Training level, risk flags and loaded body regions for catalog exercises. The reviewed table in
 * exercise-profile-data.ts covers the whole 316-exercise library; the keyword rules below only
 * classify an exercise the table doesn't know yet (a future library update), conservatively.
 * Versioned so a stored plan can say which rules filtered its exercise list.
 */
export const EXERCISE_PROFILE_VERSION = 'momentum-exercise-profile/2.0.0'

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseRiskTag = 'high_impact' | 'high_skill' | 'heavy_spinal_load'
export const INJURY_AREAS = [
  'knee',
  'ankle',
  'hip',
  'lower_back',
  'shoulder',
  'elbow',
  'wrist',
  'neck',
] as const
export type InjuryArea = typeof INJURY_AREAS[number]

export interface ExerciseProfile {
  level: TrainingLevel
  risks: ExerciseRiskTag[]
  regions: InjuryArea[]
  /** False when the exercise is not in the reviewed table and keyword rules were used. */
  reviewed: boolean
}

const LEVEL_RANK: Record<TrainingLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 }
const LEVEL_CODES: Record<string, TrainingLevel> = { b: 'beginner', i: 'intermediate', a: 'advanced' }
const RISK_CODES: Record<string, ExerciseRiskTag> = {
  I: 'high_impact',
  K: 'high_skill',
  S: 'heavy_spinal_load',
}

// Fallback rules for exercises outside the reviewed table.
const ADVANCED = [
  /pistol/, /muscle-up/, /handstand/, /(^|-)l-sit/, /toes-to-bar/, /clean-and-jerk/, /power-clean/,
  /(^|-)snatch/, /ring-dip/, /nordic/, /turkish/, /windmill/, /devil-press/, /man-maker/,
]
const INTERMEDIATE = [
  /^barbell-/, /deadlift/, /good-morning/, /^pullup/, /^chinup/, /dip/, /swing/, /thruster/,
  /burpee/, /jump/, /bulgarian/, /ab-wheel/, /renegade/,
]
const HIGH_IMPACT = [/jump/, /burpee/, /hop/, /bound/, /skater/, /sprint/, /run/, /skipping/]
const HEAVY_SPINAL_LOAD = [/^barbell-.*(squat|deadlift|row|press|lunge)/, /deadlift/, /good-morning/, /clean/, /snatch/]
const REGION_RULES: Array<[InjuryArea, RegExp]> = [
  ['knee', /squat|lunge|step|jump|leg-press|leg-extension|leg-curl|run|skater|burpee/],
  ['ankle', /jump|run|skip|lunge|skater|calf/],
  ['hip', /hip|sumo|lunge|pigeon|adduction|abduction/],
  ['lower_back', /deadlift|good-morning|row|swing|carry|crunch|situp|twist|extension|clean|snatch|squat/],
  ['shoulder', /press|pushup|dip|fly|pull|raise|row|overhead|handstand|plank/],
  ['elbow', /curl|triceps|pushdown|dip|skull/],
  ['wrist', /pushup|plank|handstand|clean|snatch|crawl|dip/],
  ['neck', /neck|shrug|crunch|situp/],
]

function slugOf(id: string): string {
  return id.replace(/^[a-z]+:/, '').replace(/@v\d+$/, '')
}

export function exerciseProfile(id: string): ExerciseProfile {
  const slug = slugOf(id)
  const row = EXERCISE_PROFILE_DATA[slug]
  if (row) {
    const [level = 'b', flags = '', regions = ''] = row.split('|')
    return {
      level: LEVEL_CODES[level] ?? 'beginner',
      risks: [...flags].map((code) => RISK_CODES[code]).filter((tag): tag is ExerciseRiskTag => Boolean(tag)),
      regions: regions.split(' ').filter(Boolean) as InjuryArea[],
      reviewed: true,
    }
  }
  const level: TrainingLevel = ADVANCED.some((rule) => rule.test(slug))
    ? 'advanced'
    : INTERMEDIATE.some((rule) => rule.test(slug))
    ? 'intermediate'
    : 'beginner'
  const risks: ExerciseRiskTag[] = []
  if (HIGH_IMPACT.some((rule) => rule.test(slug))) risks.push('high_impact')
  if (level === 'advanced') risks.push('high_skill')
  if (HEAVY_SPINAL_LOAD.some((rule) => rule.test(slug))) risks.push('heavy_spinal_load')
  return {
    level,
    risks,
    regions: REGION_RULES.filter(([, rule]) => rule.test(slug)).map(([area]) => area),
    reviewed: false,
  }
}

export function exerciseLevel(id: string): TrainingLevel {
  return exerciseProfile(id).level
}

export function exerciseRiskTags(id: string): ExerciseRiskTag[] {
  return exerciseProfile(id).risks
}

/** Unknown experience is treated as beginner. */
export function normalizeLevel(value: string | null | undefined): TrainingLevel {
  return value === 'intermediate' || value === 'advanced' ? value : 'beginner'
}

/** injury:<area> codes from health_context.medical_considerations. */
export function injuryAreasFrom(considerations: readonly string[]): InjuryArea[] {
  return considerations
    .filter((code) => code.startsWith('injury:'))
    .map((code) => code.slice('injury:'.length))
    .filter((area): area is InjuryArea => (INJURY_AREAS as readonly string[]).includes(area))
}

/**
 * Whether a user at [level] may get this exercise.
 * - Never above the user's level.
 * - Injury with known areas: nothing that loads those areas. Lower limb (knee, ankle, hip) also
 *   removes high-impact work; lower back or neck also removes heavy spinal loading. High-skill
 *   movements always go, since form breaks down around an injury.
 * - Injury without a known area (older profiles, or the user skipped the question): every
 *   high-impact, high-skill and heavy spinal-load movement goes.
 * - Exercises outside the reviewed table are not given to an injured user at all.
 */
export function exerciseAllowedFor(
  id: string,
  input: { level: TrainingLevel; injury: boolean; areas?: readonly InjuryArea[] },
): boolean {
  const profile = exerciseProfile(id)
  if (LEVEL_RANK[profile.level] > LEVEL_RANK[input.level]) return false
  if (!input.injury) return true
  if (!profile.reviewed) return false
  const areas = input.areas ?? []
  if (areas.length === 0) return profile.risks.length === 0
  if (profile.regions.some((region) => areas.includes(region))) return false
  if (profile.risks.includes('high_skill')) return false
  const lowerLimb = areas.some((area) => area === 'knee' || area === 'ankle' || area === 'hip')
  if (lowerLimb && profile.risks.includes('high_impact')) return false
  const spine = areas.includes('lower_back') || areas.includes('neck')
  if (spine && profile.risks.includes('heavy_spinal_load')) return false
  return true
}
