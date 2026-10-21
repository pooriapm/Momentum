import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { assembleExercise } from './plan-assembly.ts'
import type { CatalogExercise, PlanCatalogSnapshot } from './plan-catalog.ts'

/**
 * Exercises come from the catalog, which carries the whole Android exercise library
 * (supabase/migrations/*_exercise_library_catalog.sql, generated from library.json). The model
 * names them by text id (the library slug, e.g. "barbell-bench-press"); the server resolves the
 * id, drops anything it does not know and rebuilds every row from the catalog, so a wrong id can
 * never reach a stored plan.
 */

/** Accepts "barbell-bench-press" or "exercise:barbell-bench-press@v2". */
export const EXERCISE_REF_PATTERN = '^(exercise:)?[a-z0-9._-]+(@v[1-9][0-9]*)?$'

const FALLBACK_SLUGS = ['bodyweight-squat', 'glute-bridge', 'wall-pushup', 'march-in-place']

// Free-text equipment (Persian or English, as typed at onboarding) -> catalog equipment slug.
const EQUIPMENT_TERMS: Record<string, readonly string[]> = {
  dumbbells: ['dumbbell', 'دمبل'],
  'resistance-band': ['band', 'کش', 'مینی بند'],
  kettlebell: ['kettlebell', 'کتل'],
  'jump-rope': ['jump rope', 'jump-rope', 'طناب ورزشی', 'طناب'],
  barbell: ['barbell', 'هالتر'],
  bench: ['bench', 'نیمکت'],
  cable: ['cable', 'سیم کش', 'کابل'],
  machine: ['machine', 'دستگاه'],
  'smith-machine': ['smith', 'اسمیت'],
  'squat-rack': ['rack', 'رک'],
  trx: ['trx', 'suspension'],
  'pull-up-bar': ['pull-up', 'pullup', 'pull up', 'بارفیکس'],
  'dip-bars': ['dip', 'پارالل'],
  box: ['box', 'step', 'جعبه', 'سکو', 'پله'],
  'weight-plate': ['plate', 'صفحه وزنه'],
  'medicine-ball': ['medicine ball', 'wall ball', 'توپ طبی', 'توپ'],
  'gymnastic-rings': ['rings', 'حلقه'],
  landmine: ['landmine', 'لندماین'],
  'ab-wheel': ['ab wheel', 'ab roller', 'چرخ شکم'],
  'battle-rope': ['battle rope', 'طناب بتل'],
  sled: ['sled', 'سورتمه'],
  sandbag: ['sandbag', 'کیسه شن'],
  treadmill: ['treadmill', 'تردمیل'],
  'stationary-bike': ['bike', 'دوچرخه'],
  'rowing-machine': ['rower', 'rowing', 'روئینگ', 'روینگ'],
  elliptical: ['elliptical', 'الپتیکال'],
  'stair-machine': ['stair', 'stepper'],
  'ski-erg': ['ski erg', 'skierg', 'اسکی'],
  pool: ['pool', 'swim', 'استخر'],
  'foam-roller': ['foam roller', 'فوم رولر'],
}

/** Things nearly everyone has: their own body, a floor (mat), a wall and a chair. */
const ALWAYS_AVAILABLE = new Set(['bodyweight', 'wall', 'chair', 'yoga-mat'])
const OUTDOOR_EXTRA = new Set(['jump-rope'])

function slugOf(id: string): string {
  return id.replace(/^[a-z]+:/, '').replace(/@v\d+$/, '')
}

function normalizedText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[‌\-_]+/g, ' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const STRICT_EXERCISE_PATTERN = '^exercise:[a-z0-9._-]+@v[1-9][0-9]*$'

/** Copy of a JSON schema whose exercise id fields also accept the short library id. */
export function withExerciseRefs<T>(schema: T): T {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit)
    if (!isRecord(node)) return node
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key,
        key === 'pattern' && value === STRICT_EXERCISE_PATTERN
          ? EXERCISE_REF_PATTERN
          : visit(value),
      ]),
    )
  }
  return visit(schema) as T
}

/** Catalog id for a model-supplied reference, or null when the catalog does not know it. */
export function resolveExerciseId(catalog: PlanCatalogSnapshot, ref: unknown): string | null {
  if (typeof ref !== 'string') return null
  const value = ref.trim().toLowerCase()
  if (!new RegExp(EXERCISE_REF_PATTERN).test(value)) return null
  const id = `exercise:${slugOf(value)}@v${catalog.releaseVersion}`
  return catalog.exercises.has(id) ? id : null
}

/**
 * Equipment slugs this user can be given. Unknown location and no equipment listed keeps every
 * exercise available (the previous behaviour); a gym has everything.
 */
export function availableEquipmentSlugs(
  catalog: PlanCatalogSnapshot,
  snapshot: GenerationProfileSnapshot,
): ReadonlySet<string> | null {
  const location = snapshot.training_profile?.location ?? null
  const listed = snapshot.dietary.available_equipment.map(normalizedText).filter(Boolean)
  if (location === 'gym' || (location === null && listed.length === 0)) return null
  const slugs = new Set(ALWAYS_AVAILABLE)
  if (location === 'outdoor') {
    for (const slug of OUTDOOR_EXTRA) slugs.add(slug)
  }
  const catalogSlugs = new Set([...catalog.equipmentIds].map(slugOf))
  for (const text of listed) {
    if (catalogSlugs.has(text.replaceAll(' ', '-'))) slugs.add(text.replaceAll(' ', '-'))
    for (const [slug, terms] of Object.entries(EQUIPMENT_TERMS)) {
      if (terms.some((term) => text.includes(normalizedText(term)))) slugs.add(slug)
    }
  }
  return slugs
}

export function exerciseFitsEquipment(
  exercise: CatalogExercise,
  available: ReadonlySet<string> | null,
): boolean {
  if (!available) return true
  return [...exercise.equipmentIds].every((id) => available.has(slugOf(id)))
}

/** Compact rows for the prompt: [id, movement, equipment, substitutes]. */
export function exercisePromptRows(exercises: Iterable<CatalogExercise>): string[][] {
  return [...exercises].map((exercise) => [
    slugOf(exercise.id),
    exercise.movementPattern ?? '',
    [...exercise.equipmentIds].map(slugOf).join(','),
    [...exercise.substitutionIds].map(slugOf).join(','),
  ])
}

function fallbackExercise(
  catalog: PlanCatalogSnapshot,
  available: ReadonlySet<string> | null,
): CatalogExercise | undefined {
  for (const slug of FALLBACK_SLUGS) {
    const exercise = catalog.exercises.get(`exercise:${slug}@v${catalog.releaseVersion}`)
    if (exercise && exerciseFitsEquipment(exercise, available)) return exercise
  }
  return [...catalog.exercises.values()].find((exercise) =>
    exerciseFitsEquipment(exercise, ALWAYS_AVAILABLE)
  ) ?? [...catalog.exercises.values()][0]
}

/**
 * Rebuilds one workout's exercises from the catalog. Unknown ids are dropped; a substitution the
 * catalog does not pair with the exercise is cleared. An emptied workout gets one safe catalog
 * exercise so it stays valid. exercise_key is the library id (the Android guide looks it up),
 * suffixed when the same exercise repeats in one workout so keys stay unique per session.
 */
export function normalizeWorkoutExercises(input: {
  catalog: PlanCatalogSnapshot
  locale: 'fa-IR' | 'en-US'
  rows: readonly unknown[]
  available?: ReadonlySet<string> | null
}): Record<string, unknown>[] {
  const { catalog, locale } = input
  const keys = new Map<string, number>()
  const nextKey = (exerciseId: string) => {
    const slug = slugOf(exerciseId)
    const seen = (keys.get(slug) ?? 0) + 1
    keys.set(slug, seen)
    return seen === 1 ? slug : `${slug}.${seen}`
  }
  const exercises: Record<string, unknown>[] = []
  for (const row of input.rows) {
    if (!isRecord(row)) continue
    const exerciseId = resolveExerciseId(catalog, row.exercise_id)
    if (!exerciseId) continue
    const substitutionId = resolveExerciseId(catalog, row.substitution_exercise_id)
    exercises.push(assembleExercise({
      catalog,
      exerciseId,
      exerciseKey: nextKey(exerciseId),
      locale,
      sets: Number(row.sets),
      reps: String(row.reps),
      restSeconds: Number(row.rest_seconds),
      intensityNote: typeof row.intensity_note === 'string' ? row.intensity_note : null,
      substitutionExerciseId: substitutionId &&
          catalog.exercises.get(exerciseId)?.substitutionIds.has(substitutionId)
        ? substitutionId
        : null,
    }))
  }
  if (exercises.length === 0) {
    const fallback = fallbackExercise(catalog, input.available ?? null)
    if (fallback) {
      exercises.push(assembleExercise({
        catalog,
        exerciseId: fallback.id,
        exerciseKey: nextKey(fallback.id),
        locale,
        sets: 3,
        reps: '10-12',
        restSeconds: 60,
        intensityNote: null,
        substitutionExerciseId: null,
      }))
    }
  }
  return exercises
}

/** Applies [normalizeWorkoutExercises] to every workout of an expanded monthly plan, in place. */
export function normalizePlanWorkouts(
  plan: Record<string, unknown>,
  catalog: PlanCatalogSnapshot,
  locale: 'fa-IR' | 'en-US',
): Record<string, unknown> {
  const days = Array.isArray(plan.days) ? plan.days : []
  for (const day of days) {
    if (!isRecord(day) || !isRecord(day.workout) || !Array.isArray(day.workout.exercises)) continue
    day.workout.exercises = normalizeWorkoutExercises({
      catalog,
      locale,
      rows: day.workout.exercises,
    })
  }
  return plan
}
