/* eslint-disable @typescript-eslint/no-explicit-any -- tests mutate loosely typed plan JSON */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerationProfileSnapshot } from '../supabase/functions/_shared/generation-profile-snapshot.ts'
import { HttpError } from '../supabase/functions/_shared/http.ts'
import {
  exerciseAllowedFor,
  exerciseLevel,
  exerciseProfile,
} from '../supabase/functions/_shared/exercise-profile.ts'
import { EXERCISE_PROFILE_DATA } from '../supabase/functions/_shared/exercise-profile-data.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createPlanCatalogSnapshot,
  type PlanCatalogSnapshot,
  resolveDeclaredAllergenIds,
} from '../supabase/functions/_shared/plan-catalog.ts'
import {
  assertBriefPiiFree,
  buildPlanBrief,
  mealCount,
  mealSlotsFor,
  pseudonymousRef,
  sanitizeFreeText,
  trainingCalendar,
} from '../supabase/functions/_shared/plan-brief.ts'
import { composeDeterministicLeanPlan } from '../supabase/functions/_shared/plan-deterministic.ts'
import { createOpenAiPlanLlm, createStubPlanLlm } from '../supabase/functions/_shared/plan-llm.ts'
import { createCompatiblePlanLlm } from '../supabase/functions/_shared/plan-llm-compatible.ts'
import { runPlanPipeline } from '../supabase/functions/_shared/plan-pipeline.ts'
import {
  assemblePlanPrompt,
  assembleRepairPrompt,
  leanPlanJsonSchema,
  PLAN_SYSTEM_PROMPT,
} from '../supabase/functions/_shared/plan-prompt.ts'
import { resolvePlanLlmClient } from '../supabase/functions/_shared/plan-provider.ts'
import {
  activityFactor,
  climateBand,
  computePlanTargets,
  mifflinStJeorBmr,
  type TargetInputs,
  waterTargets,
} from '../supabase/functions/_shared/plan-targets.ts'
import {
  parseReps,
  scaleDayPortions,
  validateAndBuildPlan,
  validateLeanPlan,
  type ValidationContext,
} from '../supabase/functions/_shared/plan-validate.ts'
import { coreCatalogWithLibraryRows } from './helpers/core-catalog-v2.ts'

let env: Record<string, string | undefined> = {}
beforeEach(() => {
  env = {}
  vi.stubGlobal('Deno', { env: { get: (name: string) => env[name] } })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const catalog: PlanCatalogSnapshot = createPlanCatalogSnapshot(coreCatalogWithLibraryRows())
const USER_ID = '5f2b3c4d-1111-4222-8333-944455556666'
// A Tuesday in January (temperate everywhere in the northern hemisphere).
const STARTS_AT = new Date('2026-01-06T09:00:00Z')

function snapshot(overrides: Partial<GenerationProfileSnapshot> = {}): GenerationProfileSnapshot {
  return {
    snapshot_version: 'momentum-profile-snapshot/1.1.0',
    locale: 'fa-IR',
    timezone: 'Asia/Tehran',
    country_code: 'IR',
    product_region: 'ir',
    age_years: 32,
    sex: 'female',
    height_cm: 165,
    goal: { goal_type: 'fat_loss', start_weight_kg: 72, target_weight_kg: 64, target_date: null },
    dietary: {
      dietary_pattern: 'omnivore',
      favorite_foods: ['مرغ'],
      disliked_foods: [],
      allergies: [],
      requested_meal_pattern: '۳ وعده',
      preferred_option_count: 2,
      cooking_constraints: ['سریع باشد'],
      available_equipment: ['دمبل'],
      work_schedule: 'کارمند، ناهار سر کار',
      budget_tier: 'medium',
      restaurant_meals_per_week: 1,
      restaurant_preferences: [],
      grocery_preferences: [],
      cuisine_region: 'iranian',
    },
    training_profile: { location: 'home', experience: 'beginner' },
    training_schedule: [0, 2, 4].map((weekday) => ({
      weekday,
      activity_type: 'strength',
      local_start_time: '18:00',
      duration_minutes: 45,
      intensity: 'moderate',
      availability_note: null,
    })),
    safety: { medical_considerations: [], medications_present: false, supplements_present: false },
    confirmed_measurements: [],
    prior_outcomes: null,
    cycle_index: 1,
    ...overrides,
  }
}

function briefFor(snap = snapshot(), locale: 'fa-IR' | 'en-US' = 'fa-IR') {
  const declared = resolveDeclaredAllergenIds(catalog, snap.dietary.allergies)
  return {
    declared,
    result: buildPlanBrief({
      catalog,
      snapshot: snap,
      declaredAllergenIds: declared,
      locale,
      subjectRef: 'abcdefghabcdefgh',
      startsAt: STARTS_AT,
    }),
  }
}

function ctxFor(snap = snapshot(), locale: 'fa-IR' | 'en-US' = 'fa-IR'): ValidationContext {
  const { declared, result } = briefFor(snap, locale)
  return { catalog, brief: result, locale, declaredAllergenIds: declared }
}

const baseInputs: TargetInputs = {
  sex: 'female',
  ageYears: 30,
  heightCm: 165,
  weightKg: 70,
  goalType: 'maintenance',
  trainingDaysPerWeek: 3,
  sessionMinutes: 45,
  countryCode: 'DE',
  month: 1,
}

describe('stage 2: targets computed in code', () => {
  it('uses Mifflin-St Jeor', () => {
    expect(mifflinStJeorBmr({ sex: 'male', ageYears: 30, heightCm: 180, weightKg: 80 })).toBe(1780)
    expect(mifflinStJeorBmr({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 70 }))
      .toBeCloseTo(1420.25, 2)
    // Undisclosed sex sits between the two.
    expect(mifflinStJeorBmr({ sex: 'prefer_not_to_say', ageYears: 30, heightCm: 180, weightKg: 80 }))
      .toBe(1697)
  })

  it('maps weekly training minutes to activity factors', () => {
    expect([0, 60, 150, 240, 400].map(activityFactor)).toEqual([1.2, 1.3, 1.375, 1.55, 1.725])
  })

  it('applies goal adjustments and stays consistent', () => {
    const maintain = computePlanTargets(baseInputs)
    const loss = computePlanTargets({ ...baseInputs, goalType: 'fat_loss' })
    const gain = computePlanTargets({ ...baseInputs, goalType: 'muscle_gain' })
    expect(maintain.calories).toBe(Math.round(maintain.tdee_kcal / 10) * 10)
    expect(loss.calories).toBeLessThan(maintain.calories)
    expect(maintain.calories - loss.calories).toBeLessThanOrEqual(750)
    expect(gain.calories - maintain.calories).toBeLessThanOrEqual(360)
    for (const targets of [maintain, loss, gain]) {
      const macroKcal = targets.protein_g * 4 + targets.carbs_g * 4 + targets.fat_g * 9
      expect(Math.abs(macroKcal - targets.calories)).toBeLessThan(20)
      expect(targets.carbs_g).toBeGreaterThanOrEqual(100)
      expect(targets.fiber_g).toBeGreaterThanOrEqual(20)
    }
    expect(loss.protein_g).toBe(Math.round(70 * 1.8))
  })

  it('never goes below the 1200 kcal floor (1500 for men) or BMR on fat loss', () => {
    const small = computePlanTargets({
      ...baseInputs,
      weightKg: 42,
      heightCm: 150,
      ageYears: 70,
      goalType: 'fat_loss',
      trainingDaysPerWeek: 0,
    })
    expect(small.calories).toBe(1200)
    expect(small.adjustments).toContain('calorie_floor_1200')
    const man = computePlanTargets({
      ...baseInputs,
      sex: 'male',
      weightKg: 50,
      heightCm: 160,
      ageYears: 75,
      goalType: 'fat_loss',
      trainingDaysPerWeek: 0,
    })
    expect(man.calories).toBeGreaterThanOrEqual(1500)
    const loss = computePlanTargets({ ...baseInputs, goalType: 'fat_loss', trainingDaysPerWeek: 0 })
    expect(loss.calories).toBeGreaterThanOrEqual(loss.bmr_kcal - 5)
  })

  it('doses protein on adjusted weight above BMI 30', () => {
    const heavy = computePlanTargets({ ...baseInputs, weightKg: 130, goalType: 'fat_loss' })
    expect(heavy.adjustments).toContain('protein_adjusted_weight')
    expect(heavy.protein_g).toBeLessThan(130 * 1.8)
    expect(heavy.protein_g).toBe(Math.round(27.5 * 1.65 ** 2 * 1.8))
  })

  it('computes water from weight, training and climate', () => {
    expect(climateBand('IR', 7)).toBe('hot_season')
    expect(climateBand('IR', 1)).toBe('temperate')
    expect(climateBand('AU', 1)).toBe('hot_season')
    expect(climateBand('SG', 1)).toBe('tropical')
    const temperate = waterTargets({ weightKg: 70, ageYears: 30, sessionMinutes: 60, trainingDaysPerWeek: 3, climate: 'temperate' })
    const hot = waterTargets({ weightKg: 70, ageYears: 30, sessionMinutes: 60, trainingDaysPerWeek: 3, climate: 'hot_season' })
    expect(temperate).toEqual({ restDay: 2450, trainingDay: 2950 })
    expect(hot.restDay - temperate.restDay).toBe(500)
    const tiny = waterTargets({ weightKg: 35, ageYears: 80, sessionMinutes: null, trainingDaysPerWeek: 0, climate: 'temperate' })
    expect(tiny.restDay).toBe(1500)
    const huge = waterTargets({ weightKg: 300, ageYears: 30, sessionMinutes: 120, trainingDaysPerWeek: 5, climate: 'hot_season' })
    expect(huge.trainingDay).toBe(4500)
  })

  it('refuses to guess when body stats are missing', () => {
    expect(() => computePlanTargets({ ...baseInputs, weightKg: null }))
      .toThrowError(expect.objectContaining({ code: 'TARGETS_INPUT_MISSING' }))
    expect(() => computePlanTargets({ ...baseInputs, ageYears: 15 }))
      .toThrowError(expect.objectContaining({ code: 'TARGETS_INPUT_MISSING' }))
  })
})

describe('stage 3: per-user brief', () => {
  it('contains no name, email, phone or user id', async () => {
    const ref = await pseudonymousRef(USER_ID)
    expect(ref).toMatch(/^[a-p]{16}$/)
    expect(await pseudonymousRef(USER_ID)).toBe(ref)
    const snap = snapshot({
      prior_outcomes: {
        cycle_index: 1,
        adherence_workout_pct: 70,
        adherence_meal_pct: 80,
        avg_energy: 3.5,
        avg_sleep: null,
        avg_training_difficulty: 3,
        weight_trend_kg: -1.2,
        next_cycle_note: 'ناهار ساده‌تر لطفا. ایمیلم sara.k@example.com و شماره 0912 345 6789',
      },
    })
    const declared = resolveDeclaredAllergenIds(catalog, [])
    const { brief } = buildPlanBrief({
      catalog,
      snapshot: snap,
      declaredAllergenIds: declared,
      locale: 'fa-IR',
      subjectRef: ref,
      startsAt: STARTS_AT,
    })
    const text = JSON.stringify(brief)
    expect(text).not.toContain(USER_ID)
    expect(text).not.toContain('example.com')
    expect(text).not.toMatch(/0912/)
    expect(text).not.toContain('Sara')
    expect(brief.history?.note).toBe('ناهار ساده‌تر لطفا. ایمیلم و شماره')
    expect(brief.ref).toBe(ref)
    // Free text becomes flags, not prose.
    expect(brief.diet.cooking).toEqual(['quick', 'portable_lunch'])
    expect(() => assertBriefPiiFree(brief)).not.toThrow()
    expect(() => assertBriefPiiFree({ ...brief, x: 'a@b.co' })).toThrow(HttpError)
    expect(() => assertBriefPiiFree({ ...brief, x: USER_ID })).toThrow(HttpError)
    expect(() => assertBriefPiiFree({ ...brief, x: '+98 912 345 6789' })).toThrow(HttpError)
    expect(() => assertBriefPiiFree(brief, ['Sara Karimi'])).not.toThrow()
    expect(() => assertBriefPiiFree({ ...brief, x: 'Sara Karimi' }, ['Sara Karimi'])).toThrow()
    expect(sanitizeFreeText('call www.x.com now')).toBe('call now')
  })

  it('stays token-lean', () => {
    const { result } = briefFor(snapshot({ training_profile: { location: 'gym', experience: 'advanced' } }))
    // Rough budget: ~4 characters per token; brief well under 4k tokens even for gym users.
    expect(JSON.stringify(result.brief).length).toBeLessThan(12_000)
    expect(result.brief.exercises.length).toBeGreaterThanOrEqual(80)
    expect(result.brief.exercises.length).toBeLessThanOrEqual(110)
    expect(result.brief.foods.length).toBeLessThanOrEqual(36)
  })

  it('excludes declared allergens and respects the diet pattern', () => {
    const milk = briefFor(snapshot({
      dietary: { ...snapshot().dietary, allergies: ['milk'] },
    }))
    for (const id of milk.result.allowedFoodIds) {
      const food = catalog.foods.get(id)!
      for (const ingredientId of food.ingredientIds) {
        expect([...catalog.ingredients.get(ingredientId)!.allergenIds]).not.toContain('allergen:milk@v2')
      }
    }
    const veg = briefFor(snapshot({ dietary: { ...snapshot().dietary, dietary_pattern: 'vegetarian' } }))
    for (const id of veg.result.allowedFoodIds) {
      const slugs = [...catalog.foods.get(id)!.ingredientIds].join(' ')
      expect(slugs).not.toMatch(/chicken|beef|turkey|tuna|salmon|shrimp/)
    }
  })

  it('treats dislikes as a preference and allergens as a hard rule', () => {
    const { result } = briefFor(snapshot({
      dietary: { ...snapshot().dietary, disliked_foods: ['chicken'] },
    }))
    const names = [...result.allowedFoodIds].map((id) => catalog.foods.get(id)!.name_en.toLowerCase())
    expect(names.some((name) => name.includes('chicken'))).toBe(false)
  })

  it('filters exercises by equipment, level and injury', () => {
    const { result } = briefFor()
    const slugs = result.brief.exercises.map((row) => row[0])
    expect(slugs.some((slug) => slug.startsWith('barbell-'))).toBe(false)
    expect(slugs).toContain('goblet-squat'.replace('goblet', 'dumbbell'))
    for (const id of result.allowedExerciseIds) expect(exerciseLevel(id)).toBe('beginner')

    const injured = briefFor(snapshot({
      training_profile: { location: 'gym', experience: 'advanced' },
      safety: { medical_considerations: ['injury_or_movement_limitation'], medications_present: false, supplements_present: false },
    }))
    const injuredSlugs = injured.result.brief.exercises.map((row) => row[0])
    expect(injuredSlugs).not.toContain('box-jump')
    expect(injuredSlugs).not.toContain('barbell-deadlift')
    expect(injuredSlugs).not.toContain('handstand')
    expect(injured.result.brief.training.injury).toBe(true)
    expect(exerciseAllowedFor('exercise:burpee@v2', { level: 'advanced', injury: true })).toBe(false)
    expect(exerciseAllowedFor('exercise:burpee@v2', { level: 'intermediate', injury: false })).toBe(true)
    expect(exerciseAllowedFor('exercise:pistol-squat@v2', { level: 'intermediate', injury: false })).toBe(false)
  })

  it('has a reviewed profile for every library exercise', () => {
    const migration = readFileSync(resolve(import.meta.dirname, '../supabase/migrations/202610190101_exercise_library_catalog.sql'), 'utf8')
    const slugs = [...migration.matchAll(/^ {2}\('exercise:([a-z0-9-]+)@v2', '[a-z0-9-]+', /gm)].map((match) => match[1])
    expect(slugs.length).toBe(316)
    for (const slug of slugs) expect(EXERCISE_PROFILE_DATA[slug!], slug).toMatch(/^[bia]\|[IKS]*\|[a-z_ ]*$/)
    expect(exerciseProfile('wall-sit')).toMatchObject({ level: 'beginner', risks: [], regions: ['knee'], reviewed: true })
    expect(exerciseProfile('leg-press').regions).toEqual(['knee', 'lower_back'])
    expect(exerciseProfile('box-jump').risks).toContain('high_impact')
    expect(exerciseProfile('some-new-move').reviewed).toBe(false)
  })

  it('avoids the injured body areas', () => {
    const knee = { level: 'advanced' as const, injury: true, areas: ['knee' as const] }
    expect(exerciseAllowedFor('exercise:bodyweight-squat@v2', knee)).toBe(false)
    expect(exerciseAllowedFor('exercise:walking-lunge@v2', knee)).toBe(false)
    expect(exerciseAllowedFor('exercise:dumbbell-shoulder-press@v2', knee)).toBe(true)
    const shoulder = { level: 'advanced' as const, injury: true, areas: ['shoulder' as const] }
    expect(exerciseAllowedFor('exercise:dumbbell-shoulder-press@v2', shoulder)).toBe(false)
    expect(exerciseAllowedFor('exercise:bodyweight-squat@v2', shoulder)).toBe(true)
    // Lower-limb injury also removes impact; spine injury also removes heavy axial loading.
    expect(exerciseAllowedFor('exercise:jumping-jack@v2', { ...knee, areas: ['hip'] })).toBe(false)
    expect(exerciseAllowedFor('exercise:shrug@v2', { ...knee, areas: ['lower_back'] })).toBe(true)
    // Unknown area: conservative. Unreviewed exercises never go to an injured user.
    expect(exerciseAllowedFor('exercise:burpee@v2', { level: 'advanced', injury: true, areas: [] })).toBe(false)
    expect(exerciseAllowedFor('exercise:some-new-move@v2', { level: 'advanced', injury: true, areas: ['wrist'] })).toBe(false)

    const { result } = briefFor(snapshot({
      training_profile: { location: 'gym', experience: 'intermediate' },
      safety: {
        medical_considerations: ['injury_or_movement_limitation', 'injury:knee', 'injury:bogus'],
        medications_present: false,
        supplements_present: false,
      },
    }))
    expect(result.brief.training.injury_areas).toEqual(['knee'])
    for (const id of result.allowedExerciseIds) expect(exerciseProfile(id).regions).not.toContain('knee')
    expect(result.brief.exercises.length).toBeGreaterThan(40)
  })

  it('builds the meal slots and the training calendar', () => {
    expect(mealCount('۴ وعده')).toBe(4)
    expect(mealCount('5 meals. no breakfast')).toBe(5)
    expect(mealCount(null)).toBe(3)
    expect(mealSlotsFor(2)).toEqual(['lunch', 'dinner'])
    // Seven training days a week become six; Iran rests on Friday.
    const everyDay = trainingCalendar({ weekdays: [0, 1, 2, 3, 4, 5, 6], startWeekday: 6, region: 'ir' })
    expect(everyDay.trainDays.filter((day) => day < 7)).toHaveLength(6)
    expect(everyDay.trainDays).not.toContain(6) // day 6 is a Friday when day 0 is a Saturday
    const none = trainingCalendar({ weekdays: [], startWeekday: 0, region: 'intl' })
    expect(none.trainDays).toEqual([])
    expect(none.lightDays.filter((day) => day < 7)).toEqual([1, 3, 5])
    const { result } = briefFor()
    // 2026-01-06 is a Tuesday (weekday 2): day 0 trains, day 2 is Thursday (4), day 5 is Sunday (0).
    expect(result.brief.training.start_weekday).toBe(2)
    expect(result.brief.training.train_days.slice(0, 3)).toEqual([0, 2, 5])
  })
})

describe('stage 4: prompt', () => {
  it('keeps the static prefix identical for every user and puts the brief last', () => {
    const a = assemblePlanPrompt(briefFor().result.brief)
    const b = assemblePlanPrompt(briefFor(snapshot({ sex: 'male', height_cm: 185 }), 'en-US').result.brief)
    expect(a.messages[0]).toEqual(b.messages[0])
    expect(a.messages[0]!.content).toBe(PLAN_SYSTEM_PROMPT)
    expect(a.cacheKey).toBe(b.cacheKey)
    expect(a.messages.at(-1)!.role).toBe('user')
    expect(JSON.parse(a.messages.at(-1)!.content).v).toBe('momentum-plan-brief/1.0.0')
    expect(PLAN_SYSTEM_PROMPT).not.toMatch(/fa-IR only|\{\{/)
    expect(a.promptVersion).toBe('momentum-plan-prompt/1.2.0')
  })

  it('repairs with the same prefix and the issues appended', () => {
    const { brief } = briefFor().result
    const main = assemblePlanPrompt(brief)
    const repair = assembleRepairPrompt({ brief, previousOutput: '{"x":1}', issues: ['day 3: bad'] })
    expect(repair.messages.slice(0, 2)).toEqual(main.messages)
    expect(repair.messages[2]).toEqual({ role: 'assistant', content: '{"x":1}' })
    expect(repair.messages[3]!.content).toContain('- day 3: bad')
    const noPrevious = assembleRepairPrompt({ brief, previousOutput: '', issues: ['x'] })
    expect(noPrevious.messages.map((message) => message.role)).toEqual(['system', 'user', 'user'])
  })

  it('has a strict-mode compatible output schema', () => {
    const visit = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const record = node as Record<string, unknown>
      if (record.type === 'object') {
        expect(record.additionalProperties).toBe(false)
        expect([...(record.required as string[])].sort())
          .toEqual(Object.keys(record.properties as object).sort())
      }
      Object.values(record).forEach(visit)
    }
    visit(leanPlanJsonSchema)
  })
})

describe('stage 5: validation, portion scaling and repair paths', () => {
  it('builds a valid plan with every day within 5% of the computed calories', () => {
    const ctx = ctxFor()
    const built = validateAndBuildPlan(composeDeterministicLeanPlan(ctx.brief.brief), ctx)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const targets = ctx.brief.targets
    const days = built.content.days as Array<Record<string, unknown>>
    expect(days).toHaveLength(30)
    for (const day of days) {
      const dayTargets = day.targets as Record<string, number>
      expect(dayTargets.calories).toBe(targets.calories)
      const meals = day.meals as Array<{ options: Array<{ nutrition: { calories: number } }> }>
      const kcal = meals.reduce((sum, meal) => sum + meal.options[0]!.nutrition.calories, 0)
      expect(Math.abs(kcal - targets.calories) / targets.calories).toBeLessThanOrEqual(0.05)
      const training = ctx.brief.brief.training.train_days.includes(Number(day.day_index))
      expect(dayTargets.water_ml).toBe(training ? targets.water_ml_training_day : targets.water_ml_rest_day)
      expect(Boolean(day.workout)).toBe(training)
    }
    expect(built.quality.max_calorie_deviation_pct).toBeLessThanOrEqual(5)
    // exercise_key is the library id the Android guide looks up.
    const exercise = (days[0]!.workout as { exercises: Array<{ exercise_key: string }> }).exercises[0]!
    expect(ctx.brief.allowedExerciseIds.has(`exercise:${exercise.exercise_key}@v2`)).toBe(true)
  })

  it('works in English and for every meal count', () => {
    for (const pattern of ['2 meals', '4 meals', '6 meals']) {
      const snap = snapshot({ dietary: { ...snapshot().dietary, requested_meal_pattern: pattern } })
      const ctx = ctxFor(snap, 'en-US')
      const built = validateAndBuildPlan(composeDeterministicLeanPlan(ctx.brief.brief), ctx)
      expect(built.ok, pattern).toBe(true)
    }
  })

  it('reaches high calorie targets with light vegetarian foods (macros never pull a day out of band)', () => {
    const snap = snapshot({
      age_years: 24,
      sex: 'male',
      height_cm: 180,
      goal: { goal_type: 'muscle_gain', start_weight_kg: 68, target_weight_kg: 75, target_date: null },
      dietary: { ...snapshot().dietary, dietary_pattern: 'vegetarian', requested_meal_pattern: '۵ وعده', budget_tier: 'low' },
      training_profile: { location: 'gym', experience: 'intermediate' },
      training_schedule: [0, 1, 3, 4, 5].map((weekday) => ({
        weekday, activity_type: 'strength', local_start_time: '18:00', duration_minutes: 70,
        intensity: 'moderate', availability_note: null,
      })),
    })
    const ctx = ctxFor(snap)
    expect(ctx.brief.targets.calories).toBeGreaterThan(3000)
    const built = validateAndBuildPlan(composeDeterministicLeanPlan(ctx.brief.brief), ctx)
    expect(built.ok ? [] : built.issues.map((issue) => issue.code)).toEqual([])
  })

  it('scales portions in code', () => {
    const foods = [...catalog.foods.values()].slice(0, 3)
    const result = scaleDayPortions(foods, { calories: 2400, protein_g: 140, carbs_g: 260, fat_g: 80 })
    expect(Math.abs(result.totals.calories - 2400) / 2400).toBeLessThanOrEqual(0.05)
    for (const multiplier of result.multipliers) {
      expect(multiplier).toBeGreaterThanOrEqual(0.5)
      expect(multiplier).toBeLessThanOrEqual(3)
    }
  })

  it('parses reps and time', () => {
    expect(parseReps('8-12')).toEqual({ count: '8-12', seconds: null })
    expect(parseReps('۳۰ ثانیه')).toEqual({ count: '1', seconds: 30 })
    expect(parseReps('20min')).toEqual({ count: '1', seconds: 1200 })
    expect(parseReps('as many as possible')).toBeNull()
  })

  function mutated(mutate: (plan: Record<string, any>) => void, snap = snapshot()) {
    const ctx = ctxFor(snap)
    const plan = composeDeterministicLeanPlan(ctx.brief.brief) as Record<string, any>
    mutate(plan)
    const result = validateLeanPlan(plan, ctx)
    return result.ok ? [] : result.issues.map((issue) => issue.code)
  }

  it('rejects unknown or non-allowlisted catalog and exercise ids', () => {
    expect(mutated((plan) => { plan.meals[0].food = 'pizza-margherita' })).toContain('unknown_food')
    expect(mutated((plan) => { plan.meals[0].food = 'food:not-a-food@v2' })).toContain('unknown_food')
    const ctx = ctxFor()
    const outside = [...catalog.foods.keys()].find((id) => !ctx.brief.allowedFoodIds.has(id))!
    expect(mutated((plan) => { plan.meals[0].food = outside })).toContain('food_not_allowed')
    expect(mutated((plan) => { plan.workouts[0].items[0].ex = 'made-up-move' })).toContain('unknown_exercise')
    expect(mutated((plan) => { plan.workouts[0].items[0].ex = 'barbell-back-squat' })).toContain('exercise_not_allowed')
  })

  it('rejects allergens even if the model names an allergen food', () => {
    const snap = snapshot({ dietary: { ...snapshot().dietary, allergies: ['milk'] } })
    const yogurt = [...catalog.foods.values()].find((food) =>
      [...food.ingredientIds].some((id) => catalog.ingredients.get(id)!.allergenIds.has('allergen:milk@v2')) &&
      food.meal_types.includes('breakfast')
    )!
    expect(mutated((plan) => {
      const breakfast = plan.meals.find((meal: any) => meal.slot === 'breakfast')
      breakfast.food = yogurt.id
    }, snap)).toContain('food_not_allowed')
  })

  it('enforces the calendar, volume, intensity and rest days', () => {
    const ctx = ctxFor()
    const rest = Array.from({ length: 30 }, (_, d) => d).find((d) => !ctx.brief.brief.training.train_days.includes(d))!
    const trainDay = ctx.brief.brief.training.train_days[0]!
    expect(mutated((plan) => { plan.days[rest].workout = plan.workouts[0].id })).toContain('rest_day_workout')
    expect(mutated((plan) => { plan.days[trainDay].workout = null })).toContain('training_day_missing')
    expect(mutated((plan) => { plan.workouts[0].intensity = 'high' })).toContain('intensity_too_high')
    expect(mutated((plan) => {
      for (const item of plan.workouts[0].items) item.sets = 5
      plan.workouts[0].items.push({ ...plan.workouts[0].items[0], ex: plan.workouts[0].items[1].ex })
    })).toContain('workout_volume')
    expect(mutated((plan) => { plan.workouts[0].items[0].rest = 5 })).toContain('exercise_rest')
    expect(mutated((plan) => { plan.workouts[0].minutes = 120 })).toContain('workout_minutes')
  })

  it('enforces coverage, slots, variety, language and text safety', () => {
    expect(mutated((plan) => { plan.days.pop() })).toContain('day_coverage')
    expect(mutated((plan) => { plan.days[3].meals.reverse() })).toContain('day_slots')
    expect(mutated((plan) => {
      const lunch = plan.days[0].meals[1]
      for (const day of plan.days) day.meals[1] = lunch
    })).toEqual(expect.arrayContaining(['variety_low', 'variety_repeat']))
    expect(mutated((plan) => {
      const lunchFood = plan.meals.find((meal: any) => meal.id === plan.days[2].meals[1]).food
      expect(catalog.foods.get(`food:${lunchFood}@v2`)!.meal_types).toContain('dinner')
      plan.meals.push({ id: 'dx', slot: 'dinner', food: lunchFood, alts: [], note: null })
      plan.days[2].meals[2] = 'dx'
    })).toContain('lunch_equals_dinner')
    expect(mutated((plan) => { plan.plan_name = 'My plan'; plan.summary = 'English text' })).toContain('wrong_language')
    expect(mutated((plan) => { plan.days[0].note = 'امروز ۵۰۰ کالری کمتر بخور' })).toContain('nutrition_number_in_text')
    expect(mutated((plan) => { plan.days[0].note = 'I want to kill myself' })).toContain('unsafe_text')
  })

  it('validates recipes against allergens, diet and the foods in the plan', () => {
    const withRecipe = (steps: string[], snap = snapshot()) => mutated((plan) => {
      plan.recipes = [{ food: plan.meals[0].food, prep_min: 5, cook_min: 10, steps }]
    }, snap)
    expect(withRecipe(['همه را مخلوط کن.'])).toEqual([])
    const milk = snapshot({ dietary: { ...snapshot().dietary, allergies: ['milk'] } })
    expect(withRecipe(['کمی شیر اضافه کن.'], milk)).toContain('recipe_allergen')
    expect(withRecipe(['کمی شیرینی ندارد.'], milk)).toEqual([])
    const veg = snapshot({ dietary: { ...snapshot().dietary, dietary_pattern: 'vegetarian' } })
    expect(withRecipe(['مرغ را تفت بده.'], veg)).toContain('recipe_not_vegetarian')
    expect(withRecipe(['تخم مرغ را بزن.'], veg)).toEqual([])
    expect(withRecipe(['۲۰۰ گرم برنج بپز.'])).toContain('nutrition_number_in_text')
    expect(mutated((plan) => {
      plan.recipes = [{ food: 'lentil-stew-rice-not-used', prep_min: 5, cook_min: 10, steps: ['x'] }]
    })).toEqual([]) // a recipe for a food the plan doesn't use is dropped, not an error
  })

  it('tells the model to cook for the user country and list ingredients', () => {
    expect(PLAN_SYSTEM_PROMPT).toContain('brief.country')
    expect(PLAN_SYSTEM_PROMPT).toContain('Iranian home cooking')
    const { brief } = briefFor().result
    expect(brief.foods[0]![4]).toMatch(/^[a-z0-9-]+( [a-z0-9-]+)*$/)
  })

  it('rejects a plan whose foods cannot reach the calorie target', () => {
    const ctx = ctxFor()
    const lean = validateLeanPlan(composeDeterministicLeanPlan(ctx.brief.brief), ctx)
    expect(lean.ok).toBe(true)
    const brief = { ...ctx.brief, targets: { ...ctx.brief.targets, calories: 4400, protein_g: 250, carbs_g: 520, fat_g: 130 } }
    const built = validateAndBuildPlan(composeDeterministicLeanPlan(ctx.brief.brief), { ...ctx, brief })
    expect(built.ok).toBe(false)
    if (!built.ok) expect(built.issues[0]!.code).toBe('calories_unreachable')
  })
})

describe('pipeline end-to-end with the stub provider', () => {
  async function run(mode: Parameters<typeof createStubPlanLlm>[0], snap = snapshot()) {
    const before: string[] = []
    const after: string[] = []
    const result = await runPlanPipeline({
      catalog,
      snapshot: snap,
      locale: 'fa-IR',
      declaredAllergenIds: resolveDeclaredAllergenIds(catalog, snap.dietary.allergies),
      subjectRef: await pseudonymousRef(USER_ID),
      startsAt: STARTS_AT,
      llm: createStubPlanLlm(mode),
      hooks: {
        beforeCall: async (call) => { before.push(call) },
        afterCall: async (record) => { after.push(`${record.call}:${record.outcome}`) },
      },
    })
    return { result, before, after }
  }

  it('routes complex briefs to the complex model and simple ones to the cheap model', async () => {
    const cheap = { ...createStubPlanLlm('valid'), model: 'cheap' }
    const strong = { ...createStubPlanLlm('valid'), model: 'strong' }
    const route = async (snap: GenerationProfileSnapshot) => {
      const models: string[] = []
      const result = await runPlanPipeline({
        catalog,
        snapshot: snap,
        locale: 'fa-IR',
        declaredAllergenIds: resolveDeclaredAllergenIds(catalog, snap.dietary.allergies),
        subjectRef: await pseudonymousRef(USER_ID),
        startsAt: STARTS_AT,
        llm: cheap,
        llmComplex: strong,
        hooks: { beforeCall: async (_call, meta) => { models.push(meta.model) } },
      })
      // Main and repair calls both stay on the routed model.
      return { models: [...new Set(models)], complexity: result.meta.complexity }
    }
    const simple = await route(snapshot())
    expect(simple.models).toEqual(['cheap'])
    expect(simple.complexity?.tier).toBe('simple')

    const injured = await route(snapshot({
      safety: { medical_considerations: ['injury_or_movement_limitation', 'injury:knee'], medications_present: false, supplements_present: false },
    }))
    expect(injured.models).toEqual(['strong'])
    expect(injured.complexity).toEqual({ tier: 'complex', reasons: expect.arrayContaining(['injury']) })

    const stacked = await route(snapshot({
      dietary: { ...snapshot().dietary, dietary_pattern: 'vegetarian', allergies: ['milk'] },
    }))
    expect(stacked.models).toEqual(['strong'])
    expect(stacked.complexity?.reasons).toEqual(expect.arrayContaining(['allergens', 'plant_based']))

    // One soft constraint alone stays on the cheap model.
    const allergyOnly = await route(snapshot({ dietary: { ...snapshot().dietary, allergies: ['milk'] } }))
    expect(allergyOnly.complexity).toEqual({ tier: 'simple', reasons: ['allergens'] })
    expect(allergyOnly.models).toEqual(['cheap'])
  })

  it('delivers the model plan when it validates', async () => {
    const { result, before, after } = await run('valid')
    expect(result.source).toBe('llm')
    expect(result.fallbackReason).toBeNull()
    expect(before).toEqual(['main'])
    expect(after).toEqual(['main:accepted'])
    expect(result.promptVersion).toBe('momentum-plan-prompt/1.2.0')
    expect(result.model).toBe('stub:momentum-plan-lean@1')
    expect(result.meta.targets?.kcal).toBeGreaterThanOrEqual(1200)
  })

  it('makes exactly one repair call', async () => {
    const { result, after } = await run('invalid')
    expect(result.source).toBe('llm_repaired')
    expect(after).toEqual(['main:validation_failed', 'repair:accepted'])
    expect(result.calls[0]!.issueCodes).toContain('unknown_food')
    expect(result.calls[0]!.failureCategory).toBe('catalog_reference')
  })

  it('repairs malformed JSON', async () => {
    const { result } = await run('malformed')
    expect(result.source).toBe('llm_repaired')
    expect(result.calls[0]!.issueCodes).toEqual(['malformed_json'])
  })

  it('falls back to the personal deterministic plan after a failed repair, with the reason', async () => {
    const { result, after } = await run('invalid_always')
    expect(after).toEqual(['main:validation_failed', 'repair:validation_failed'])
    expect(result.source).toBe('deterministic_personal')
    expect(result.fallbackReason).toMatch(/^repair_failed:unknown_food/)
    expect(result.model).toBe('deterministic:momentum-personal@1')
  })

  it('fails (no repair, no fallback) on a provider outage so the user can retry later', async () => {
    await expect(run('provider_error')).rejects.toMatchObject({
      status: 503,
      code: 'AI_PROVIDER_UNAVAILABLE',
    })
  })

  it('attaches the model recipes to every option that uses the food', async () => {
    const { result } = await run('valid')
    const days = result.content.days as Array<{ meals: Array<{ options: Array<Record<string, any>> }> }>
    for (const option of days.flatMap((day) => day.meals.flatMap((meal) => meal.options))) {
      expect(option.recipe?.steps?.length).toBeGreaterThan(0)
      // Ingredients and amounts are the catalog's, scaled in code.
      expect(option.ingredients.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the generic starter when no brief can be built', async () => {
    const { result, before } = await run('valid', snapshot({ goal: null, confirmed_measurements: [] }))
    expect(before).toEqual([])
    expect(result.source).toBe('deterministic_starter')
    expect(result.fallbackReason).toBe('brief_failed:TARGETS_INPUT_MISSING')
  })

  it('fails closed on provider misconfiguration instead of falling back', async () => {
    env = { AI_PLAN_PROVIDER: 'openai' }
    await expect(resolvePlanLlmClient({
      userId: USER_ID, cycleIndex: 1, isRenewal: false, catalogReleaseId: 'momentum-core@v2',
    })).rejects.toMatchObject({ code: 'LIVE_OPENAI_DISABLED' })
    env = { AI_PLAN_PROVIDER: 'mystery' }
    await expect(resolvePlanLlmClient({
      userId: USER_ID, cycleIndex: 1, isRenewal: false, catalogReleaseId: 'momentum-core@v2',
    })).rejects.toMatchObject({ code: 'AI_PROVIDER_INVALID' })
    env = { AI_PLAN_STUB_MODE: 'invalid' }
    const stub = await resolvePlanLlmClient({
      userId: USER_ID, cycleIndex: 1, isRenewal: false, catalogReleaseId: 'momentum-core@v2',
    })
    expect(stub.kind).toBe('stub')
  })

  it('runs main + repair through the Chat Completions client and totals the Toman cost', async () => {
    const snap = snapshot()
    const { result: briefResult } = briefFor(snap)
    const good = JSON.stringify(composeDeterministicLeanPlan(briefResult.brief))
    const reply = (content: string) => new Response(JSON.stringify({
      id: `c-${content.length}`,
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 3_000, completion_tokens: 2_000 },
    }), { status: 200 })
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(reply('{"schema_version":"x"}'))
      .mockResolvedValueOnce(reply(good))
    const llm = createCompatiblePlanLlm({
      baseUrl: 'https://llm.example.ir/v1', apiKey: 'k', model: 'm', jsonMode: 'json_schema',
      timeoutMs: 30_000, maxRetries: 0, totalBudgetMs: 60_000, maxOutputTokens: 12_000,
      prices: { input: 100_000, cachedInput: 100_000, output: 500_000 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const result = await runPlanPipeline({
      catalog, snapshot: snap, locale: 'fa-IR', declaredAllergenIds: new Set(),
      subjectRef: 'abcdefghabcdefgh', startsAt: STARTS_AT, llm,
    })
    expect(result.source).toBe('llm_repaired')
    expect(result.calls.map((call) => call.costToman)).toEqual([1_300, 1_300])
    expect(result.costToman).toBe(2_600)
    expect(result.usage.inputTokens).toBe(6_000)
  })

  it('skips the repair call when the first answer already hit the per-plan Toman cap', async () => {
    const snap = snapshot()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: '{"schema_version":"x"}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 3_000, completion_tokens: 2_000 },
    }), { status: 200 }))
    const llm = createCompatiblePlanLlm({
      baseUrl: 'https://llm.example.ir/v1', apiKey: 'k', model: 'm', jsonMode: 'json_schema',
      timeoutMs: 30_000, maxRetries: 0, totalBudgetMs: 60_000, maxOutputTokens: 12_000,
      prices: { input: 100_000, cachedInput: 100_000, output: 500_000 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const result = await runPlanPipeline({
      catalog, snapshot: snap, locale: 'fa-IR', declaredAllergenIds: new Set(),
      subjectRef: 'abcdefghabcdefgh', startsAt: STARTS_AT, llm, maxCostToman: 1_000,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result.source).toBe('deterministic_personal')
    expect(result.fallbackReason).toBe('repair_skipped:plan_cost_cap')
    expect(result.costToman).toBe(1_300)
  })

  it('sends a cache-friendly, PII-free request through the OpenAI-compatible client', async () => {
    env = { AI_PLAN_LIVE_OPENAI: 'true', OPENAI_API_KEY: 'test-key' }
    const snap = snapshot()
    const { result: briefResult } = briefFor(snap)
    const answer = JSON.stringify(composeDeterministicLeanPlan(briefResult.brief))
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'resp_1',
      status: 'completed',
      output_text: answer,
      usage: { input_tokens: 5000, output_tokens: 3000, input_tokens_details: { cached_tokens: 2000 } },
    }), { status: 200 }))
    const llm = createOpenAiPlanLlm({
      model: 'gpt-5.6-luna', safetyIdentifier: 'hash', maxOutputTokens: 16_000, serviceTier: 'standard',
    })
    const result = await runPlanPipeline({
      catalog,
      snapshot: snap,
      locale: 'fa-IR',
      declaredAllergenIds: new Set(),
      subjectRef: 'abcdefghabcdefgh',
      startsAt: STARTS_AT,
      llm,
    })
    expect(result.source).toBe('llm')
    expect(result.usage.inputTokens).toBe(5000)
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))
    expect(body.instructions).toBe(PLAN_SYSTEM_PROMPT)
    expect(body.input).toEqual([{ role: 'user', content: JSON.stringify(briefResult.brief) }])
    expect(body.prompt_cache_key).toBe('momentum-plan-prompt/1.2.0:momentum-plan-lean/1.1.0')
    expect(JSON.stringify(body)).not.toContain(USER_ID)
  })
})
