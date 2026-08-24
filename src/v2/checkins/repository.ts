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

function datePartsInTimezone(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

export function currentWeekStart(timezone: string, date = new Date()) {
  const local = datePartsInTimezone(timezone, date)
  const result = new Date(Date.UTC(local.year, local.month - 1, local.day, 12))
  const weekday = result.getUTCDay()
  result.setUTCDate(result.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  return result.toISOString().slice(0, 10)
}

export async function saveDailyCheckIn(
  input: DailyCheckInInput,
  localDate: string,
  timezone: string,
  idempotencyKey: string = crypto.randomUUID(),
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
  idempotencyKey: string = crypto.randomUUID(),
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
