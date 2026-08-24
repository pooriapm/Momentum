import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardResponseSchema, planHistoryItemSchema } from './contracts'
import { currentLocalDate, mapDashboardToPlan, mapPlanHistory, undoMeal } from './repository'
import type { DashboardResponse } from './contracts'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../../platform/data/supabase', () => ({
  requireSupabase: () => ({
    functions: { invoke: mocks.invoke },
  }),
}))
vi.mock('../../platform/pwa/network', () => ({ assertOnline: vi.fn() }))

const currentVersionId = '33333333-3333-4333-8333-333333333333'
const priorVersionId = '44444444-4444-4444-8444-444444444444'

const nutrition = {
  calories: 620,
  protein_g: 42,
  carbs_g: 70,
  fat_g: 16,
  fiber_g: 8,
  confidence: 'medium' as const,
  source: 'catalog_reference' as const,
}

const day = {
  local_date: '2026-08-18',
  day_index: 0,
  title: 'Day 1',
  training_type: 'strength',
  target_strategy: { mode: 'training_day', rationale: 'Lift' },
  targets: {
    calories: 2100,
    protein_g: 140,
    carbs_g: 220,
    fat_g: 70,
    fiber_g: 30,
    water_ml: 2500,
  },
  workout: null,
  meals: [{
    slot_key: 'lunch',
    type: 'lunch',
    title: 'Lunch',
    scheduled_time: '13:00',
    default_option_key: 'chicken-rice',
    selected_option_key: 'chicken-rice',
    completion_status: 'completed' as const,
    completed_at: '2026-08-18T10:00:00.000Z',
    options: [{
      option_key: 'chicken-rice',
      title: 'Chicken rice',
      ingredients: [{ name: 'Chicken', amount: 160, unit: 'g', note: null }],
      nutrition,
      recipe: null,
      portable: false,
      warnings: [],
    }],
  }],
}

const history = [
  {
    id: currentVersionId,
    cycle: 2,
    valid_from: '2026-08-18',
    valid_to: '2026-09-16',
    ready_at: '2026-08-18T08:00:00.000Z',
    active: true,
    locale: 'fa-IR' as const,
    catalog_release: 'momentum-core@v2',
    source: 'openai',
    schema_version: '1.2.0',
    changes: [
      { label: 'cycle 2 imported', detail: 'openai · locale fa-IR' },
      { label: 'catalog release', detail: 'momentum-core@v2' },
    ],
  },
  {
    id: priorVersionId,
    cycle: 1,
    valid_from: '2026-07-18',
    valid_to: '2026-08-16',
    ready_at: '2026-07-18T08:00:00.000Z',
    active: false,
    locale: 'en-US' as const,
    catalog_release: 'momentum-core@v2',
    source: 'openai',
    schema_version: '1.1.0',
    changes: [
      { label: 'cycle 1 imported', detail: 'openai · locale en-US' },
      { label: 'catalog release', detail: 'momentum-core@v2' },
    ],
  },
]

const dashboard: DashboardResponse['dashboard'] = {
  local_date: '2026-08-18',
  profile: {
    display_name: 'Ava',
    date_of_birth: '1994-01-01',
    sex: 'female',
    height_cm: 168,
    locale: 'fa-IR',
    timezone: 'Asia/Tehran',
    country_code: 'IR',
    pricing_market: 'ir',
    product_region: 'ir',
    unit_system: 'metric',
    onboarding_status: 'complete',
    automation_block_reason: null,
    plan_source_preference: 'momentum',
  },
  active_goal: {
    id: '55555555-5555-4555-8555-555555555555',
    goal_type: 'fat_loss',
    custom_goal: null,
    start_weight_kg: 72,
    target_weight_kg: 66,
    journey_start_date: '2026-07-18',
    target_date: '2026-10-18',
    status: 'active',
  },
  checkin: null,
  recent_checkins: [],
  latest_body_weight: null,
  entitlement_usage: {
    entitlement: {
      id: '66666666-6666-4666-8666-666666666666',
      source: 'subscription',
      status: 'active',
      period_start: '2026-08-18T08:00:00.000Z',
      period_end: '2026-09-16T08:00:00.000Z',
    },
    plan_generation: { used: 2, limit: 1, remaining: 0 },
  },
  ai_access: { plan: { state: 'ready', reason: 'eligible' } },
  plan: {
    id: '22222222-2222-4222-8222-222222222222',
    version_id: currentVersionId,
    schema_version: '1.2.0',
    content_locale: 'fa-IR',
    name: 'August plan',
    valid_from: '2026-08-18',
    valid_to: '2026-09-16',
    locale: 'fa-IR',
    summary: 'Imported cycle 2',
    grocery_list: [],
    health_safety_notes: [],
    day,
    days: [day],
    history,
  },
  plan_history: history,
  progress_series: [{
    week: 1,
    week_start: '2026-08-17',
    week_end: '2026-08-23',
    workouts_completed: 2,
    workouts_planned: 3,
    meals_completed: 5,
    meals_planned: 7,
    energy: 7,
    adherence: 70,
    partial: true,
  }],
}

describe('plan history mapping', () => {
  it('uses the account timezone rather than the device timezone for date boundaries', () => {
    const instant = new Date('2026-01-01T00:30:00.000Z')
    expect(currentLocalDate('Asia/Tehran', instant)).toBe('2026-01-01')
    expect(currentLocalDate('America/Los_Angeles', instant)).toBe('2025-12-31')
    expect(currentLocalDate('UTC', instant)).toBe('2026-01-01')
  })

  it('accepts dashboard plan_history items', () => {
    expect(planHistoryItemSchema.parse(history[0]).cycle).toBe(2)
    expect(dashboardResponseSchema.parse({ dashboard }).dashboard.plan_history).toHaveLength(2)
  })

  it('maps prior versions and deterministic cycle/catalog changes', () => {
    const mapped = mapPlanHistory(history)
    expect(mapped).toHaveLength(2)
    expect(mapped[0]).toMatchObject({
      id: currentVersionId,
      cycle: 2,
      validFrom: '2026-08-18',
      validTo: '2026-09-16',
      readyAt: '2026-08-18T08:00:00.000Z',
      active: true,
    })
    expect(mapped[0]?.changes[0]?.label.en).toBe('cycle 2 imported')
    expect(mapped[0]?.changes[1]?.detail.en).toBe('momentum-core@v2')
    expect(mapped[1]?.active).toBe(false)
    expect(mapped[1]?.cycle).toBe(1)
  })

  it('projects history onto the active plan view', () => {
    const plan = mapDashboardToPlan(dashboard, 'en')
    expect(plan?.version?.id).toBe(currentVersionId)
    expect(plan?.version?.cycle).toBe(2)
    expect(plan?.version?.changes.map((change) => change.label.en)).toEqual([
      'cycle 2 imported',
      'catalog release',
    ])
    expect(plan?.history?.map((item) => item.id)).toEqual([currentVersionId, priorVersionId])
    expect(plan?.progress.weeklyAdherence).toBe(70)
    expect(plan?.progress.weeklySeries).toEqual([{
      week: 1,
      workoutsCompleted: 2,
      workoutsPlanned: 3,
      mealsCompleted: 5,
      mealsPlanned: 7,
      energy: 7,
      adherence: 70,
      partial: true,
    }])
  })
})

describe('undo-meal account-data action', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
    mocks.invoke.mockResolvedValue({ data: { undo: { status: 'planned' } }, error: null })
  })

  it('persists meal undo through account-data undo-meal', async () => {
    await undoMeal('2026-08-18', 'lunch', 'chicken-rice')

    expect(mocks.invoke).toHaveBeenCalledWith('account-data', {
      body: {
        action: 'undo-meal',
        local_date: '2026-08-18',
        slot_key: 'lunch',
        option_key: 'chicken-rice',
      },
      headers: { 'Idempotency-Key': expect.any(String) },
    })
  })
})
