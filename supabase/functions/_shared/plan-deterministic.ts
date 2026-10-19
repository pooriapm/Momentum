import { MEAL_CODES, type MealSlot, type PlanBrief } from './plan-brief.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'
import { LEAN_SCHEMA_VERSION } from './plan-prompt.ts'

/**
 * A rule-based lean plan built from the same brief the model gets. Two uses:
 * - the stub provider (AI_PLAN_PROVIDER=stub) answers with it, so the whole pipeline runs
 *   end-to-end without a key;
 * - the personalised fallback after a failed model call and repair: it goes through the same
 *   validator, portion scaling and contract checks as a model answer.
 * Deterministic: the same brief always yields the same plan.
 */
export const DETERMINISTIC_PLAN_VERSION = 'momentum-plan-deterministic/1.0.0'

type FoodRow = PlanBrief['foods'][number]
type ExerciseRow = PlanBrief['exercises'][number]

const TEXT = {
  'fa-IR': {
    name: 'برنامه ماهانه شخصی مومنتوم',
    summary: {
      fat_loss: 'برنامه‌ای ۳۰ روزه برای کاهش چربی با وعده‌های سیرکننده و تمرین منظم.',
      muscle_gain: 'برنامه‌ای ۳۰ روزه برای عضله‌سازی با پروتئین کافی و تمرین پیش‌رونده.',
      maintenance: 'برنامه‌ای ۳۰ روزه برای حفظ وزن و انرژی پایدار.',
    },
    workout: 'تمرین',
    walk: 'پیاده‌روی سبک',
    weekNote: 'این هفته وعده‌ها را از قبل برنامه‌ریزی کن تا راحت‌تر پیش بروی.',
    restaurant: [
      'غذای کبابی یا آب‌پز با سالاد سفارش بده و سس را جدا بخواه.',
      'نان یا برنج را نصف کن و سبزیجات را بیشتر کن.',
    ],
    general: ['آب را در طول روز پخش کن.', 'هر شب ۷ تا ۹ ساعت بخواب.'],
  },
  'en-US': {
    name: 'Your Momentum monthly plan',
    summary: {
      fat_loss: 'A 30-day plan for fat loss with filling meals and regular training.',
      muscle_gain: 'A 30-day plan for building muscle with enough protein and progressive training.',
      maintenance: 'A 30-day plan to hold your weight and keep energy steady.',
    },
    workout: 'Workout',
    walk: 'Easy walk',
    weekNote: 'Plan this week\'s meals ahead to make it easier.',
    restaurant: [
      'Order grilled or steamed dishes with salad and ask for sauce on the side.',
      'Keep bread or rice to half and add vegetables.',
    ],
    general: ['Spread water across the day.', 'Aim for 7 to 9 hours of sleep.'],
  },
} as const

function foodsForSlot(brief: PlanBrief, slot: MealSlot): FoodRow[] {
  const code = MEAL_CODES[slot]
  return brief.foods
    .filter((row) => row[1].split(' ').includes(code))
    .sort((a, b) =>
      b[3] / Math.max(1, b[2]) - a[3] / Math.max(1, a[2]) || (a[0] < b[0] ? -1 : 1)
    )
}

function pickExercises(
  rows: readonly ExerciseRow[],
  patterns: readonly string[],
  offset: number,
  count: number,
): ExerciseRow[] {
  const picked: ExerciseRow[] = []
  for (const pattern of patterns) {
    const matches = rows.filter((row) => row[1] === pattern && !picked.includes(row))
    const row = matches[offset % Math.max(1, matches.length)]
    if (row) picked.push(row)
    if (picked.length >= count) return picked
  }
  for (const row of rows) {
    if (picked.length >= count) break
    if (!picked.includes(row) && row[1] !== 'mobility') picked.push(row)
  }
  return picked
}

export function composeDeterministicLeanPlan(brief: PlanBrief): Record<string, unknown> {
  const text = TEXT[brief.lang]
  const optionCount = brief.meals.options

  // Meals: up to six definitions per slot, protein-dense first, rotated across the month.
  const meals: Record<string, unknown>[] = []
  const defsBySlot = new Map<MealSlot, Array<{ id: string; food: string }>>()
  for (const slot of brief.meals.slots) {
    const foods = foodsForSlot(brief, slot)
    const defs = foods.slice(0, 6).map((row, index) => {
      const id = `${MEAL_CODES[slot]}${index + 1}`
      const alts = foods.filter((other) => other[0] !== row[0]).slice(index, index + optionCount - 1)
      meals.push({ id, slot, food: row[0], alts: alts.map((alt) => alt[0]), note: null })
      return { id, food: row[0] }
    })
    defsBySlot.set(slot, defs)
  }

  // Workouts: two alternating sessions per progression block.
  const level = brief.training.level
  const baseSets = level === 'beginner' ? 2 : level === 'intermediate' ? 3 : 4
  const reps = level === 'beginner' ? ['8-10', '10-12', '12-15'] : ['8-10', '8-10', '10-12']
  const cardio = brief.training.focus === 'cardio'
  const sessionTypes = [
    cardio ? ['locomotion', 'core', 'locomotion', 'squat'] : ['squat', 'push', 'hinge', 'pull', 'core'],
    cardio ? ['locomotion', 'hinge', 'locomotion', 'core'] : ['hinge', 'pull', 'squat', 'push', 'core'],
  ]
  const blocks: Array<[number, number]> = [[0, 13], [14, 20], [21, 29]]
  const workouts: Record<string, unknown>[] = []
  const strengthRows = brief.exercises.filter((row) => row[1] !== 'mobility')
  if (brief.training.train_days.length > 0) {
    // Progression is in reps only, so weekly volume never jumps more than the 20% rule allows.
    blocks.forEach((_, block) => {
      sessionTypes.forEach((patterns, session) => {
        const sets = baseSets
        workouts.push({
          id: `w${block + 1}${session === 0 ? 'a' : 'b'}`,
          title: `${text.workout} ${session === 0 ? 'A' : 'B'}`,
          type: cardio ? 'cardio' : 'full_body',
          minutes: brief.training.session_min,
          intensity: 'moderate',
          items: pickExercises(strengthRows, patterns, session, 5).map((row) => ({
            ex: row[0],
            sets: Math.min(5, sets),
            reps: reps[block]!,
            rest: level === 'beginner' ? 60 : 90,
            sub: row[3] ? row[3].split(',')[0] : null,
          })),
          note: null,
        })
      })
    })
  }
  const lightRow = brief.exercises.find((row) => row[0] === 'brisk-walk') ??
    brief.exercises.find((row) => row[1] === 'locomotion') ?? brief.exercises[0]
  if (brief.training.light_days.length > 0 && lightRow) {
    workouts.push({
      id: 'walk',
      title: text.walk,
      type: 'walk',
      minutes: 20,
      intensity: 'low',
      items: [{ ex: lightRow[0], sets: 1, reps: '20min', rest: 0, sub: null }],
      note: null,
    })
  }

  const trainDays = brief.training.train_days
  const lightDays = new Set(brief.training.light_days)
  const days = Array.from({ length: MONTHLY_PLAN_DAYS }, (_, d) => {
    let lunchFood: string | null = null
    const mealIds = brief.meals.slots.map((slot, slotIndex) => {
      const defs = defsBySlot.get(slot) ?? []
      let def = defs[(d + slotIndex) % defs.length]!
      if (slot === 'dinner' && def.food === lunchFood && defs.length > 1) {
        def = defs[(d + slotIndex + 1) % defs.length]!
      }
      if (slot === 'lunch') lunchFood = def.food
      return def.id
    })
    let workout: string | null = null
    const position = trainDays.indexOf(d)
    if (position >= 0) {
      const block = d <= 13 ? 1 : d <= 20 ? 2 : 3
      workout = `w${block}${position % 2 === 0 ? 'a' : 'b'}`
    } else if (lightDays.has(d) && lightRow) {
      workout = 'walk'
    }
    return { d, meals: mealIds, workout, note: d % 7 === 0 ? text.weekNote : null }
  })

  return {
    schema_version: LEAN_SCHEMA_VERSION,
    plan_name: text.name,
    summary: text.summary[brief.goal],
    meals,
    workouts,
    days,
    tips: { restaurant: [...text.restaurant], general: [...text.general] },
  }
}
