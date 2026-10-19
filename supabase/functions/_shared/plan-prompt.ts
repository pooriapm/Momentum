import type { PlanBrief } from './plan-brief.ts'
import { MONTHLY_PLAN_DAYS } from './plan-period.ts'

/**
 * Stage 4: the prompt. Layout is cache-friendly: the static system text (rules + output schema)
 * is byte-identical for every user and every call, the per-user brief goes last. A repair call
 * reuses the same prefix (system, brief, the model's own answer) and appends the issues, so the
 * provider's prefix cache covers almost all of its input.
 *
 * Bump PLAN_PROMPT_VERSION whenever the rules or the schema change; it is stored with every plan
 * and every usage row.
 */
export const PLAN_PROMPT_VERSION = 'momentum-plan-prompt/1.0.0'
export const LEAN_SCHEMA_VERSION = 'momentum-plan-lean/1.0.0'
export const LEAN_SCHEMA_NAME = 'momentum_plan_lean'

export const WORKOUT_TYPES = ['strength', 'full_body', 'crossfit', 'cardio', 'walk', 'mobility'] as const
export const INTENSITIES = ['low', 'moderate', 'high'] as const
const SLOTS = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_sleep']
const REF = '^[a-z0-9][a-z0-9-]{0,11}$'
const CATALOG_REF = '^[a-z0-9][a-z0-9._-]{0,79}$'

const note = (max: number) => ({ type: ['string', 'null'], maxLength: max })

/** Compact model output. Strict-mode compatible: every property required, nullables typed. */
export const leanPlanJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    schema_version: { type: 'string', const: LEAN_SCHEMA_VERSION },
    plan_name: { type: 'string', minLength: 1, maxLength: 80 },
    summary: { type: 'string', minLength: 1, maxLength: 300 },
    meals: {
      type: 'array',
      minItems: 1,
      maxItems: 48,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: REF },
          slot: { type: 'string', enum: SLOTS },
          food: { type: 'string', pattern: CATALOG_REF },
          alts: { type: 'array', maxItems: 2, items: { type: 'string', pattern: CATALOG_REF } },
          note: note(120),
        },
        required: ['id', 'slot', 'food', 'alts', 'note'],
        additionalProperties: false,
      },
    },
    workouts: {
      type: 'array',
      maxItems: 16,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: REF },
          title: { type: 'string', minLength: 1, maxLength: 60 },
          type: { type: 'string', enum: [...WORKOUT_TYPES] },
          minutes: { type: 'integer', minimum: 10, maximum: 120 },
          intensity: { type: 'string', enum: [...INTENSITIES] },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: {
              type: 'object',
              properties: {
                ex: { type: 'string', pattern: CATALOG_REF },
                sets: { type: 'integer', minimum: 1, maximum: 8 },
                reps: { type: 'string', minLength: 1, maxLength: 12 },
                rest: { type: 'integer', minimum: 0, maximum: 300 },
                sub: { type: ['string', 'null'], pattern: CATALOG_REF },
              },
              required: ['ex', 'sets', 'reps', 'rest', 'sub'],
              additionalProperties: false,
            },
          },
          note: note(120),
        },
        required: ['id', 'title', 'type', 'minutes', 'intensity', 'items', 'note'],
        additionalProperties: false,
      },
    },
    days: {
      type: 'array',
      minItems: MONTHLY_PLAN_DAYS,
      maxItems: MONTHLY_PLAN_DAYS,
      items: {
        type: 'object',
        properties: {
          d: { type: 'integer', minimum: 0, maximum: MONTHLY_PLAN_DAYS - 1 },
          meals: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', pattern: REF } },
          workout: { type: ['string', 'null'], pattern: REF },
          note: note(120),
        },
        required: ['d', 'meals', 'workout', 'note'],
        additionalProperties: false,
      },
    },
    tips: {
      type: 'object',
      properties: {
        restaurant: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: { type: 'string', minLength: 1, maxLength: 140 },
        },
        general: {
          type: 'array',
          maxItems: 3,
          items: { type: 'string', minLength: 1, maxLength: 140 },
        },
      },
      required: ['restaurant', 'general'],
      additionalProperties: false,
    },
  },
  required: ['schema_version', 'plan_name', 'summary', 'meals', 'workouts', 'days', 'tips'],
  additionalProperties: false,
}

const RULES = `You are Momentum's plan composer. You arrange a ${MONTHLY_PLAN_DAYS}-day nutrition and training plan for a general-wellness app from allowlists in a JSON brief. You never calculate nutrition: the server has computed the calorie, macro and water targets and scales every portion after you answer. Never output portions, grams, calories or other nutrition numbers.

BRIEF
- targets: daily goals, already final.
- foods rows: [food_id, meal codes, kcal per serving, protein g per serving]. Codes: b=breakfast ms=morning_snack l=lunch as=afternoon_snack d=dinner ps=pre_sleep.
- exercises rows: [exercise_id, movement pattern, equipment, allowed substitutes].
- meals.slots: the meal types every day has, in order. meals.options: wanted choices per meal.
- training.train_days: day indexes that must have a workout. training.light_days: optional walk or mobility only. Every other day is a rest day.
- history: last month's results (cycle 2+); note is the user's own wish for this month.

FOOD RULES
1. Use only food_id values from foods, only for a slot whose meal code the row lists.
2. A meal definition is one slot + one food + up to (meals.options - 1) alts from the same list and slot, close in kcal. Reuse definitions across days.
3. Every day lists one meal definition per slot, in meals.slots order.
4. Variety over the month: at least 4 different foods per slot when the list has them; the same food at most 3 days in a row in a slot; lunch and dinner differ on a day.
5. Pick foods whose summed kcal and protein per day land near targets at 1 serving each; prefer protein-dense foods for fat_loss and muscle_gain.
6. Respect diet.favorites, diet.cooking flags (quick, no_cooking, meal_prep, portable_lunch, no_oven), budget, cuisine and country.

TRAINING RULES
7. Use only exercise_id values from exercises; sub is one of that row's substitutes or null.
8. Put a workout on every train_days index and on no other day except light_days (type walk or mobility, intensity low). All other days: workout null.
9. Each workout fits training.session_min within 10 minutes. strength/full_body/crossfit/cardio: 3-8 items, 2-5 sets per item, rest 45-180 s. walk/mobility: 1-6 items, rest 0-60 s.
10. Total sets per workout at most 16 (beginner), 22 (intermediate), 26 (advanced). Beginners and anyone with injury true: intensity low or moderate only. reps is a count or range ("8-12") or time ("30s").
11. Balance movement patterns across each week (squat, hinge, push, pull, core). Spread hard sessions; no two high-intensity days in a row.
12. Progression with separate workout definitions per block: days 0-13 base; days 14-20 add 1 set or 2 reps to main lifts; days 21-29 hold or progress slightly. Beginners add reps before sets. Weekly total sets rise at most 20% between blocks.

TEXT RULES
13. Write plan_name, summary, titles, notes and tips in brief.lang (fa-IR: Persian, en-US: English).
14. Notes are short, practical and personal: refer to the goal, schedule, cooking flags or history. Day notes about once a week; null otherwise.
15. tips.restaurant: how to order when eating out, without numbers. tips.general: habits such as water, sleep and steps.
16. No diagnosis, treatment, medication or supplement advice, and no promises about results.

Return only JSON that matches this schema (schema_version "${LEAN_SCHEMA_VERSION}"):
`

/** Static system text. Identical bytes for every user, so the provider can cache it. */
export const PLAN_SYSTEM_PROMPT = RULES + JSON.stringify(leanPlanJsonSchema)

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AssembledPrompt {
  promptVersion: typeof PLAN_PROMPT_VERSION
  schemaVersion: typeof LEAN_SCHEMA_VERSION
  schemaName: typeof LEAN_SCHEMA_NAME
  schema: Record<string, unknown>
  messages: PromptMessage[]
  /** Same for every user: routes all calls to the same provider cache shard. */
  cacheKey: string
}

export function briefMessage(brief: PlanBrief): string {
  return JSON.stringify(brief)
}

export function assemblePlanPrompt(brief: PlanBrief): AssembledPrompt {
  return {
    promptVersion: PLAN_PROMPT_VERSION,
    schemaVersion: LEAN_SCHEMA_VERSION,
    schemaName: LEAN_SCHEMA_NAME,
    schema: leanPlanJsonSchema,
    messages: [
      { role: 'system', content: PLAN_SYSTEM_PROMPT },
      { role: 'user', content: briefMessage(brief) },
    ],
    cacheKey: `${PLAN_PROMPT_VERSION}:${LEAN_SCHEMA_VERSION}`,
  }
}

export const MAX_REPAIR_ISSUES = 25

/**
 * One repair turn: the original conversation, the model's answer, then the validator's issues.
 * The answer is re-sent verbatim (not re-serialized) so the cached prefix still matches.
 */
export function assembleRepairPrompt(input: {
  brief: PlanBrief
  previousOutput: string
  issues: readonly string[]
}): AssembledPrompt {
  const base = assemblePlanPrompt(input.brief)
  const issues = input.issues.slice(0, MAX_REPAIR_ISSUES)
  return {
    ...base,
    messages: [
      ...base.messages,
      // A cut-off or unparseable answer is not worth re-sending; the issues describe it.
      ...(input.previousOutput
        ? [{ role: 'assistant' as const, content: input.previousOutput.slice(0, 60_000) }]
        : []),
      {
        role: 'user',
        content: [
          'The server rejected this plan. Fix every issue below, keep everything else, and return',
          'the complete corrected JSON.',
          ...issues.map((issue) => `- ${issue}`),
        ].join('\n'),
      },
    ],
  }
}
