import { z } from 'zod'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'

// Admin panel API. Every call goes to the payments Edge Function, which answers only
// for accounts listed in ADMIN_USER_IDS and audits every change.

async function invokeAdmin<T>(body: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  assertOnline()
  const { data, error } = await requireSupabase().functions.invoke('payments', { body })
  if (error) throw error
  return schema.parse(data)
}

/** HTTP status of a failed admin call, so pages can tell "not an admin" from "offline". */
export function adminErrorStatus(error: unknown): number | undefined {
  return (error as { context?: { status?: number } })?.context?.status
}

export async function loadIsAdmin() {
  const { admin } = await invokeAdmin({ action: 'admin-whoami' }, z.object({ admin: z.boolean() }))
  return admin
}

const overviewSchema = z.object({
  pending_receipts: z.number(),
  paying_members: z.number(),
  gift_members: z.number(),
  ending_within_5_days: z.number(),
  paid_last_30_days: z.number(),
  revenue_last_30_days_irr: z.number(),
  accounts: z.number(),
  waitlist: z.number(),
})
export type AdminOverview = z.infer<typeof overviewSchema>

export async function loadAdminOverview() {
  const { overview } = await invokeAdmin({ action: 'admin-overview' }, z.object({ overview: overviewSchema }))
  return overview
}

const pendingReceiptSchema = z.object({
  payment_id: z.string().uuid(),
  email: z.string().nullable(),
  amount_minor: z.number(),
  submitted_at: z.string(),
  receipt_url: z.string().url().nullable(),
})
export type PendingReceipt = z.infer<typeof pendingReceiptSchema>

export async function loadPendingReceipts() {
  const { items } = await invokeAdmin({ action: 'admin-card-list' }, z.object({ items: z.array(pendingReceiptSchema) }))
  return items
}

export const REJECTION_REASONS = ['amount_mismatch', 'not_received', 'unreadable', 'duplicate'] as const
export type RejectionReason = typeof REJECTION_REASONS[number]

export function reviewReceipt(paymentId: string, approve: boolean, reason?: RejectionReason) {
  return invokeAdmin(
    { action: 'admin-card-review', paymentId, approve, ...(approve ? {} : { reason }) },
    z.record(z.string(), z.unknown()),
  )
}

const historySchema = z.object({
  payment_id: z.string().uuid(),
  email: z.string().nullable(),
  amount_minor: z.number(),
  status: z.enum(['paid', 'failed']),
  failure_code: z.string().nullable(),
  submitted_at: z.string(),
  reviewed_at: z.string().nullable(),
  reviewer_email: z.string().nullable(),
})
export type ReviewedReceipt = z.infer<typeof historySchema>

export async function loadReviewHistory() {
  const { items } = await invokeAdmin({ action: 'admin-card-history' }, z.object({ items: z.array(historySchema) }))
  return items
}

const memberRowSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  created_at: z.string(),
  country_code: z.string().nullable(),
  product_region: z.string().nullable(),
})
export type MemberRow = z.infer<typeof memberRowSchema>

export async function searchMembers(query: string) {
  const { members } = await invokeAdmin({ action: 'admin-member-search', query }, z.object({ members: z.array(memberRowSchema) }))
  return members
}

const memberDetailSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  country_code: z.string().nullable(),
  product_region: z.string().nullable(),
  onboarding_status: z.string().nullable(),
  membership_interest_at: z.string().nullable(),
  entitlements: z.array(z.object({
    id: z.string().uuid(),
    source: z.string(),
    status: z.string(),
    period_start: z.string(),
    period_end: z.string(),
  })),
  payments: z.array(z.object({
    id: z.string().uuid(),
    provider: z.string(),
    status: z.string(),
    amount_minor: z.number(),
    currency: z.string(),
    failure_code: z.string().nullable(),
    created_at: z.string(),
    paid_at: z.string().nullable(),
  })),
})
export type MemberDetail = z.infer<typeof memberDetailSchema>

export async function loadMember(userId: string) {
  const { member } = await invokeAdmin({ action: 'admin-member', userId }, z.object({ member: memberDetailSchema }))
  return member
}

export function grantDays(userId: string, days: number, note: string) {
  return invokeAdmin(
    { action: 'admin-grant-days', userId, days, note },
    z.object({ entitlement_id: z.string().uuid(), period_start: z.string(), period_end: z.string() }),
  )
}

const waitlistSchema = z.object({
  email: z.string().nullable(),
  country_code: z.string().nullable(),
  registered_at: z.string(),
})
export type WaitlistEntry = z.infer<typeof waitlistSchema>

export async function loadWaitlist() {
  const { items } = await invokeAdmin({ action: 'admin-waitlist' }, z.object({ items: z.array(waitlistSchema) }))
  return items
}
