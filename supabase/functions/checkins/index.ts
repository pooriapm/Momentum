import { authenticate } from '../_shared/auth.ts'
import { parseDailyCheckIn, parseWeeklyCheckIn } from '../_shared/checkin-contract.ts'
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

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

interface CheckInBody {
  action?: unknown
  local_date?: unknown
  week_start?: unknown
  timezone?: unknown
  checkin?: unknown
}

function parseIsoDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    throw new HttpError(400, `invalid_${field}`, `${field} must use YYYY-MM-DD.`)
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `invalid_${field}`, `${field} is invalid.`)
  }
  return value
}

function parseTimezone(value: unknown) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80) {
    throw new HttpError(400, 'invalid_timezone', 'Timezone is invalid.')
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
  } catch {
    throw new HttpError(400, 'invalid_timezone', 'Timezone is invalid.')
  }
  return value
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)

  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST') {
      throw new HttpError(405, 'method_not_allowed', 'Only POST is supported.')
    }
    const auth = await authenticate(request)
    const body = await readJsonBody<CheckInBody>(request, 16_384)
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      'checkins',
      integerEnv('CHECKIN_RATE_LIMIT', 40, { min: 1, max: 240 }),
      integerEnv('CHECKIN_RATE_WINDOW_SECONDS', 3600, { min: 60, max: 86_400 }),
    )
    const idempotencyKey = requireIdempotencyKey(request)
    const timezone = parseTimezone(body.timezone)

    if (body.action === 'save-daily') {
      const localDate = parseIsoDate(body.local_date, 'local_date')
      const payload = parseDailyCheckIn(body.checkin)
      const requestInput = {
        action: body.action,
        local_date: localDate,
        timezone,
        checkin: payload,
      }
      const { data, error } = await auth.admin.rpc('save_daily_checkin', {
        p_user_id: auth.user.id,
        p_local_date: localDate,
        p_timezone: timezone,
        p_payload: payload,
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
        if (error.message.includes('checkin_date_not_current')) {
          throw new HttpError(
            409,
            'local_date_mismatch',
            'Daily check-in is limited to the current profile date.',
          )
        }
        if (error.message.includes('profile_timezone_mismatch')) {
          throw new HttpError(409, 'timezone_mismatch', 'Use the timezone saved in your profile.')
        }
        throw new HttpError(503, 'checkin_save_failed', 'Daily check-in could not be saved.')
      }
      return jsonResponse(request, data)
    }

    if (body.action === 'save-weekly') {
      const weekStart = parseIsoDate(body.week_start, 'week_start')
      const payload = parseWeeklyCheckIn(body.checkin)
      const requestInput = {
        action: body.action,
        week_start: weekStart,
        timezone,
        checkin: payload,
      }
      const { data, error } = await auth.admin.rpc('save_weekly_checkin', {
        p_user_id: auth.user.id,
        p_week_start: weekStart,
        p_timezone: timezone,
        p_payload: payload,
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
        if (error.message.includes('checkin_week_not_current')) {
          throw new HttpError(
            409,
            'week_start_mismatch',
            'Weekly check-in is limited to the current profile week.',
          )
        }
        if (error.message.includes('profile_timezone_mismatch')) {
          throw new HttpError(409, 'timezone_mismatch', 'Use the timezone saved in your profile.')
        }
        throw new HttpError(503, 'checkin_save_failed', 'Weekly check-in could not be saved.')
      }
      return jsonResponse(request, data)
    }

    throw new HttpError(400, 'unsupported_action', 'Check-in action is unsupported.')
  } catch (error) {
    return errorResponse(request, error)
  }
})
