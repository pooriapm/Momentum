import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import {
  dailyCheckInInputSchema,
  dailyCheckInResponseSchema,
  weeklyCheckInInputSchema,
  weeklyCheckInResponseSchema,
  type DailyCheckInInput,
  type WeeklyCheckInInput,
} from './contracts'

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function currentWeekStart(date = new Date()) {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  const weekday = result.getDay()
  result.setDate(result.getDate() - (weekday === 0 ? 6 : weekday - 1))
  return localIsoDate(result)
}

export async function saveDailyCheckIn(
  input: DailyCheckInInput,
  localDate: string,
  timezone: string,
  idempotencyKey = crypto.randomUUID(),
) {
  assertOnline()
  const payload = dailyCheckInInputSchema.parse(input)
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('checkins', {
    body: {
      action: 'save-daily',
      local_date: localDate,
      timezone,
      checkin: payload,
    },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return dailyCheckInResponseSchema.parse(data)
}

export async function saveWeeklyCheckIn(
  input: WeeklyCheckInInput,
  weekStart: string,
  timezone: string,
  idempotencyKey = crypto.randomUUID(),
) {
  assertOnline()
  const payload = weeklyCheckInInputSchema.parse(input)
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('checkins', {
    body: {
      action: 'save-weekly',
      week_start: weekStart,
      timezone,
      checkin: payload,
    },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return weeklyCheckInResponseSchema.parse(data)
}

export type { DailyCheckInInput, WeeklyCheckInInput }
