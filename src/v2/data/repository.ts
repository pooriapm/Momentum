import type { AppLocale } from '../../platform/i18n/catalog'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import {
  accountDeleteResponseSchema,
  accountDeletionStatusResponseSchema,
  accountExportResponseSchema,
  accountExportStatusResponseSchema,
  dashboardResponseSchema,
  type AccountExportResponse,
  type DashboardResponse,
} from './contracts'
import { mapEntitlementStatus, type MembershipStatus } from '../entitlement'
import type { LocalizedText, MealChoice, MomentumPlanDayView, MomentumPlanView, PlanChange, PlanVersionMeta } from './types'

type Dashboard = DashboardResponse['dashboard']

function localized(value: string): LocalizedText {
  return { fa: value, en: value }
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLocalDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

function scoreFromCheckIn(checkin: Dashboard['checkin']) {
  if (!checkin) return 0
  const scores = [
    checkin.energy_score ? checkin.energy_score * 20 : null,
    checkin.mood_score ? checkin.mood_score * 20 : null,
    checkin.sleep_minutes ? Math.min(100, (checkin.sleep_minutes / 480) * 100) : null,
    checkin.adherence_percent,
  ].filter((value): value is number => value !== null)
  return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0
}

function recoveryFromCheckIn(checkin: Dashboard['checkin']) {
  if (!checkin) return 0
  const sleep = checkin.sleep_minutes ? Math.min(100, (checkin.sleep_minutes / 480) * 100) : null
  const energy = checkin.energy_score ? checkin.energy_score * 20 : null
  const values = [sleep, energy].filter((value): value is number => value !== null)
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
}

function consecutiveDays(checkins: Dashboard['recent_checkins'], today: string) {
  const dates = [...new Set(checkins.map((item) => item.local_date))].sort().reverse()
  const expected = new Date(`${today}T00:00:00`)
  let streak = 0
  for (const date of dates) {
    if (date !== localIsoDate(expected)) break
    streak += 1
    expected.setDate(expected.getDate() - 1)
  }
  return streak
}

function planEntitlementStatus(usage: Dashboard['entitlement_usage']): MembershipStatus {
  return mapEntitlementStatus(usage)
}

function strategyName(mode: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    balanced: { fa: 'روز متعادل', en: 'Balanced day' },
    training_day: { fa: 'روز تمرین', en: 'Training day' },
    rest_day: { fa: 'روز استراحت', en: 'Rest day' },
    recovery_day: { fa: 'روز ریکاوری', en: 'Recovery day' },
  }
  return labels[mode]?.[locale] ?? mode.replaceAll('_', ' ')
}

function mapConfidence(source: MealChoice['nutritionSource']): MealChoice['confidence'] {
  if (source === 'verified_database') return 'verified'
  if (source === 'food_label') return 'manufacturer'
  return 'estimated'
}

function localizePlanChange(label: string, detail: string): PlanChange {
  const cycleMatch = /^cycle (\d+) imported$/.exec(label)
  if (cycleMatch) {
    return {
      label: { fa: `چرخه ${cycleMatch[1]} وارد شد`, en: label },
      detail: { fa: detail, en: detail },
    }
  }
  if (label === 'catalog release') {
    return {
      label: { fa: 'نسخه کاتالوگ', en: 'catalog release' },
      detail: { fa: detail, en: detail },
    }
  }
  return { label: localized(label), detail: localized(detail) }
}

export function mapPlanHistory(
  items: NonNullable<Dashboard['plan_history']>,
): PlanVersionMeta[] {
  return items.map((item) => ({
    id: item.id,
    label: /v2/i.test(item.schema_version) ? 'v2' : item.schema_version,
    cycle: item.cycle,
    validFrom: item.valid_from,
    validTo: item.valid_to,
    readyAt: item.ready_at ?? undefined,
    source: localized(`${item.source} · ${item.locale}`),
    active: item.active,
    changes: item.changes.map((change) => localizePlanChange(change.label, change.detail)),
  }))
}

type DashboardPlanDay = NonNullable<Dashboard['plan']>['day']

function mapPlanDay(day: DashboardPlanDay, planId: string, locale: AppLocale): MomentumPlanDayView {
  const meals = day.meals.map((meal) => ({
    id: meal.slot_key,
    type: meal.type,
    label: localized(meal.title),
    time: meal.scheduled_time ?? '—',
    selectedOptionId: meal.selected_option_key ?? meal.default_option_key,
    completionStatus: meal.completion_status,
    options: meal.options.map((option) => {
      const description = option.ingredients
        .map((ingredient) => `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`)
        .join(' · ')
      return {
        id: option.option_key,
        name: localized(option.title),
        description: localized(description),
        nutrition: {
          calories: option.nutrition.calories,
          protein: option.nutrition.protein_g,
          carbs: option.nutrition.carbs_g,
          fat: option.nutrition.fat_g,
        },
        confidence: mapConfidence(option.nutrition.source),
        confidenceLevel: option.nutrition.confidence,
        nutritionSource: option.nutrition.source,
        cookingMinutes: (option.recipe?.prep_minutes ?? 0) + (option.recipe?.cook_minutes ?? 0),
        ingredients: option.ingredients.map((ingredient) => ({
          name: localized(ingredient.name),
          amount: ingredient.amount,
          unit: ingredient.unit,
          note: ingredient.note ? localized(ingredient.note) : undefined,
        })),
        recipe: option.recipe ? {
          prepMinutes: option.recipe.prep_minutes,
          cookMinutes: option.recipe.cook_minutes,
          steps: option.recipe.steps.map(localized),
        } : null,
        warnings: option.warnings.map(localized),
      }
    }),
  }))

  return {
    localDate: day.local_date,
    dateLabel: localized(day.title ?? formatLocalDate(day.local_date, locale)),
    adjustmentReason: localized(day.target_strategy?.rationale ?? ''),
    targets: {
      calories: day.targets.calories,
      protein: day.targets.protein_g,
      carbs: day.targets.carbs_g,
      fat: day.targets.fat_g,
    },
    targetStrategy: localized(strategyName(day.target_strategy?.mode ?? 'balanced', locale)),
    meals,
    workout: day.workout ? {
      id: `${planId}-${day.day_index}`,
      name: localized(day.workout.title),
      focus: localized(day.workout.safety_note ?? strategyName(day.training_type, locale)),
      durationMinutes: day.workout.duration_minutes,
      exercises: day.workout.exercises.length,
      exerciseItems: day.workout.exercises.map((exercise) =>
        localized(`${exercise.name} · ${exercise.sets} × ${exercise.reps}`),
      ),
      exerciseDetails: day.workout.exercises.map((exercise) => ({
        key: exercise.exercise_key,
        name: localized(exercise.name),
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.rest_seconds,
        substitution: exercise.substitution ? localized(exercise.substitution) : null,
        equipment: exercise.equipment.map(localized),
      })),
      intensity: day.workout.intensity,
      equipment: [...new Set(day.workout.exercises.flatMap((exercise) => exercise.equipment))].map(localized),
      warmup: day.workout.warmup.map(localized),
      cooldown: day.workout.cooldown.map(localized),
    } : null,
  }
}

function mapDashboardToPlan(dashboard: Dashboard, locale: AppLocale): MomentumPlanView | null {
  const plan = dashboard.plan
  const goal = dashboard.active_goal
  if (!plan || !goal) return null
  const checkin = dashboard.checkin
  const currentWeight = checkin?.weight_kg ?? dashboard.latest_body_weight?.weight_kg ?? goal.start_weight_kg
  const adherenceValues = dashboard.recent_checkins
    .map((item) => item.adherence_percent)
    .filter((value): value is number => value !== null)
    .slice(0, 7)
  const weeklyAdherence = adherenceValues.length
    ? Math.round(adherenceValues.reduce((sum, value) => sum + value, 0) / adherenceValues.length)
    : 0

  const currentDay = mapPlanDay(plan.day, plan.id, locale)
  const loggedCalories = plan.day.meals.reduce((sum, meal) => {
    if (meal.completion_status !== 'completed') return sum
    const selectedKey = meal.selected_option_key ?? meal.default_option_key
    return sum + (meal.options.find((option) => option.option_key === selectedKey)?.nutrition.calories ?? 0)
  }, 0)
  const readiness = scoreFromCheckIn(checkin)
  const history = mapPlanHistory(dashboard.plan_history ?? plan.history ?? [])
  const currentVersion = history.find((item) => item.id === plan.version_id)
    ?? history.find((item) => item.active)
  const version: PlanVersionMeta = currentVersion ?? {
    id: plan.version_id,
    label: /v2/i.test(plan.schema_version) ? 'v2' : plan.schema_version,
    cycle: Math.max(1, dashboard.entitlement_usage?.plan_generation.used ?? 1),
    validFrom: plan.valid_from,
    validTo: plan.valid_to,
    readyAt: dashboard.entitlement_usage?.entitlement.period_start,
    source: localized(plan.name),
    active: true,
    changes: [],
  }

  return {
    localDate: dashboard.local_date,
    timezone: dashboard.profile.timezone,
    contentLocale: plan.content_locale === 'fa-IR' ? 'fa' : 'en',
    userName: dashboard.profile.display_name
      ? localized(dashboard.profile.display_name)
      : { fa: 'همراه Momentum', en: 'Momentum member' },
    dateLabel: currentDay.dateLabel,
    monthlyPlanBrief: localized(plan.summary ?? (locale === 'fa' ? 'برنامه این ماه آماده است.' : 'This month’s plan is ready.')),
    adjustmentReason: currentDay.adjustmentReason,
    targets: currentDay.targets,
    targetStrategy: currentDay.targetStrategy,
    meals: currentDay.meals,
    workout: currentDay.workout,
    shoppingGroups: plan.grocery_list.map((group, index) => ({
      id: `${plan.id}-grocery-${index}`,
      name: localized(group.category),
      items: group.items.map((item) => localized(`${item.name} · ${item.amount} ${item.unit}`)),
    })),
    progress: {
      currentWeight,
      startWeight: goal.start_weight_kg,
      targetWeight: goal.target_weight_kg,
      weeklyAdherence,
      readiness,
      recovery: recoveryFromCheckIn(checkin),
      streak: consecutiveDays(dashboard.recent_checkins, dashboard.local_date),
      loggedCalories,
      sleepMinutes: checkin?.sleep_minutes ?? 0,
      energyScore: checkin?.energy_score ?? 0,
      entitlementLabel: dashboard.entitlement_usage?.entitlement.source === 'gift'
        ? { fa: 'هدیه برنامه اول', en: 'First-plan gift' }
        : { fa: 'عضویت Momentum', en: 'Momentum membership' },
      entitlementStatus: planEntitlementStatus(dashboard.entitlement_usage),
      entitlementPeriodEnd: dashboard.entitlement_usage?.entitlement.period_end,
      productRegion: dashboard.profile.product_region,
      recentCheckIns: dashboard.recent_checkins.slice(0, 7).map((item) => ({
        date: localized(formatLocalDate(item.local_date, locale)),
        score: scoreFromCheckIn(item),
        note: localized(item.energy_score
          ? (locale === 'fa' ? `انرژی ${item.energy_score} از ۵` : `Energy ${item.energy_score} of 5`)
          : (locale === 'fa' ? 'ثبت روزانه' : 'Daily check-in')),
        weight: item.weight_kg ?? undefined,
      })),
    },
    days: plan.days.map((day) => mapPlanDay(day, plan.id, locale)),
    version: { ...version, active: true },
    history: history.length ? history : [{ ...version, active: true }],
  }
}

export { mapDashboardToPlan }

export interface AccountDashboardView {
  plan: MomentumPlanView | null
  onboardingStatus: string
  automationBlockReason: string | null
  countryCode: string | null
  aiCountryVerified: boolean
  aiPlanAccess: Dashboard['ai_access']['plan']
  entitlementStatus?: MembershipStatus
  entitlementPeriodEnd?: string
  productRegion?: 'ir' | 'intl'
  planSourcePreference?: 'external' | 'momentum'
}

export async function loadAccountDashboard(locale: AppLocale): Promise<AccountDashboardView> {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'dashboard' },
  })
  if (error) throw error
  const parsed = dashboardResponseSchema.parse(data)
  return {
    plan: mapDashboardToPlan(parsed.dashboard, locale),
    onboardingStatus: parsed.dashboard.profile.onboarding_status,
    automationBlockReason: parsed.dashboard.profile.automation_block_reason,
    countryCode: parsed.dashboard.profile.country_code,
    aiCountryVerified: parsed.dashboard.profile.ai_country_verified ?? false,
    aiPlanAccess: parsed.dashboard.ai_access.plan,
    entitlementStatus: planEntitlementStatus(parsed.dashboard.entitlement_usage),
    entitlementPeriodEnd: parsed.dashboard.entitlement_usage?.entitlement.period_end,
    productRegion: parsed.dashboard.profile.product_region,
    planSourcePreference: parsed.dashboard.profile.plan_source_preference,
  }
}

export async function logMealSelection(date: string, slotKey: string, optionKey: string) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client.functions.invoke('account-data', {
    body: { action: 'select-meal', local_date: date, slot_key: slotKey, option_key: optionKey },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  if (error) throw error
}

export async function completeMeal(date: string, slotKey: string, optionKey: string) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client.functions.invoke('account-data', {
    body: { action: 'complete-meal', local_date: date, slot_key: slotKey, option_key: optionKey },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  if (error) throw error
}

export async function undoMeal(date: string, slotKey: string, optionKey: string) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client.functions.invoke('account-data', {
    body: { action: 'undo-meal', local_date: date, slot_key: slotKey, option_key: optionKey },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  if (error) throw error
}

export async function exportAccountData(): Promise<AccountExportResponse> {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'export-account' },
  })
  if (error) throw error
  return accountExportResponseSchema.parse(data)
}

export async function loadAccountExportStatus() {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'export-status' },
  })
  if (error) throw error
  return accountExportStatusResponseSchema.parse(data)
}

export async function downloadAccountExport(): Promise<AccountExportResponse> {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'export-download' },
  })
  if (error) throw error
  return accountExportResponseSchema.parse(data)
}

export async function loadAccountDeletionStatus() {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'deletion-status' },
  })
  if (error) throw error
  return accountDeletionStatusResponseSchema.parse(data)
}

export async function deleteAccount() {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'delete-account', confirmation: 'DELETE' },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  if (error) throw error
  accountDeleteResponseSchema.parse(data)
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
}

export const currentLocalDate = localIsoDate
