import { optionalEnv } from './config.ts'
import { sha256 } from './crypto.ts'
import {
  availableEquipmentSlugs,
  exerciseFitsEquipment,
} from './exercise-selection.ts'
import {
  EXERCISE_PROFILE_VERSION,
  exerciseAllowedFor,
  normalizeLevel,
  type TrainingLevel,
} from './exercise-profile.ts'
import type { GenerationProfileSnapshot } from './generation-profile-snapshot.ts'
import { HttpError } from './http.ts'
import type { CatalogExercise, CatalogFood, PlanCatalogSnapshot } from './plan-catalog.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import {
  computePlanTargets,
  currentWeightKg,
  type PlanTargets,
  sessionMinutes,
  targetInputsFromSnapshot,
} from './plan-targets.ts'

/**
 * Stage 3: the compact per-user brief the model sees. Built only from structured onboarding
 * answers and the computed targets; free text is reduced to keyword flags (one sanitized
 * cycle note is the exception). Carries a pseudonymous reference, never the user id, name, email
 * or phone. Foods and exercises are pre-filtered allowlists, sent as positional rows to save
 * tokens; the column order is documented once in the static system prompt.
 */
export const BRIEF_VERSION = 'momentum-plan-brief/1.0.0'

export const MEAL_SLOT_ORDER = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'pre_sleep',
] as const
export type MealSlot = typeof MEAL_SLOT_ORDER[number]

/** Short meal-type codes used in the food rows. */
export const MEAL_CODES: Record<MealSlot, string> = {
  breakfast: 'b',
  morning_snack: 'ms',
  lunch: 'l',
  afternoon_snack: 'as',
  dinner: 'd',
  pre_sleep: 'ps',
}

const MAX_FOODS = 36
const FOODS_PER_SLOT = 6
const MAX_EXERCISES = 110
const MAX_TRAINING_DAYS_PER_WEEK = 6

export type CookingFlag = 'quick' | 'no_cooking' | 'meal_prep' | 'portable_lunch' | 'no_oven'

export interface PlanBrief {
  v: typeof BRIEF_VERSION
  ref: string
  lang: 'fa-IR' | 'en-US'
  region: 'ir' | 'intl'
  country: string | null
  cuisine: string | null
  cycle: number
  goal: PlanTargets['goal']
  person: {
    sex: string | null
    age: number
    height_cm: number
    weight_kg: number
    target_weight_kg: number | null
  }
  targets: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
    water_ml_rest: number
    water_ml_training: number
  }
  diet: {
    pattern: string
    budget: string
    cooking: CookingFlag[]
    restaurant_per_week: number
    favorites: string[]
  }
  meals: { slots: MealSlot[]; options: number }
  training: {
    level: TrainingLevel
    location: string | null
    focus: string | null
    days_per_week: number
    session_min: number
    injury: boolean
    start_weekday: number
    train_days: number[]
    light_days: number[]
  }
  history: Record<string, number | string> | null
  foods: Array<[string, string, number, number]>
  exercises: Array<[string, string, string, string]>
}

export interface PlanBriefResult {
  brief: PlanBrief
  targets: PlanTargets
  /** Full catalog ids the plan may use; the validator rejects anything else. */
  allowedFoodIds: ReadonlySet<string>
  allowedExerciseIds: ReadonlySet<string>
  /** Why the allowlists were relaxed, if they were (dislikes only; allergens never relax). */
  relaxations: string[]
  exerciseProfileVersion: typeof EXERCISE_PROFILE_VERSION
}

function slugOf(id: string): string {
  return id.replace(/^[a-z]+:/, '').replace(/@v\d+$/, '')
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[‌\-_]+/g, ' ').trim()
}

/** Pseudonymous, stable per user, not reversible without the server pepper. */
export async function pseudonymousRef(userId: string): Promise<string> {
  const pepper = optionalEnv('OPENAI_SAFETY_PEPPER') ?? 'momentum-plan-brief'
  const hex = (await sha256(`brief:${pepper}:${userId}`)).slice(0, 16)
  // Letters only, so no digit run in the ref can look like a phone number to the PII check.
  return [...hex].map((char) => 'abcdefghijklmnop'[parseInt(char, 16)]).join('')
}

/** "3 meals", "۴ وعده" or "3 meals. no breakfast" -> 3; anything else -> 3. */
export function mealCount(pattern: string | null): number {
  const digits = (pattern ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  const match = /^\s*([2-6])\b/.exec(digits)
  return match ? Number(match[1]) : 3
}

export function mealSlotsFor(count: number): MealSlot[] {
  const byCount: Record<number, MealSlot[]> = {
    2: ['lunch', 'dinner'],
    3: ['breakfast', 'lunch', 'dinner'],
    4: ['breakfast', 'lunch', 'afternoon_snack', 'dinner'],
    5: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'],
    6: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_sleep'],
  }
  return byCount[count] ?? byCount[3]!
}

const COOKING_TERMS: Record<CookingFlag, readonly string[]> = {
  quick: ['quick', 'fast', 'minute', 'busy', 'سریع', 'وقت ندارم', 'کم وقت', 'دقیقه'],
  no_cooking: ['no cook', 'cannot cook', "can't cook", 'بدون پخت', 'آشپزی نمی', 'آشپزی بلد نیستم'],
  meal_prep: ['meal prep', 'batch', 'prep', 'از قبل', 'آماده کنم', 'یکجا'],
  portable_lunch: ['office', 'work', 'lunchbox', 'lunch box', 'محل کار', 'اداره', 'سر کار'],
  no_oven: ['no oven', 'without oven', 'بدون فر', 'فر ندارم'],
}

export function cookingFlags(texts: readonly (string | null)[]): CookingFlag[] {
  const corpus = texts.filter((item): item is string => Boolean(item)).map(normalized).join(' | ')
  return (Object.keys(COOKING_TERMS) as CookingFlag[]).filter((flag) =>
    COOKING_TERMS[flag].some((term) => corpus.includes(normalized(term)))
  )
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const URL = /\b(?:https?:\/\/|www\.)\S+/gi
const LONG_NUMBER = /[0-9۰-۹٠-٩][0-9۰-۹٠-٩\s\-()+]{5,}[0-9۰-۹٠-٩]/g

/** Strips emails, links and phone-like digit runs from user free text. */
export function sanitizeFreeText(value: string | null, max = 200): string | null {
  if (!value) return null
  const cleaned = value.replace(EMAIL, ' ').replace(URL, ' ').replace(LONG_NUMBER, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max)
  return cleaned || null
}

/** Throws if anything identifying slipped into a brief. Runs on every brief before it is sent. */
export function assertBriefPiiFree(
  brief: unknown,
  forbidden: readonly (string | null | undefined)[] = [],
): void {
  const text = JSON.stringify(brief)
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const leaked = new RegExp(EMAIL.source).test(text) || uuid.test(text) ||
    new RegExp(LONG_NUMBER.source).test(text) ||
    forbidden.some((value) => value && value.trim().length >= 3 && text.includes(value.trim()))
  if (leaked) {
    throw new HttpError(500, 'BRIEF_PII_DETECTED', 'The plan brief failed its privacy check.')
  }
}

const MEAT_OR_FISH = /chicken|turkey|beef|lamb|veal|meat|kebab|kabab|sausage|ham|bacon|tuna|salmon|fish|shrimp|prawn|seafood/
const ANIMAL_PRODUCT = /egg|milk|yogh?urt|cheese|feta|cottage|^butter$|^ghee$|cream|whey|honey|kashk/
const PLANT_MILK = /(almond|soy|oat|coconut|rice)-milk/

function isAnimalProduct(slug: string): boolean {
  return ANIMAL_PRODUCT.test(slug) && !PLANT_MILK.test(slug)
}

function foodIngredientSlugs(catalog: PlanCatalogSnapshot, food: CatalogFood): string[] {
  return [...food.ingredientIds].map((id) => slugOf(id))
}

function fitsDietPattern(
  catalog: PlanCatalogSnapshot,
  food: CatalogFood,
  pattern: string | null,
): boolean {
  if (pattern !== 'vegetarian' && pattern !== 'vegan') return true
  const slugs = foodIngredientSlugs(catalog, food)
  if (slugs.some((slug) => MEAT_OR_FISH.test(slug))) return false
  if (pattern === 'vegan' && slugs.some(isAnimalProduct)) return false
  return true
}

function foodHasAllergen(
  catalog: PlanCatalogSnapshot,
  food: CatalogFood,
  declaredAllergenIds: ReadonlySet<string>,
): boolean {
  return [...food.ingredientIds].some((ingredientId) => {
    const ingredient = catalog.ingredients.get(ingredientId)
    return ingredient ? [...ingredient.allergenIds].some((id) => declaredAllergenIds.has(id)) : false
  })
}

function foodTerms(catalog: PlanCatalogSnapshot, food: CatalogFood): string {
  const ingredientNames = [...food.ingredientIds].flatMap((id) => {
    const ingredient = catalog.ingredients.get(id)
    return ingredient ? [ingredient.name_en, ingredient.name_fa, slugOf(id)] : []
  })
  return normalized([food.name_en, food.name_fa, slugOf(food.id), ...ingredientNames].join(' '))
}

function matchesAny(terms: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => {
    const value = normalized(phrase)
    return value.length >= 2 && terms.includes(value)
  })
}

function selectFoods(input: {
  catalog: PlanCatalogSnapshot
  snapshot: GenerationProfileSnapshot
  declaredAllergenIds: ReadonlySet<string>
  slots: MealSlot[]
  relaxations: string[]
}): { foods: CatalogFood[]; favorites: string[]; slots: MealSlot[] } {
  const { catalog, snapshot, declaredAllergenIds } = input
  const dietary = snapshot.dietary
  // Hard: allergens and diet pattern. Never relaxed.
  const safe = [...catalog.foods.values()]
    .filter((food) => !foodHasAllergen(catalog, food, declaredAllergenIds))
    .filter((food) => fitsDietPattern(catalog, food, dietary.dietary_pattern))
  const liked = safe.filter((food) => !matchesAny(foodTerms(catalog, food), dietary.disliked_foods))

  const score = (food: CatalogFood) => {
    let value = matchesAny(foodTerms(catalog, food), dietary.favorite_foods) ? 5 : 0
    if (food.portable) value += 1
    return value
  }
  const ranked = (pool: CatalogFood[]) =>
    [...pool].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const selected = new Map<string, CatalogFood>()
  const slots: MealSlot[] = []
  for (const slot of input.slots) {
    let pool = ranked(liked).filter((food) => food.meal_types.includes(slot))
    if (pool.length < 2) {
      // Dislikes are a preference: relax them for this slot rather than leave it empty.
      const relaxed = ranked(safe).filter((food) => food.meal_types.includes(slot))
      if (relaxed.length > pool.length) {
        input.relaxations.push(`dislikes_relaxed:${slot}`)
        pool = relaxed
      }
    }
    if (pool.length === 0) {
      if (slot === 'breakfast' || slot === 'lunch' || slot === 'dinner') {
        throw new HttpError(
          422,
          'CATALOG_SUBSET_INSUFFICIENT',
          'No allowed catalog food covers a main meal under the hard constraints.',
        )
      }
      input.relaxations.push(`slot_dropped:${slot}`)
      continue
    }
    slots.push(slot)
    for (const food of pool.slice(0, FOODS_PER_SLOT)) selected.set(food.id, food)
  }
  for (const food of ranked(liked)) {
    if (selected.size >= MAX_FOODS) break
    if (food.meal_types.some((type) => slots.includes(type as MealSlot))) {
      selected.set(food.id, food)
    }
  }
  const foods = [...selected.values()]
  const favorites = foods
    .filter((food) => matchesAny(foodTerms(catalog, food), dietary.favorite_foods))
    .map((food) => slugOf(food.id))
  return { foods, favorites, slots }
}

const FOCUS_PATTERNS: Record<string, readonly string[]> = {
  strength: ['squat', 'hinge', 'push', 'pull', 'core'],
  crossfit: ['squat', 'hinge', 'push', 'pull', 'locomotion', 'core'],
  cardio: ['locomotion', 'locomotion', 'core', 'mobility'],
  full_body: ['squat', 'hinge', 'push', 'pull', 'core', 'locomotion'],
}

/**
 * Balanced exercise allowlist: hard filters (equipment, level, injury) first, then a weighted
 * round-robin across movement patterns so a gym member gets ~110 varied exercises instead of all
 * 316. Within a pattern, exercises that use the user's own listed equipment come first.
 */
function selectExercises(input: {
  catalog: PlanCatalogSnapshot
  snapshot: GenerationProfileSnapshot
  level: TrainingLevel
  injury: boolean
}): CatalogExercise[] {
  const { catalog, snapshot } = input
  const available = availableEquipmentSlugs(catalog, snapshot)
  const eligible = [...catalog.exercises.values()].filter((exercise) =>
    exerciseFitsEquipment(exercise, available) &&
    exerciseAllowedFor(exercise.id, { level: input.level, injury: input.injury })
  )
  if (eligible.length === 0) {
    throw new HttpError(
      422,
      'CATALOG_SUBSET_INSUFFICIENT',
      'No exercise fits the equipment, level and safety filters.',
    )
  }
  if (eligible.length <= MAX_EXERCISES) return eligible

  const owned = new Set(available ?? [])
  const specific = (exercise: CatalogExercise) =>
    [...exercise.equipmentIds].some((id) =>
      owned.has(slugOf(id)) && !['bodyweight', 'wall', 'chair', 'yoga-mat'].includes(slugOf(id))
    )
  const byPattern = new Map<string, CatalogExercise[]>()
  for (const exercise of eligible) {
    const pattern = exercise.movementPattern ?? 'other'
    byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), exercise])
  }
  for (const list of byPattern.values()) {
    list.sort((a, b) =>
      Number(specific(b)) - Number(specific(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    )
  }
  const focus = snapshot.training_schedule[0]?.activity_type ?? 'full_body'
  const weighted = [...(FOCUS_PATTERNS[focus] ?? FOCUS_PATTERNS.full_body!), ...byPattern.keys()]
  const picked = new Map<string, CatalogExercise>()
  while (picked.size < MAX_EXERCISES) {
    let progressed = false
    for (const pattern of weighted) {
      const next = byPattern.get(pattern)?.shift()
      if (!next) continue
      picked.set(next.id, next)
      progressed = true
      if (picked.size >= MAX_EXERCISES) break
    }
    if (!progressed) break
  }
  return [...picked.values()]
}

function localWeekday(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

/**
 * Which plan days are training days, from the user's weekdays and the plan's first weekday. At most
 * six a week: a seven-day schedule loses the local weekend day (Friday in Iran, Sunday elsewhere).
 * Non-trainers get three light days (walk or mobility) a week.
 */
export function trainingCalendar(input: {
  weekdays: readonly number[]
  startWeekday: number
  region: 'ir' | 'intl'
}): { trainDays: number[]; lightDays: number[] } {
  let weekdays = [...new Set(input.weekdays)].filter((day) => day >= 0 && day <= 6)
  if (weekdays.length > MAX_TRAINING_DAYS_PER_WEEK) {
    const restDay = input.region === 'ir' ? 5 : 0
    weekdays = weekdays.filter((day) => day !== restDay)
  }
  const light = weekdays.length === 0 ? [1, 3, 5] : []
  const trainDays: number[] = []
  const lightDays: number[] = []
  for (let day = 0; day < MONTHLY_PLAN_DAYS; day += 1) {
    const weekday = (input.startWeekday + day) % 7
    if (weekdays.includes(weekday)) trainDays.push(day)
    else if (light.includes(weekday)) lightDays.push(day)
  }
  return { trainDays, lightDays }
}

function priorHistory(snapshot: GenerationProfileSnapshot): PlanBrief['history'] {
  const prior = snapshot.prior_outcomes
  if (!prior) return null
  const history: Record<string, number | string> = {}
  const add = (key: string, value: number | null) => {
    if (typeof value === 'number' && Number.isFinite(value)) history[key] = Math.round(value * 10) / 10
  }
  add('workout_adherence_pct', prior.adherence_workout_pct)
  add('meal_adherence_pct', prior.adherence_meal_pct)
  add('energy_1_5', prior.avg_energy)
  add('sleep_1_5', prior.avg_sleep)
  add('difficulty_1_5', prior.avg_training_difficulty)
  add('weight_change_kg', prior.weight_trend_kg)
  const note = sanitizeFreeText(prior.next_cycle_note)
  if (note) history.note = note
  return Object.keys(history).length ? history : null
}

export function buildPlanBrief(input: {
  catalog: PlanCatalogSnapshot
  snapshot: GenerationProfileSnapshot
  declaredAllergenIds: ReadonlySet<string>
  locale: 'fa-IR' | 'en-US'
  subjectRef: string
  startsAt: Date
}): PlanBriefResult {
  const { catalog, snapshot } = input
  const targets = computePlanTargets(targetInputsFromSnapshot(snapshot, input.startsAt))
  const relaxations: string[] = []
  const requestedSlots = mealSlotsFor(mealCount(snapshot.dietary.requested_meal_pattern))
  const { foods, favorites, slots } = selectFoods({
    catalog,
    snapshot,
    declaredAllergenIds: input.declaredAllergenIds,
    slots: requestedSlots,
    relaxations,
  })

  const level = normalizeLevel(snapshot.training_profile.experience)
  const injury = snapshot.safety.medical_considerations.includes('injury_or_movement_limitation')
  const exercises = selectExercises({ catalog, snapshot, level, injury })
  const allowedExerciseIds = new Set(exercises.map((item) => item.id))

  const startWeekday = localWeekday(input.startsAt, snapshot.timezone || 'UTC')
  const calendar = trainingCalendar({
    weekdays: snapshot.training_schedule.filter((item) => item.activity_type !== 'rest')
      .map((item) => item.weekday),
    startWeekday,
    region: snapshot.product_region,
  })

  const brief: PlanBrief = {
    v: BRIEF_VERSION,
    ref: input.subjectRef,
    lang: input.locale,
    region: snapshot.product_region,
    country: snapshot.country_code,
    cuisine: snapshot.dietary.cuisine_region,
    cycle: snapshot.cycle_index,
    goal: targets.goal,
    person: {
      sex: snapshot.sex,
      age: snapshot.age_years ?? 0,
      height_cm: snapshot.height_cm ?? 0,
      weight_kg: currentWeightKg(snapshot) ?? 0,
      target_weight_kg: snapshot.goal?.target_weight_kg ?? null,
    },
    targets: {
      kcal: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      fiber_g: targets.fiber_g,
      water_ml_rest: targets.water_ml_rest_day,
      water_ml_training: targets.water_ml_training_day,
    },
    diet: {
      pattern: snapshot.dietary.dietary_pattern ?? 'omnivore',
      budget: snapshot.dietary.budget_tier,
      cooking: cookingFlags([
        ...snapshot.dietary.cooking_constraints,
        snapshot.dietary.work_schedule,
      ]),
      restaurant_per_week: snapshot.dietary.restaurant_meals_per_week ?? 0,
      favorites,
    },
    meals: {
      slots,
      options: Math.min(3, Math.max(1, snapshot.dietary.preferred_option_count ?? 2)),
    },
    training: {
      level,
      location: snapshot.training_profile.location,
      focus: snapshot.training_schedule[0]?.activity_type ?? null,
      days_per_week: calendar.trainDays.filter((day) => day < 7).length,
      session_min: sessionMinutes(snapshot) ?? 30,
      injury,
      start_weekday: startWeekday,
      train_days: calendar.trainDays,
      light_days: calendar.lightDays,
    },
    history: priorHistory(snapshot),
    foods: foods.map((food) => [
      slugOf(food.id),
      MEAL_SLOT_ORDER.filter((slot) => food.meal_types.includes(slot) && slots.includes(slot))
        .map((slot) => MEAL_CODES[slot]).join(' '),
      Math.round(food.nutrition.calories),
      Math.round(food.nutrition.protein_g),
    ]),
    exercises: exercises.map((exercise) => [
      slugOf(exercise.id),
      exercise.movementPattern ?? 'other',
      [...exercise.equipmentIds].map(slugOf).join(','),
      [...exercise.substitutionIds].filter((id) => allowedExerciseIds.has(id)).map(slugOf).join(','),
    ]),
  }
  assertBriefPiiFree(brief)
  return {
    brief,
    targets,
    allowedFoodIds: new Set(foods.map((food) => food.id)),
    allowedExerciseIds,
    relaxations,
    exerciseProfileVersion: EXERCISE_PROFILE_VERSION,
  }
}
