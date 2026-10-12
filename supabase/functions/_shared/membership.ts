import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.ts'

/** Statuses that keep member features on; grace and pending payment keep access during retries. */
const MEMBER_STATUSES = ['active', 'grace', 'payment_pending'] as const

/** True when the user has a current gift or paid entitlement. */
export async function hasMemberAccess(admin: SupabaseClient, userId: string, now = new Date()) {
  const at = now.toISOString()
  const { data, error } = await admin
    .from('entitlements')
    .select('id')
    .eq('user_id', userId)
    .in('status', MEMBER_STATUSES)
    .lte('period_start', at)
    .gt('period_end', at)
    .limit(1)
  if (error) {
    throw new HttpError(503, 'entitlement_unavailable', 'Membership could not be checked.')
  }
  return (data?.length ?? 0) > 0
}

/** Member-only features (meal swaps, shopping list, trends). Never use this for safety flows. */
export async function assertMemberFeatureAccess(
  admin: SupabaseClient,
  userId: string,
  feature: string,
) {
  if (await hasMemberAccess(admin, userId)) return
  throw new HttpError(
    402,
    'MEMBERSHIP_REQUIRED',
    `${feature} is included with Momentum membership.`,
  )
}
