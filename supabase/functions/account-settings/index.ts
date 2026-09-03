import { authenticate } from '../_shared/auth.ts'
import { integerEnv } from '../_shared/config.ts'
import { canonicalJson, sha256 } from '../_shared/crypto.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  requireIdempotencyKey,
} from '../_shared/http.ts'
import { enforceRateLimit } from '../_shared/limits.ts'
import { assertAccountSettingsEnrollmentAccess } from '../_shared/release-gates.ts'

interface SettingsBody {
  action?: unknown
  settings?: unknown
  confirmation?: unknown
  enabled?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, field: string, maximum: number, required = true) {
  if (typeof value !== 'string' || value.trim().length > maximum || (required && !value.trim())) {
    throw new HttpError(422, 'invalid_settings', `${field} is invalid.`)
  }
  return value.trim()
}

function choice<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(422, 'invalid_settings', `${field} is invalid.`)
  }
  return value as T
}

function numberValue(value: unknown, field: string, minimum: number, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new HttpError(422, 'invalid_settings', `${field} is invalid.`)
  }
  return value
}

function textList(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length > 50) {
    throw new HttpError(422, 'invalid_settings', `${field} is invalid.`)
  }
  const items = value.map((item) => text(item, field, 160))
  if (new Set(items.map((item) => item.toLocaleLowerCase())).size !== items.length) {
    throw new HttpError(422, 'invalid_settings', `${field} contains duplicates.`)
  }
  return items
}

function parseSettings(value: unknown) {
  if (!isRecord(value)) throw new HttpError(422, 'invalid_settings', 'Settings are required.')
  const allowedKeys = new Set([
    'displayName',
    'sex',
    'heightCm',
    'locale',
    'unitSystem',
    'goalType',
    'customGoal',
    'targetWeightKg',
    'dietaryPattern',
    'favoriteFoods',
    'allergies',
    'availableEquipment',
    'workSchedule',
    'cuisineRegion',
    'schedule',
  ])
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new HttpError(
      422,
      'protected_or_unknown_setting',
      'A protected or unknown setting was supplied.',
    )
  }
  if (!Array.isArray(value.schedule) || value.schedule.length > 7) {
    throw new HttpError(422, 'invalid_settings', 'schedule is invalid.')
  }
  const schedule = value.schedule.map((item) => {
    if (!isRecord(item)) throw new HttpError(422, 'invalid_settings', 'schedule is invalid.')
    const weekday = numberValue(item.weekday, 'weekday', 0, 6)
    if (!Number.isInteger(weekday)) {
      throw new HttpError(422, 'invalid_settings', 'weekday is invalid.')
    }
    const duration = numberValue(item.durationMinutes, 'durationMinutes', 10, 300)
    if (!Number.isInteger(duration)) {
      throw new HttpError(422, 'invalid_settings', 'durationMinutes is invalid.')
    }
    const start = text(item.localStartTime, 'localStartTime', 5)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
      throw new HttpError(422, 'invalid_settings', 'localStartTime is invalid.')
    }
    return {
      weekday,
      activity_type: choice(
        item.activityType,
        'activityType',
        ['strength', 'crossfit', 'full_body', 'cardio', 'walk', 'mobility', 'other'] as const,
      ),
      local_start_time: start,
      duration_minutes: duration,
    }
  })
  if (new Set(schedule.map((item) => item.weekday)).size !== schedule.length) {
    throw new HttpError(422, 'invalid_settings', 'Schedule days must be unique.')
  }
  const goalType = choice(
    value.goalType,
    'goalType',
    ['fat_loss', 'muscle_gain', 'maintenance', 'performance', 'custom'] as const,
  )
  const customGoal = value.customGoal === undefined
    ? null
    : text(value.customGoal, 'customGoal', 1000, false) || null
  if (goalType === 'custom' && !customGoal) {
    throw new HttpError(422, 'invalid_settings', 'customGoal is required.')
  }

  return {
    display_name: text(value.displayName, 'displayName', 120),
    sex: choice(value.sex, 'sex', ['female', 'male', 'other', 'prefer_not_to_say'] as const),
    height_cm: numberValue(value.heightCm, 'heightCm', 100, 250),
    locale: choice(value.locale, 'locale', ['fa-IR', 'en-US'] as const),
    unit_system: choice(
      value.unitSystem,
      'unitSystem',
      ['auto', 'metric', 'us_customary'] as const,
    ),
    goal_type: goalType,
    custom_goal: customGoal,
    target_weight_kg: numberValue(value.targetWeightKg, 'targetWeightKg', 35, 350),
    dietary_pattern: text(value.dietaryPattern, 'dietaryPattern', 200),
    favorite_foods: textList(value.favoriteFoods, 'favoriteFoods'),
    allergies: textList(value.allergies, 'allergies'),
    available_equipment: textList(value.availableEquipment, 'availableEquipment'),
    work_schedule: text(value.workSchedule, 'workSchedule', 1000, false),
    cuisine_region: choice(
      value.cuisineRegion,
      'cuisineRegion',
      ['iran', 'middle_east', 'international'] as const,
    ),
    schedule,
  }
}

async function loadSettings(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
) {
  const [profile, goal, dietary, schedule] = await Promise.all([
    admin.from('profiles').select(
      'display_name,date_of_birth,sex,height_cm,locale,timezone,unit_system,country_code,pricing_market,health_data_consent_at,health_consent_version,terms_version,privacy_version,payment_method_status,product_region,analytics_consent_at,analytics_consent_version',
    ).eq('user_id', userId).single(),
    admin.from('goals').select('goal_type,custom_goal,start_weight_kg,target_weight_kg').eq(
      'user_id',
      userId,
    ).eq('status', 'active').limit(1).maybeSingle(),
    admin.from('dietary_preferences').select(
      'dietary_pattern,favorite_foods,allergies,available_equipment,work_schedule,cuisine_region',
    ).eq('user_id', userId).maybeSingle(),
    admin.from('training_schedule_items').select(
      'weekday,activity_type,local_start_time,duration_minutes',
    ).eq('user_id', userId).order('weekday'),
  ])
  if (profile.error || goal.error || dietary.error || schedule.error) {
    throw new HttpError(503, 'settings_unavailable', 'Account settings are unavailable.')
  }
  return {
    profile: {
      ...profile.data,
      payment_method_status: profile.data.payment_method_status ?? 'not_collected',
    },
    goal: goal.data,
    dietary: dietary.data,
    schedule: schedule.data ?? [],
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)
  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST') {
      throw new HttpError(405, 'method_not_allowed', 'Only POST is supported.')
    }
    const auth = await authenticate(request)
    const body = await readJsonBody<SettingsBody>(request, 32_768)
    assertAccountSettingsEnrollmentAccess(auth.user.id, body.action)
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      'account-settings',
      integerEnv('ACCOUNT_SETTINGS_RATE_LIMIT', 60, { min: 1, max: 240 }),
      integerEnv('ACCOUNT_SETTINGS_RATE_WINDOW_SECONDS', 3600, { min: 60, max: 86_400 }),
    )

    if (body.action === 'get') {
      return jsonResponse(request, { settings: await loadSettings(auth.admin, auth.user.id) })
    }

    const idempotencyKey = requireIdempotencyKey(request)
    if (body.action === 'update') {
      const settings = parseSettings(body.settings)
      const requestInput = { action: body.action, settings }
      const { data, error } = await auth.admin.rpc('update_account_settings', {
        p_user_id: auth.user.id,
        p_payload: settings,
        p_idempotency_key: idempotencyKey,
        p_request_sha256: await sha256(canonicalJson(requestInput)),
      })
      if (error) {
        if (error.message.includes('idempotency_key_reused')) {
          throw new HttpError(
            409,
            'idempotency_key_reused',
            'Idempotency key was used for different input.',
          )
        }
        throw new HttpError(503, 'settings_update_failed', 'Account settings could not be updated.')
      }
      return jsonResponse(request, { settings: data })
    }

    if (body.action === 'withdraw-health-consent') {
      if (body.confirmation !== 'WITHDRAW') {
        throw new HttpError(
          400,
          'withdrawal_confirmation_required',
          'Explicit confirmation is required.',
        )
      }
      const input = { action: body.action, confirmation: body.confirmation }
      const { data, error } = await auth.admin.rpc('withdraw_health_data_consent', {
        p_user_id: auth.user.id,
        p_idempotency_key: idempotencyKey,
        p_request_sha256: await sha256(canonicalJson(input)),
      })
      if (error) {
        if (error.message.includes('idempotency_key_reused')) {
          throw new HttpError(
            409,
            'idempotency_key_reused',
            'Idempotency key was used for different input.',
          )
        }
        throw new HttpError(
          503,
          'consent_withdrawal_failed',
          'Consent withdrawal could not be completed.',
        )
      }
      return jsonResponse(request, { withdrawal: data })
    }

    if (body.action === 'set-analytics-consent') {
      if (typeof body.enabled !== 'boolean') {
        throw new HttpError(422, 'invalid_analytics_consent', 'Analytics preference is invalid.')
      }
      const input = { action: body.action, enabled: body.enabled }
      const { data, error } = await auth.admin.rpc('set_analytics_consent', {
        p_user_id: auth.user.id,
        p_enabled: body.enabled,
        p_idempotency_key: idempotencyKey,
        p_request_sha256: await sha256(canonicalJson(input)),
      })
      if (error) {
        if (error.message.includes('idempotency_key_reused')) {
          throw new HttpError(
            409,
            'idempotency_key_reused',
            'Idempotency key was used for different input.',
          )
        }
        throw new HttpError(
          503,
          'analytics_consent_update_failed',
          'Analytics preference could not be updated.',
        )
      }
      return jsonResponse(request, { analytics: data })
    }

    throw new HttpError(400, 'unsupported_action', 'Settings action is unsupported.')
  } catch (error) {
    return errorResponse(request, error)
  }
})
