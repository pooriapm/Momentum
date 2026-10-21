import { deterministicSafetyDecision } from './ai-safety.ts'
import {
  COMPACT_SCHEMA_VERSION,
  expandCompactPlan,
  stripExpansionMetadata,
} from './compact-plan-contract.ts'
import { resolveExerciseId } from './exercise-selection.ts'
import { HttpError } from './http.ts'
import {
  aggregateGroceryList,
  assembleMealOption,
} from './plan-assembly.ts'
import type { MealSlot, PlanBriefResult } from './plan-brief.ts'
import type { CatalogFood, PlanCatalogSnapshot } from './plan-catalog.ts'
import { assertGeneratedPlan } from './plan-contract.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import { INTENSITIES, LEAN_SCHEMA_VERSION, WORKOUT_TYPES } from './plan-prompt.ts'
import type { PlanTargets } from './plan-targets.ts'
import type { ValidationFailureCategory } from './usage-accounting.ts'

/**
 * Stage 5: everything the server checks before a model-made plan can reach a user.
 *
 * 1. validateLeanPlan: schema, allowlisted catalog/exercise ids, meal slots, the training calendar,
 *    workout volume and intensity, variety, language and text safety. Every problem is collected
 *    (not just the first) so one repair call can fix them all.
 * 2. buildPlanFromLean: expands into the stored plan contract, recomputes nutrition from the
 *    catalog, scales portions in code to within +-5% of the calorie target, rebuilds the grocery
 *    list and runs the full assertGeneratedPlan contract as the last gate.
 */
export const PLAN_VALIDATOR_VERSION = 'momentum-plan-validator/1.0.0'

/** Day calories must land within this share of the computed target after scaling. */
export const CALORIE_TOLERANCE = 0.05
/** Below this share of the protein target the plan goes back for repair. */
const PROTEIN_HARD_FLOOR = 0.6
const PROTEIN_SOFT_FLOOR = 0.9
const MIN_MULTIPLIER = 0.5
const MAX_MULTIPLIER = 3

export interface PlanIssue {
  code: string
  category: Exclude<ValidationFailureCategory, null>
  /** Short, model-readable description used verbatim in the repair prompt. */
  detail: string
}

export interface PlanQualityReport {
  validator_version: typeof PLAN_VALIDATOR_VERSION
  max_calorie_deviation_pct: number
  min_protein_pct: number
  distinct_foods_per_slot: Record<string, number>
  warnings: string[]
  auto_fixes: string[]
}

export interface ValidationContext {
  catalog: PlanCatalogSnapshot
  brief: PlanBriefResult
  locale: 'fa-IR' | 'en-US'
  declaredAllergenIds: ReadonlySet<string>
}

interface LeanMeal {
  id: string
  slot: MealSlot
  foodId: string
  altIds: string[]
  note: string | null
}

interface LeanWorkoutItem {
  exerciseId: string
  sets: number
  reps: string
  rest: number
  substituteId: string | null
}

interface LeanWorkout {
  id: string
  title: string
  type: typeof WORKOUT_TYPES[number]
  minutes: number
  intensity: typeof INTENSITIES[number]
  items: LeanWorkoutItem[]
  note: string | null
}

interface LeanDay {
  d: number
  meals: string[]
  workout: string | null
  note: string | null
}

export interface LeanRecipe {
  prep_minutes: number
  cook_minutes: number
  steps: string[]
}

export interface LeanPlan {
  planName: string
  summary: string
  /** Keyed by catalog food id. */
  recipes: Map<string, LeanRecipe>
  meals: Map<string, LeanMeal>
  workouts: Map<string, LeanWorkout>
  days: LeanDay[]
  restaurantTips: string[]
  generalTips: string[]
}

export type LeanValidation =
  | { ok: true; plan: LeanPlan; warnings: string[]; autoFixes: string[] }
  | { ok: false; issues: PlanIssue[] }

const LIGHT_TYPES = new Set(['walk', 'mobility'])
const SET_CAPS = { beginner: 16, intermediate: 22, advanced: 26 } as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function slugOf(id: string): string {
  return id.replace(/^[a-z]+:/, '').replace(/@v\d+$/, '')
}

function normalizeDigits(value: string): string {
  return value.normalize('NFKC').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

/** "chicken-rice-bowl" or "food:chicken-rice-bowl@v2" -> catalog id, or null when unknown. */
export function resolveFoodId(catalog: PlanCatalogSnapshot, ref: unknown): string | null {
  if (typeof ref !== 'string') return null
  const value = ref.trim().toLowerCase()
  if (!/^(food:)?[a-z0-9._-]+(@v[1-9][0-9]*)?$/.test(value)) return null
  const id = `food:${slugOf(value)}@v${catalog.releaseVersion}`
  return catalog.foods.has(id) ? id : null
}

/** Static holds: a rep count of 1-3 for these means the model forgot to give a time. */
const HOLD_EXERCISE = /(?:^|[:-])(?:plank|hold|wall-sit|dead-hang|hang|hollow|l-sit)(?:-|@|$)/

/** Accepts "10", "8-12", "30s" / "45 sec" / "۳۰ ثانیه", "20min" / "20 دقیقه". */
export function parseReps(value: string): { count: string; seconds: number | null } | null {
  const text = normalizeDigits(value).trim().toLowerCase()
  const range = /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/.exec(text)
  if (range) {
    const min = Number(range[1])
    const max = range[2] ? Number(range[2]) : min
    return min >= 1 && max <= 100 && min <= max ? { count: text.replace(/\s+/g, ''), seconds: null } : null
  }
  // Times, single or as a range ("20-30s", "8-10min"); a range is held for its midpoint.
  const time = (max: number, pattern: RegExp) => {
    const match = pattern.exec(text)
    if (!match) return null
    const low = Number(match[1])
    const high = match[2] ? Number(match[2]) : low
    return low <= high && high <= max ? (low + high) / 2 : null
  }
  const seconds = time(180, /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*(?:s|sec|secs|seconds|ثانیه)$/)
  if (seconds !== null && seconds >= 5) return { count: '1', seconds: Math.round(seconds) }
  const minutes = time(60, /^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*(?:m|min|mins|minutes|دقیقه)$/)
  if (minutes !== null && minutes >= 1) return { count: '1', seconds: Math.round(minutes * 60) }
  return null
}

function termText(value: string): string {
  return ` ${value.normalize('NFKC').toLocaleLowerCase().replace(/[^‌\p{L}\p{N}]+/gu, ' ').trim()} `
}

// Meat and fish words a vegetarian recipe must not mention ("تخم مرغ" is egg, removed first).
const MEAT_TERMS = [
  'chicken', 'beef', 'lamb', 'veal', 'meat', 'fish', 'tuna', 'salmon', 'shrimp', 'prawn', 'turkey',
  'sausage', 'ham', 'bacon', 'kebab', 'مرغ', 'گوشت', 'ماهی', 'تن ماهی', 'میگو', 'بوقلمون', 'سوسیس',
  'کالباس', 'کباب', 'گوساله', 'بره', 'جوجه',
]
const EGG_PHRASES = /تخم[\s‌]*مرغ/g

const NUTRITION_NUMBER =
  /\d+(?:[.,]\d+)?\s*(?:kcal|cal\b|calories|کیلوکالری|کالری|grams?\b|g\b|گرم)/i

function textOf(value: unknown, max: number): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : undefined
}

export function validateLeanPlan(raw: unknown, ctx: ValidationContext): LeanValidation {
  const issues: PlanIssue[] = []
  const warnings: string[] = []
  const autoFixes: string[] = []
  const add = (code: string, category: PlanIssue['category'], detail: string) => {
    if (issues.length < 60) issues.push({ code, category, detail })
  }
  const { catalog, brief: briefResult } = ctx
  const brief = briefResult.brief

  if (!isRecord(raw)) {
    return { ok: false, issues: [{ code: 'not_an_object', category: 'schema', detail: 'Output must be one JSON object.' }] }
  }
  if (raw.schema_version !== LEAN_SCHEMA_VERSION) {
    add('schema_version', 'schema', `schema_version must be "${LEAN_SCHEMA_VERSION}".`)
  }
  const planName = textOf(raw.plan_name, 80)
  const summary = textOf(raw.summary, 300)
  if (!planName) add('plan_name', 'schema', 'plan_name must be 1-80 characters.')
  if (!summary) add('summary', 'schema', 'summary must be 1-300 characters.')

  // Meal definitions.
  const meals = new Map<string, LeanMeal>()
  const rawMeals = Array.isArray(raw.meals) ? raw.meals : []
  if (rawMeals.length === 0 || rawMeals.length > 48) add('meals', 'schema', 'meals must list 1-48 definitions.')
  for (const [index, item] of rawMeals.entries()) {
    const where = `meals[${index}]`
    if (!isRecord(item) || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,11}$/.test(item.id)) {
      add('meal_invalid', 'schema', `${where}: needs an id of 1-12 lowercase letters, digits or dashes.`)
      continue
    }
    if (meals.has(item.id)) add('meal_duplicate', 'schema', `${where}: id "${item.id}" is used twice.`)
    const slot = item.slot as MealSlot
    if (!brief.meals.slots.includes(slot)) {
      add('meal_slot', 'schema', `${where}: slot must be one of ${brief.meals.slots.join(', ')}.`)
      continue
    }
    const foodId = resolveFoodId(catalog, item.food)
    if (!foodId) {
      add('unknown_food', 'catalog_reference', `${where}: food "${String(item.food)}" is not in the catalog.`)
      continue
    }
    if (!briefResult.allowedFoodIds.has(foodId)) {
      add('food_not_allowed', 'catalog_reference', `${where}: food "${slugOf(foodId)}" is not in the brief's foods list.`)
      continue
    }
    if (!catalog.foods.get(foodId)!.meal_types.includes(slot)) {
      add('food_wrong_slot', 'catalog_reference', `${where}: food "${slugOf(foodId)}" is not allowed for ${slot}.`)
      continue
    }
    const altIds: string[] = []
    for (const alt of Array.isArray(item.alts) ? item.alts : []) {
      const altId = resolveFoodId(catalog, alt)
      if (!altId || !briefResult.allowedFoodIds.has(altId)) {
        add('alt_not_allowed', 'catalog_reference', `${where}: alt "${String(alt)}" is not in the brief's foods list.`)
      } else if (!catalog.foods.get(altId)!.meal_types.includes(slot)) {
        add('food_wrong_slot', 'catalog_reference', `${where}: alt "${slugOf(altId)}" is not allowed for ${slot}.`)
      } else if (altId !== foodId && !altIds.includes(altId)) {
        altIds.push(altId)
      }
    }
    if (altIds.length > Math.max(0, brief.meals.options - 1)) {
      altIds.splice(Math.max(0, brief.meals.options - 1))
      autoFixes.push(`${where}: extra alts trimmed`)
    }
    const note = textOf(item.note, 120)
    if (note === undefined) add('note_invalid', 'schema', `${where}: note must be null or 1-120 characters.`)
    meals.set(item.id, { id: item.id, slot, foodId, altIds, note: note ?? null })
  }

  // Workout definitions.
  const workouts = new Map<string, LeanWorkout>()
  const level = brief.training.level
  const injury = brief.training.injury
  for (const [index, item] of (Array.isArray(raw.workouts) ? raw.workouts : []).entries()) {
    const where = `workouts[${index}]`
    if (!isRecord(item) || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,11}$/.test(item.id)) {
      add('workout_invalid', 'schema', `${where}: needs an id of 1-12 lowercase letters, digits or dashes.`)
      continue
    }
    if (workouts.has(item.id)) add('workout_duplicate', 'schema', `${where}: id "${item.id}" is used twice.`)
    const type = item.type as LeanWorkout['type']
    const intensity = item.intensity as LeanWorkout['intensity']
    const title = textOf(item.title, 60)
    if (!WORKOUT_TYPES.includes(type)) add('workout_type', 'schema', `${where}: type must be one of ${WORKOUT_TYPES.join(', ')}.`)
    if (!INTENSITIES.includes(intensity)) add('workout_intensity', 'schema', `${where}: intensity must be low, moderate or high.`)
    if (!title) add('workout_title', 'schema', `${where}: title must be 1-60 characters.`)
    const light = LIGHT_TYPES.has(type)
    if (intensity === 'high' && (level === 'beginner' || injury || light)) {
      add('intensity_too_high', 'safety', `${where}: intensity high is not allowed for this user; use low or moderate.`)
    }
    const minutes = Number(item.minutes)
    const session = brief.training.session_min
    if (!Number.isInteger(minutes) || minutes < 10 || minutes > 120 || (!light && Math.abs(minutes - session) > 15)) {
      add('workout_minutes', 'schema', `${where}: minutes must be an integer within 15 of ${session}.`)
    }
    let rawItems = Array.isArray(item.items) ? item.items : []
    const [minItems, maxItems] = light ? [1, 6] : [3, 8]
    if (rawItems.length > maxItems) {
      rawItems = rawItems.slice(0, maxItems)
      autoFixes.push(`${where}: extra exercises trimmed`)
    }
    if (rawItems.length < minItems) {
      add('workout_items', 'schema', `${where}: ${type} needs ${minItems}-${maxItems} exercises.`)
    }
    const items: LeanWorkoutItem[] = []
    let totalSets = 0
    for (const [itemIndex, row] of rawItems.entries()) {
      const at = `${where}.items[${itemIndex}]`
      if (!isRecord(row)) {
        add('exercise_invalid', 'schema', `${at}: must be an object.`)
        continue
      }
      const exerciseId = resolveExerciseId(catalog, row.ex)
      if (!exerciseId) {
        add('unknown_exercise', 'catalog_reference', `${at}: exercise "${String(row.ex)}" is not in the catalog.`)
        continue
      }
      if (!briefResult.allowedExerciseIds.has(exerciseId)) {
        add('exercise_not_allowed', 'equipment', `${at}: exercise "${slugOf(exerciseId)}" is not in the brief's exercises list.`)
        continue
      }
      // Small numeric slips are clamped in code instead of costing a repair call. Clamping sets
      // happens before the volume cap below, so it can never push a workout past the safe total.
      let sets = Number(row.sets)
      const [minSets, maxSets] = light ? [1, 3] : [2, 5]
      if (Number.isFinite(sets) && sets > 0 && (!Number.isInteger(sets) || sets < minSets || sets > maxSets)) {
        sets = Math.min(maxSets, Math.max(minSets, Math.round(sets)))
        autoFixes.push(`${at}: sets clamped`)
      }
      if (!Number.isInteger(sets) || sets < minSets || sets > maxSets) {
        add('exercise_sets', 'schema', `${at}: sets must be ${minSets}-${maxSets}.`)
      }
      let repsText = typeof row.reps === 'string' ? row.reps : ''
      let reps = parseReps(repsText)
      if (!reps) {
        // "12 each side", "10-12 per leg", "۱۰ تکرار": keep the leading count or range.
        const lead = /^\s*([0-9۰-۹٠-٩]{1,3}(?:\s*[-–—]\s*[0-9۰-۹٠-٩]{1,3})?)(?:\s+\S.*)?$/.exec(repsText)
        const salvaged = lead ? parseReps(lead[1]!) : null
        if (salvaged) {
          reps = salvaged
          repsText = lead![1]!
          autoFixes.push(`${at}: reps trimmed to a count`)
        }
      }
      if (reps && reps.seconds === null && Number(reps.count.split('-').pop()) <= 3 && HOLD_EXERCISE.test(exerciseId)) {
        // A plank or other hold written as "1" rep: give it a time instead.
        reps = { count: '1', seconds: 30 }
        repsText = '30s'
        autoFixes.push(`${at}: hold given a time`)
      }
      if (!reps) add('exercise_reps', 'schema', `${at}: reps must be like "10", "8-12", "30s" or "20min".`)
      let rest = Number(row.rest)
      const [minRest, maxRest] = light ? [0, 60] : [45, 180]
      if (Number.isFinite(rest) && rest >= 0 && (!Number.isInteger(rest) || rest < minRest || rest > maxRest)) {
        rest = Math.min(maxRest, Math.max(minRest, Math.round(rest)))
        autoFixes.push(`${at}: rest clamped`)
      }
      if (!Number.isInteger(rest) || rest < minRest || rest > maxRest) {
        add('exercise_rest', 'schema', `${at}: rest must be ${minRest}-${maxRest} seconds.`)
      }
      let substituteId: string | null = null
      if (row.sub !== null && row.sub !== undefined) {
        const resolved = resolveExerciseId(catalog, row.sub)
        if (!resolved || !briefResult.allowedExerciseIds.has(resolved)) {
          add('substitute_not_allowed', 'equipment', `${at}: sub "${String(row.sub)}" is not in the brief's exercises list.`)
        } else if (catalog.exercises.get(exerciseId)?.substitutionIds.has(resolved)) {
          substituteId = resolved
        } else {
          autoFixes.push(`${at}: unpaired substitute cleared`)
        }
      }
      totalSets += Number.isInteger(sets) ? sets : 0
      items.push({ exerciseId, sets, reps: repsText, rest, substituteId })
    }
    if (!light && totalSets > SET_CAPS[level]) {
      add('workout_volume', 'safety', `${where}: ${totalSets} total sets; at most ${SET_CAPS[level]} for a ${level}.`)
    }
    const note = textOf(item.note, 120)
    if (note === undefined) add('note_invalid', 'schema', `${where}: note must be null or 1-120 characters.`)
    workouts.set(item.id, {
      id: item.id,
      title: title ?? '',
      type,
      minutes,
      intensity,
      items,
      note: note ?? null,
    })
  }

  // Days and the training calendar.
  const rawDays = Array.isArray(raw.days) ? raw.days : []
  const days: LeanDay[] = []
  const seen = new Set<number>()
  const trainDays = new Set(brief.training.train_days)
  const lightDays = new Set(brief.training.light_days)
  for (const [index, item] of rawDays.entries()) {
    const where = `days[${index}]`
    if (!isRecord(item) || !Number.isInteger(item.d) || Number(item.d) < 0 || Number(item.d) >= MONTHLY_PLAN_DAYS) {
      add('day_invalid', 'day_coverage', `${where}: d must be an integer 0-${MONTHLY_PLAN_DAYS - 1}.`)
      continue
    }
    const d = Number(item.d)
    if (seen.has(d)) add('day_duplicate', 'day_coverage', `${where}: day ${d} appears twice.`)
    seen.add(d)
    const mealIds = Array.isArray(item.meals) ? item.meals.filter((id): id is string => typeof id === 'string') : []
    const slots = mealIds.map((id) => meals.get(id)?.slot)
    if (mealIds.some((id) => !meals.has(id) && rawMeals.every((meal) => !isRecord(meal) || meal.id !== id))) {
      add('day_unknown_meal', 'schema', `day ${d}: meals must reference meal ids defined in meals.`)
    } else if (slots.join(',') !== brief.meals.slots.join(',') && slots.every(Boolean)) {
      add('day_slots', 'schema', `day ${d}: meals must be one per slot in order: ${brief.meals.slots.join(', ')}.`)
    }
    let workoutId = typeof item.workout === 'string' ? item.workout : null
    // Extra training is never forced on a rest or light day: drop it in code (the safe direction).
    if (workoutId && !trainDays.has(d) && workouts.has(workoutId) &&
      !(lightDays.has(d) && LIGHT_TYPES.has(workouts.get(workoutId)!.type))) {
      workoutId = null
      autoFixes.push(`day ${d}: workout on a rest day removed`)
    }
    const workout = workoutId ? workouts.get(workoutId) : undefined
    if (workoutId && !workout && !(Array.isArray(raw.workouts) && raw.workouts.some((w) => isRecord(w) && w.id === workoutId))) {
      add('day_unknown_workout', 'schema', `day ${d}: workout "${workoutId}" is not defined.`)
    }
    // Someone whose chosen activity is walking or mobility trains with exactly that.
    const lightFocus = brief.training.focus === 'walk' || brief.training.focus === 'mobility'
    if (trainDays.has(d) && (!workoutId || (workout && LIGHT_TYPES.has(workout.type) && !lightFocus))) {
      add('training_day_missing', 'schema', lightFocus
        ? `day ${d} is a training day: it needs a workout.`
        : `day ${d} is a training day: it needs a non-walk, non-mobility workout.`)
    } else if (lightDays.has(d) && workout && !LIGHT_TYPES.has(workout.type)) {
      add('light_day_too_hard', 'safety', `day ${d} is a light day: use a walk or mobility workout or null.`)
    } else if (!trainDays.has(d) && !lightDays.has(d) && workoutId) {
      add('rest_day_workout', 'safety', `day ${d} is a rest day: workout must be null.`)
    }
    const note = textOf(item.note, 120)
    if (note === undefined) add('note_invalid', 'schema', `day ${d}: note must be null or 1-120 characters.`)
    days.push({ d, meals: mealIds, workout: workoutId, note: note ?? null })
  }
  if (rawDays.length !== MONTHLY_PLAN_DAYS || seen.size !== MONTHLY_PLAN_DAYS) {
    const missing = Array.from({ length: MONTHLY_PLAN_DAYS }, (_, d) => d).filter((d) => !seen.has(d))
    add('day_coverage', 'day_coverage', `days must cover 0-${MONTHLY_PLAN_DAYS - 1} exactly once${missing.length ? `; missing ${missing.join(', ')}` : ''}.`)
  }
  days.sort((a, b) => a.d - b.d)

  // Consecutive high-intensity sessions.
  for (let d = 1; d < days.length; d += 1) {
    const today = days[d]?.workout ? workouts.get(days[d]!.workout!) : undefined
    const yesterday = days[d - 1]?.workout ? workouts.get(days[d - 1]!.workout!) : undefined
    if (today?.intensity === 'high' && yesterday?.intensity === 'high') {
      add('back_to_back_high', 'safety', `days ${d - 1} and ${d}: no two high-intensity workouts in a row.`)
    }
  }

  // Variety per slot (only where the allowlist offers enough choice).
  const allowedPerSlot = (slot: MealSlot) =>
    [...briefResult.allowedFoodIds].filter((id) => catalog.foods.get(id)?.meal_types.includes(slot)).length
  for (const slot of brief.meals.slots) {
    const sequence = days.map((day) => day.meals.map((id) => meals.get(id)).find((meal) => meal?.slot === slot)?.foodId)
    const distinct = new Set(sequence.filter(Boolean)).size
    const wanted = Math.min(4, allowedPerSlot(slot))
    if (distinct < wanted) {
      add('variety_low', 'other', `${slot}: use at least ${wanted} different foods across the month (now ${distinct}).`)
    }
    let run = 1
    for (let i = 1; i < sequence.length; i += 1) {
      run = sequence[i] && sequence[i] === sequence[i - 1] ? run + 1 : 1
      if (run > 3 && allowedPerSlot(slot) > 1) {
        add('variety_repeat', 'other', `${slot}: the same food appears more than 3 days in a row (around day ${i}).`)
        break
      }
    }
  }
  if (brief.meals.slots.includes('lunch') && brief.meals.slots.includes('dinner')) {
    for (const day of days) {
      const foods = day.meals.map((id) => meals.get(id))
      const lunch = foods.find((meal) => meal?.slot === 'lunch')?.foodId
      const dinner = foods.find((meal) => meal?.slot === 'dinner')?.foodId
      if (lunch && lunch === dinner) {
        add('lunch_equals_dinner', 'other', `day ${day.d}: lunch and dinner must be different foods.`)
      }
    }
  }

  // Language and text safety.
  const texts = [
    planName, summary,
    ...[...meals.values()].map((meal) => meal.note),
    ...[...workouts.values()].flatMap((workout) => [workout.title, workout.note]),
    ...days.map((day) => day.note),
  ]
  const tips = isRecord(raw.tips) ? raw.tips : {}
  const restaurantTips = (Array.isArray(tips.restaurant) ? tips.restaurant : [])
    .map((tip) => textOf(tip, 140)).filter((tip): tip is string => Boolean(tip)).slice(0, 3)
  const generalTips = (Array.isArray(tips.general) ? tips.general : [])
    .map((tip) => textOf(tip, 140)).filter((tip): tip is string => Boolean(tip)).slice(0, 3)
  if (restaurantTips.length === 0) add('tips_restaurant', 'schema', 'tips.restaurant needs 1-3 tips of up to 140 characters.')

  // Recipes: steps only. Ingredients and amounts always come from the catalog.
  const usedFoodIds = new Set([...meals.values()].flatMap((meal) => [meal.foodId, ...meal.altIds]))
  const recipes = new Map<string, LeanRecipe>()
  const allergenTerms = [...ctx.declaredAllergenIds]
    .flatMap((id) => [...(catalog.allergens.get(id)?.terms ?? [])])
    .filter((term) => term.length >= 2)
  const vegetarian = brief.diet.pattern === 'vegetarian' || brief.diet.pattern === 'vegan'
  for (const [index, item] of (Array.isArray(raw.recipes) ? raw.recipes : []).entries()) {
    const where = `recipes[${index}]`
    if (!isRecord(item)) {
      add('recipe_invalid', 'schema', `${where}: must be an object.`)
      continue
    }
    const foodId = resolveFoodId(catalog, item.food)
    // A recipe for a food the plan doesn't use (often one whose meal was rejected) is harmless: drop it.
    if (!foodId || !usedFoodIds.has(foodId)) {
      autoFixes.push(`${where}: recipe for an unused food dropped`)
      continue
    }
    if (recipes.has(foodId)) continue
    const prep = Number(item.prep_min)
    const cook = Number(item.cook_min)
    const steps = (Array.isArray(item.steps) ? item.steps : []).map((step) => textOf(step, 160))
    if (!Number.isInteger(prep) || prep < 0 || prep > 120 || !Number.isInteger(cook) || cook < 0 || cook > 240) {
      add('recipe_minutes', 'schema', `${where}: prep_min must be 0-120 and cook_min 0-240.`)
    }
    if (steps.length < 1 || steps.length > 5 || steps.some((step) => !step)) {
      add('recipe_steps', 'schema', `${where}: steps must be 1-5 texts of 1-160 characters.`)
      continue
    }
    const corpus = termText(steps.join(' '))
    const allergen = allergenTerms.find((term) => corpus.includes(` ${term} `))
    if (allergen) {
      add('recipe_allergen', 'allergen', `${where}: the steps mention "${allergen}", which this user is allergic to. Use only the food's listed ingredients.`)
    }
    if (vegetarian) {
      const meatFree = termText(steps.join(' ').replace(EGG_PHRASES, ' '))
      const meat = MEAT_TERMS.find((term) => meatFree.includes(termText(term)))
      if (meat) add('recipe_not_vegetarian', 'allergen', `${where}: the user is ${brief.diet.pattern}; the steps mention "${meat}".`)
    }
    recipes.set(foodId, { prep_minutes: prep, cook_minutes: cook, steps: steps as string[] })
  }
  const missingRecipes = [...usedFoodIds].filter((id) => !recipes.has(id)).length
  if (missingRecipes > 0) warnings.push(`${missingRecipes} foods have no recipe`)
  const recipeText = [...recipes.values()].flatMap((recipe) => recipe.steps)
  const allText = [...texts, ...restaurantTips, ...generalTips, ...recipeText].filter((text): text is string => Boolean(text))
  const persian = /[؀-ۿ]/
  const heading = `${planName ?? ''} ${summary ?? ''}`
  if (ctx.locale === 'fa-IR' ? !persian.test(heading) : persian.test(heading)) {
    add('wrong_language', 'other', `plan_name and summary must be written in ${ctx.locale === 'fa-IR' ? 'Persian' : 'English'}.`)
  }
  if (allText.some((text) => NUTRITION_NUMBER.test(normalizeDigits(text)))) {
    add('nutrition_number_in_text', 'safety', 'Text must not contain calorie or gram numbers; the server adds them.')
  }
  if (deterministicSafetyDecision(allText.join('\n'))) {
    add('unsafe_text', 'safety', 'Text contains content that is not allowed (medical, self-harm or similar). Rewrite the notes.')
  }

  // Progression: soft check, recorded for review.
  const blockSets = [[0, 13], [14, 20], [21, 29]].map(([from, to]) =>
    days.filter((day) => day.d >= from! && day.d <= to!).reduce((sum, day) => {
      const workout = day.workout ? workouts.get(day.workout) : undefined
      return sum + (workout ? workout.items.reduce((total, item) => total + item.sets, 0) : 0)
    }, 0) / ((to! - from! + 1) / 7)
  )
  for (let block = 1; block < blockSets.length; block += 1) {
    if (blockSets[block - 1]! > 0 && blockSets[block]! > blockSets[block - 1]! * 1.2) {
      warnings.push(`weekly sets rise more than 20% into block ${block + 1}`)
    }
  }

  if (issues.length > 0) return { ok: false, issues }
  return {
    ok: true,
    plan: {
      planName: planName!,
      summary: summary!,
      recipes,
      meals,
      workouts,
      days,
      restaurantTips,
      generalTips,
    },
    warnings,
    autoFixes,
  }
}

const SLOT_LABELS: Record<'fa-IR' | 'en-US', Record<MealSlot, string>> = {
  'fa-IR': {
    breakfast: 'صبحانه',
    morning_snack: 'میان‌وعده صبح',
    lunch: 'ناهار',
    afternoon_snack: 'میان‌وعده عصر',
    dinner: 'شام',
    pre_sleep: 'میان‌وعده شب',
  },
  'en-US': {
    breakfast: 'Breakfast',
    morning_snack: 'Morning snack',
    lunch: 'Lunch',
    afternoon_snack: 'Afternoon snack',
    dinner: 'Dinner',
    pre_sleep: 'Evening snack',
  },
}

const SLOT_TIMES: Record<MealSlot, string> = {
  breakfast: '08:00',
  morning_snack: '10:30',
  lunch: '13:00',
  afternoon_snack: '16:30',
  dinner: '19:30',
  pre_sleep: '21:30',
}

const COPY = {
  'fa-IR': {
    day: 'روز',
    training: 'روز تمرین: انرژی کافی برای جلسه و ریکاوری',
    rest: 'روز استراحت: همان هدف روزانه، بدون تمرین',
    light: 'روز سبک: پیاده‌روی یا تحرک آرام',
    restaurant: 'غذا خوردن بیرون',
    stop: 'در صورت درد، سرگیجه یا علائم غیرعادی تمرین را متوقف کنید.',
    injury: 'به‌خاطر آسیبی که گفتی، حرکاتی که به آن ناحیه فشار می‌آورند حذف شده‌اند. هر حرکتی که درد دارد را کنار بگذار.',
    seconds: (value: number) => value >= 60 ? `${Math.round(value / 60)} دقیقه` : `${value} ثانیه`,
  },
  'en-US': {
    day: 'Day',
    training: 'Training day: enough energy for the session and recovery',
    rest: 'Rest day: same daily target, no workout',
    light: 'Light day: a walk or gentle mobility',
    restaurant: 'Eating out',
    stop: 'Stop exercising if pain, dizziness, or unusual symptoms occur.',
    injury: 'Because of the injury you reported, movements that load that area are left out. Skip any movement that hurts.',
    seconds: (value: number) => value >= 60 ? `${Math.round(value / 60)} min` : `${value} s`,
  },
} as const

function dayTargets(targets: PlanTargets, training: boolean) {
  return {
    calories: targets.calories,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
    fiber_g: targets.fiber_g,
    water_ml: training ? targets.water_ml_training_day : targets.water_ml_rest_day,
  }
}

interface MealNutrition {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

function scaled(food: CatalogFood, multiplier: number): MealNutrition {
  return {
    calories: food.nutrition.calories * multiplier,
    protein_g: food.nutrition.protein_g * multiplier,
    carbs_g: food.nutrition.carbs_g * multiplier,
    fat_g: food.nutrition.fat_g * multiplier,
  }
}

function sum(items: MealNutrition[]): MealNutrition {
  return items.reduce((total, item) => ({
    calories: total.calories + item.calories,
    protein_g: total.protein_g + item.protein_g,
    carbs_g: total.carbs_g + item.carbs_g,
    fat_g: total.fat_g + item.fat_g,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
}

/**
 * Per-meal serving multipliers for one day, chosen in code. Starts from a uniform scale, then a
 * deterministic local search on a step grid minimises a weighted error (calories first, then
 * protein, then carbs/fat). Quarter servings are tried first because they read better
 * ("1.25 portions"); a 0.05 grid is the fallback when quarters can't reach +-5%.
 */
export function scaleDayPortions(
  foods: readonly CatalogFood[],
  targets: Pick<PlanTargets, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>,
): { multipliers: number[]; totals: MealNutrition } {
  const error = (totals: MealNutrition) => {
    const rel = (actual: number, target: number) => target > 0 ? (actual - target) / target : 0
    const protein = rel(totals.protein_g, targets.protein_g)
    const calories = rel(totals.calories, targets.calories)
    // Calories inside +-4.5% are a hard requirement: macros never pull a day out of that band.
    const outside = Math.max(0, Math.abs(calories) - 0.045)
    return 1e4 * outside ** 2 + 10 * calories ** 2 +
      3 * (protein < 0 ? protein * 1.5 : protein * 0.5) ** 2 +
      rel(totals.carbs_g, targets.carbs_g) ** 2 + rel(totals.fat_g, targets.fat_g) ** 2
  }
  const evaluate = (multipliers: number[]) =>
    sum(foods.map((food, index) => scaled(food, multipliers[index]!)))
  let best: { multipliers: number[]; totals: MealNutrition } | null = null
  for (const step of [0.25, 0.05]) {
    const snap = (value: number) =>
      Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, Math.round(value / step) * step))
    const base = sum(foods.map((food) => scaled(food, 1))).calories
    let multipliers = foods.map(() => snap(base > 0 ? targets.calories / base : 1))
    let current = error(evaluate(multipliers))
    for (let iteration = 0; iteration < 200; iteration += 1) {
      let improved: number[] | null = null
      for (let index = 0; index < multipliers.length; index += 1) {
        for (const delta of [step, -step]) {
          const candidate = [...multipliers]
          candidate[index] = snap(candidate[index]! + delta)
          const value = error(evaluate(candidate))
          if (value < current - 1e-12) {
            current = value
            improved = candidate
          }
        }
      }
      if (!improved) break
      multipliers = improved
    }
    multipliers = multipliers.map((value) => Math.round(value * 100) / 100)
    best = { multipliers, totals: evaluate(multipliers) }
    if (Math.abs(best.totals.calories - targets.calories) <= targets.calories * CALORIE_TOLERANCE) break
  }
  return best!
}

export type PlanBuildResult =
  | { ok: true; content: Record<string, unknown>; quality: PlanQualityReport }
  | { ok: false; issues: PlanIssue[] }

/** Lean plan -> stored plan contract, with code-computed targets and code-scaled portions. */
export function buildPlanFromLean(
  lean: LeanPlan,
  ctx: ValidationContext,
  extra: { warnings?: string[]; autoFixes?: string[] } = {},
): PlanBuildResult {
  const { catalog, locale } = ctx
  const { brief, targets } = ctx.brief
  const copy = COPY[locale]
  const trainDays = new Set(brief.training.train_days)
  const lightDays = new Set(brief.training.light_days)

  // Restaurant estimate: a typical main-meal share of the day's target, labelled an estimate.
  const share = 0.35
  const restaurantNutrition = {
    calories: Math.round(targets.calories * share),
    protein_g: Math.round(targets.protein_g * share),
    carbs_g: Math.round(targets.carbs_g * share),
    fat_g: Math.round(targets.fat_g * share),
    fiber_g: Math.round(targets.fiber_g * share),
    confidence: 'low',
    source: 'model_estimate',
  }
  const emergencyFoodIds = [...ctx.brief.allowedFoodIds]
    .map((id) => catalog.foods.get(id)!)
    .sort((a, b) => Number(b.portable) - Number(a.portable) || b.nutrition.protein_g - a.nutrition.protein_g || (a.id < b.id ? -1 : 1))
    .slice(0, 3)
    .map((food) => food.id)

  const compact: Record<string, unknown> = {
    schema_version: COMPACT_SCHEMA_VERSION,
    content_locale: locale,
    plan_name: lean.planName,
    summary: lean.summary,
    default_targets: dayTargets(targets, false),
    meal_definitions: [...lean.meals.values()].map((meal) => ({
      meal_def_id: meal.id,
      type: meal.slot,
      title: SLOT_LABELS[locale][meal.slot],
      scheduled_time: SLOT_TIMES[meal.slot],
      food_id: meal.foodId,
      serving_multiplier: 1,
      alt_food_ids: meal.altIds,
      note: meal.note,
    })),
    workout_definitions: [...lean.workouts.values()].map((workout) => ({
      workout_def_id: workout.id,
      title: workout.title,
      training_type: workout.type,
      duration_minutes: workout.minutes,
      intensity: workout.intensity,
      exercises: workout.items.map((item) => {
        const reps = parseReps(item.reps)!
        return {
          exercise_id: item.exerciseId,
          sets: item.sets,
          reps: reps.count,
          rest_seconds: item.rest,
          intensity_note: reps.seconds ? copy.seconds(reps.seconds) : null,
          substitution_exercise_id: item.substituteId,
        }
      }),
      safety_note: [brief.training.injury ? copy.injury : null, workout.note]
        .filter(Boolean).join(' ') || null,
    })),
    days: lean.days.map((day) => ({
      day_index: day.d,
      title: `${copy.day} ${day.d + 1}`,
      meal_def_ids: day.meals,
      workout_def_id: day.workout,
      target_mode: trainDays.has(day.d) ? 'training_day' : lightDays.has(day.d) ? 'recovery_day' : 'rest_day',
      target_rationale: trainDays.has(day.d) ? copy.training : lightDays.has(day.d) ? copy.light : copy.rest,
      serving_overrides: [],
      progression_note: null,
      notes: day.note ? [day.note] : [],
    })),
    emergency_food_ids: emergencyFoodIds,
    restaurant_guide: [{
      title: copy.restaurant,
      order_instructions: lean.restaurantTips,
      estimated_nutrition: restaurantNutrition,
    }],
    health_safety_notes: [
      { category: 'training', level: 'caution', note: copy.stop },
      ...(brief.training.injury ? [{ category: 'training', level: 'caution', note: copy.injury }] : []),
      ...lean.generalTips.map((note) => ({ category: 'general', level: 'info', note })),
    ],
  }

  let plan: Record<string, unknown>
  try {
    plan = stripExpansionMetadata(expandCompactPlan(compact, catalog, locale))
  } catch (error) {
    const code = error instanceof HttpError ? error.code : 'expansion_failed'
    return { ok: false, issues: [{ code, category: 'schema', detail: `The plan could not be expanded (${code}).` }] }
  }

  // Portions: scale each day's default meals to the computed targets, alternatives to match.
  const issues: PlanIssue[] = []
  const warnings = [...(extra.warnings ?? [])]
  let maxDeviation = 0
  let minProtein = Infinity
  const groceryRefs: Array<{ foodId: string; multiplier: number }> = []
  const cache = new Map<string, number[]>()
  for (const day of plan.days as Record<string, unknown>[]) {
    const dayIndex = Number(day.day_index)
    const training = trainDays.has(dayIndex)
    day.targets = dayTargets(targets, training)
    const dayMeals = day.meals as Record<string, unknown>[]
    const defaults = dayMeals.map((meal) => {
      const options = meal.options as Record<string, unknown>[]
      return catalog.foods.get(String(options[0]!.food_id))!
    })
    const key = defaults.map((food) => food.id).join('|')
    const multipliers = cache.get(key) ?? scaleDayPortions(defaults, targets).multipliers
    cache.set(key, multipliers)
    const totals = sum(defaults.map((food, index) => scaled(food, multipliers[index]!)))
    const deviation = Math.abs(totals.calories - targets.calories) / targets.calories
    maxDeviation = Math.max(maxDeviation, deviation)
    minProtein = Math.min(minProtein, totals.protein_g / Math.max(1, targets.protein_g))
    if (deviation > CALORIE_TOLERANCE) {
      issues.push({
        code: 'calories_unreachable',
        category: 'nutrition_arithmetic',
        detail: `day ${dayIndex}: the chosen foods cannot reach ${targets.calories} kcal within 5% at sensible portions; pick more or less energy-dense foods for this day.`,
      })
    } else if (totals.protein_g < targets.protein_g * PROTEIN_HARD_FLOOR) {
      issues.push({
        code: 'protein_too_low',
        category: 'nutrition_arithmetic',
        detail: `day ${dayIndex}: protein reaches only ${Math.round(totals.protein_g)} of ${targets.protein_g} g; choose more protein-dense foods.`,
      })
    }
    dayMeals.forEach((meal, index) => {
      const multiplier = multipliers[index]!
      const primaryCalories = defaults[index]!.nutrition.calories * multiplier
      const options = meal.options as Record<string, unknown>[]
      // expandCompactPlan keys the primary option "<meal def id>-primary".
      const mealNote = lean.meals.get(String(options[0]!.option_key).replace(/-primary$/, ''))?.note ?? null
      meal.options = options.map((option, optionIndex) => {
        const food = catalog.foods.get(String(option.food_id))!
        const optionMultiplier = optionIndex === 0 ? multiplier : Math.min(
          MAX_MULTIPLIER,
          Math.max(MIN_MULTIPLIER, Math.round((primaryCalories / Math.max(1, food.nutrition.calories)) * 4) / 4),
        )
        return {
          ...assembleMealOption({
            catalog,
            foodId: food.id,
            optionKey: String(option.option_key),
            locale,
            servingMultiplier: optionMultiplier,
            note: optionIndex === 0 ? mealNote : null,
          }),
          recipe: lean.recipes.get(food.id) ?? null,
        }
      })
      groceryRefs.push({ foodId: defaults[index]!.id, multiplier })
    })
  }
  if (issues.length) return { ok: false, issues: issues.slice(0, 10) }
  if (minProtein < PROTEIN_SOFT_FLOOR) warnings.push(`protein reaches ${Math.round(minProtein * 100)}% of target on some days`)

  plan.default_targets = dayTargets(targets, false)
  for (const option of plan.emergency_options as Record<string, unknown>[]) {
    option.recipe = lean.recipes.get(String(option.food_id)) ?? null
  }
  plan.grocery_list = aggregateGroceryList(catalog, groceryRefs, locale)

  try {
    if (deterministicSafetyDecision(JSON.stringify(plan))) {
      throw new HttpError(422, 'unsafe_text', 'Plan text failed the safety check.')
    }
    assertGeneratedPlan(plan, MONTHLY_PLAN_DAYS, locale, {
      catalog,
      declaredAllergenIds: ctx.declaredAllergenIds,
      minimumCalories: Math.min(targets.calories, 6_000),
    })
  } catch (error) {
    const code = error instanceof HttpError ? error.code : 'contract_failed'
    return {
      ok: false,
      issues: [{ code, category: code.includes('allergen') ? 'allergen' : 'schema', detail: `The expanded plan failed the final contract check (${code}).` }],
    }
  }

  const distinct: Record<string, number> = {}
  for (const slot of brief.meals.slots) {
    distinct[slot] = new Set(lean.days.map((day) =>
      day.meals.map((id) => lean.meals.get(id)).find((meal) => meal?.slot === slot)?.foodId
    ).filter(Boolean)).size
  }
  return {
    ok: true,
    content: plan,
    quality: {
      validator_version: PLAN_VALIDATOR_VERSION,
      max_calorie_deviation_pct: Math.round(maxDeviation * 1000) / 10,
      min_protein_pct: Math.round(minProtein * 100),
      distinct_foods_per_slot: distinct,
      warnings,
      auto_fixes: extra.autoFixes ?? [],
    },
  }
}

/** Parse + validate + build. The single entry point the pipeline uses for every candidate. */
export function validateAndBuildPlan(raw: unknown, ctx: ValidationContext): PlanBuildResult {
  const lean = validateLeanPlan(raw, ctx)
  if (!lean.ok) return lean
  return buildPlanFromLean(lean.plan, ctx, { warnings: lean.warnings, autoFixes: lean.autoFixes })
}
