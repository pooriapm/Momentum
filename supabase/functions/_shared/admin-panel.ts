import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.ts'

// Admin panel reads and the one manual membership change (granting days). The caller
// checks ADMIN_USER_IDS first; the database functions are service_role only and audit
// every change with the admin's id.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function failure(message: string | undefined, fallback: string) {
  if (message?.includes('invalid_query')) {
    return new HttpError(422, 'invalid_query', 'Search with at least three characters.')
  }
  if (message?.includes('invalid_days')) {
    return new HttpError(422, 'invalid_days', 'Grant between 1 and 90 days.')
  }
  if (message?.includes('invalid_note')) {
    return new HttpError(422, 'invalid_note', 'Write a short note (3–200 characters).')
  }
  if (message?.includes('member_not_found')) {
    return new HttpError(404, 'member_not_found', 'The member was not found.')
  }
  return new HttpError(503, 'admin_unavailable', fallback)
}

export async function adminOverview(admin: SupabaseClient) {
  const { data, error } = await admin.rpc('admin_overview')
  if (error || !data) throw failure(error?.message, 'The overview could not be loaded.')
  return data as Record<string, number>
}

export async function adminCardHistory(admin: SupabaseClient) {
  const { data, error } = await admin.rpc('admin_card_history', { p_limit: 50 })
  if (error) throw failure(error.message, 'The review history could not be loaded.')
  return data ?? []
}

export async function adminFindMembers(admin: SupabaseClient, query: unknown) {
  if (typeof query !== 'string' || query.trim().length < 3 || query.length > 254) {
    throw new HttpError(422, 'invalid_query', 'Search with at least three characters.')
  }
  const { data, error } = await admin.rpc('admin_find_members', { p_query: query })
  if (error) throw failure(error.message, 'The search failed.')
  return data ?? []
}

function memberId(value: unknown) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new HttpError(422, 'invalid_member', 'The member id is invalid.')
  }
  return value
}

export async function adminMemberDetail(admin: SupabaseClient, userId: unknown) {
  const { data, error } = await admin.rpc('admin_member_detail', { p_user_id: memberId(userId) })
  if (error) throw failure(error.message, 'The member could not be loaded.')
  if (!data) throw new HttpError(404, 'member_not_found', 'The member was not found.')
  return data as Record<string, unknown>
}

export async function adminGrantDays(
  admin: SupabaseClient,
  userId: unknown,
  days: unknown,
  note: unknown,
  adminId: string,
) {
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 90) {
    throw new HttpError(422, 'invalid_days', 'Grant between 1 and 90 days.')
  }
  if (typeof note !== 'string' || note.trim().length < 3 || note.trim().length > 200) {
    throw new HttpError(422, 'invalid_note', 'Write a short note (3–200 characters).')
  }
  const { data, error } = await admin.rpc('admin_grant_days', {
    p_user_id: memberId(userId),
    p_days: days,
    p_admin: adminId,
    p_note: note.trim(),
  })
  if (error || !data) throw failure(error?.message, 'The days could not be granted.')
  return data as Record<string, unknown>
}

export async function adminWaitlist(admin: SupabaseClient) {
  const { data, error } = await admin.rpc('admin_membership_waitlist')
  if (error) throw failure(error.message, 'The waitlist could not be loaded.')
  return data ?? []
}
