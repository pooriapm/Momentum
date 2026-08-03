import type { AppLocale } from '../../platform/i18n/catalog'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import {
  accountDeleteResponseSchema,
  accountExportResponseSchema,
  coachEdgeResponseSchema,
  coachHistoryRowsSchema,
  dashboardResponseSchema,
  type DashboardResponse,
} from './contracts'
import type { LocalizedText, MealChoice, MomentumPlanDayView, MomentumPlanView } from './types'

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
      intensity: day.workout.intensity,
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
  const usage = dashboard.entitlement_usage?.coach_message
  const readiness = scoreFromCheckIn(checkin)

  return {
    localDate: dashboard.local_date,
    timezone: dashboard.profile.timezone,
    contentLocale: plan.content_locale === 'fa-IR' ? 'fa' : 'en',
    userName: dashboard.profile.display_name
      ? localized(dashboard.profile.display_name)
      : { fa: 'همراه Momentum', en: 'Momentum member' },
    dateLabel: currentDay.dateLabel,
    coachBrief: localized(plan.summary ?? (locale === 'fa' ? 'برنامه امروز آماده است.' : 'Today’s plan is ready.')),
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
      coachMessagesUsed: usage?.used ?? 0,
      coachMessagesLimit: Math.max(1, usage?.limit ?? 1),
      entitlementLabel: dashboard.entitlement_usage?.entitlement.source === 'trial'
        ? { fa: 'نسخه آزمایشی', en: 'Trial' }
        : { fa: 'عضویت Momentum', en: 'Momentum membership' },
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
  }
}

export interface AccountDashboardView {
  plan: MomentumPlanView | null
  onboardingStatus: string
  automationBlockReason: string | null
  countryCode: string | null
  aiCountryVerified: boolean
  aiPlanAccess: Dashboard['ai_access']['plan']
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

export interface DailyCheckInInput {
  adherencePercent?: number
  energyScore: number
  hungerScore: number
  moodScore: number
  sleepMinutes: number
  weightKg?: number
}

export async function saveDailyCheckIn(input: DailyCheckInInput, localDate: string, timezone: string) {
  assertOnline()
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw authError ?? new Error('authentication_required')
  const { error } = await client.from('daily_checkins').upsert({
    user_id: authData.user.id,
    local_date: localDate,
    timezone,
    sleep_minutes: input.sleepMinutes,
    hunger_score: input.hungerScore,
    mood_score: input.moodScore,
    energy_score: input.energyScore,
    adherence_percent: input.adherencePercent ?? null,
    weight_kg: input.weightKg ?? null,
  }, { onConflict: 'user_id,local_date' })
  if (error) throw error
}

export async function exportAccountData() {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'export-account' },
  })
  if (error) throw error
  return accountExportResponseSchema.parse(data).export
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

export async function sendCoachMessage(
  message: string,
  locale: AppLocale,
  threadId?: string,
  idempotencyKey: string = crypto.randomUUID(),
) {
  assertOnline()
  const client = requireSupabase()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await client.functions.invoke('coach', {
      body: {
        message,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        thread_id: threadId,
      },
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    if (error) throw error
    const parsed = coachEdgeResponseSchema.parse(data)
    if ('message' in parsed) {
      return {
        message: parsed.message.content,
        threadId: parsed.thread_id,
        safety: parsed.safety,
        suggestedActions: parsed.suggested_actions ?? [],
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1_000))
  }
  throw new Error('coach_response_still_processing')
}

export async function loadCoachHistory(locale: AppLocale) {
  const client = requireSupabase()
  const { data: thread, error: threadError } = await client
    .from('coach_threads')
    .select('id')
    .eq('status', 'active')
    .eq('locale', locale === 'fa' ? 'fa-IR' : 'en-US')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (threadError) throw threadError
  if (!thread) return { threadId: undefined, messages: [], suggestedActions: [] as string[] }

  const { data: rows, error: messageError } = await client
    .from('coach_messages')
    .select('id,role,content,safety_level,suggested_actions,created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })
    .limit(100)
  if (messageError) throw messageError
  const messages = coachHistoryRowsSchema.parse(rows ?? [])
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  return {
    threadId: thread.id,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      safetyLevel: message.safety_level,
    })),
    suggestedActions: lastAssistant?.suggested_actions ?? [],
  }
}

export const currentLocalDate = localIsoDate
