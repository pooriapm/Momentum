import type { SupabaseClient } from '@supabase/supabase-js'
import { optionalEnv } from './config.ts'
import { HttpError } from './http.ts'

// Card-to-card payment for Iranian website members, reviewed by hand: the member
// transfers the IRR price to the card below, uploads the bank receipt, and an admin
// approves (one 30-day period) or rejects it.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RECEIPT_BUCKET = 'payment-receipts'
const REJECTION_REASONS = new Set(['amount_mismatch', 'not_received', 'unreadable', 'duplicate'])

/** Admins are listed by account id in ADMIN_USER_IDS; nobody else can review receipts. */
export function isPaymentAdmin(userId: string): boolean {
  const ids = (optionalEnv('ADMIN_USER_IDS') ?? '').split(',').map((value) => value.trim())
  return UUID_PATTERN.test(userId) && ids.includes(userId)
}

export function assertPaymentAdmin(userId: string): void {
  if (!isPaymentAdmin(userId)) throw new HttpError(403, 'ADMIN_ONLY', 'Admin access is required.')
}

/** The destination card is server configuration so it can change without a release. */
export function cardDestination() {
  const cardNumber = (optionalEnv('PAYMENT_CARD_NUMBER') ?? '').replace(/\D/g, '')
  const cardHolder = optionalEnv('PAYMENT_CARD_HOLDER')?.trim() ?? ''
  if (!/^\d{16}$/.test(cardNumber) || !cardHolder) {
    throw new HttpError(503, 'card_transfer_unavailable', 'Card transfer is not configured.')
  }
  return { cardNumber, cardHolder }
}

function rpcFailure(message: string | undefined) {
  if (message?.includes('card_payment_pending')) {
    return new HttpError(409, 'card_payment_pending', 'A receipt is already waiting for review.')
  }
  if (message?.includes('invalid_receipt')) {
    return new HttpError(422, 'invalid_receipt', 'The receipt upload is invalid.')
  }
  if (message?.includes('payment_not_pending')) {
    return new HttpError(409, 'payment_not_pending', 'This payment was already reviewed.')
  }
  if (message?.includes('invalid_reason')) {
    return new HttpError(422, 'invalid_reason', 'The rejection reason is invalid.')
  }
  if (message?.includes('payment_not_found')) {
    return new HttpError(404, 'payment_not_found', 'The payment was not found.')
  }
  return new HttpError(503, 'card_transfer_failed', 'The card payment could not be saved.')
}

export async function submitCardPayment(
  admin: SupabaseClient,
  userId: string,
  receiptPath: unknown,
) {
  if (typeof receiptPath !== 'string') {
    throw new HttpError(422, 'invalid_receipt', 'The receipt upload is invalid.')
  }
  const { data, error } = await admin.rpc('submit_card_payment', {
    p_user_id: userId,
    p_receipt_path: receiptPath,
  })
  if (error || typeof data !== 'string') throw rpcFailure(error?.message)
  return { payment_id: data, status: 'pending' as const }
}

interface PendingCardRow {
  id: string
  user_id: string
  amount_minor: number
  created_at: string
  receipt_path: string | null
}

/** Pending receipts for the admin page, each with a short-lived signed image URL. */
export async function listPendingCardPayments(admin: SupabaseClient) {
  const { data, error } = await admin
    .from('payments')
    .select('id,user_id,amount_minor,created_at,receipt_path')
    .eq('provider', 'card_transfer')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) throw new HttpError(503, 'card_list_failed', 'Pending receipts could not be loaded.')
  const rows = (data ?? []) as PendingCardRow[]
  const paths = rows.map((row) => row.receipt_path).filter((path): path is string => Boolean(path))
  const signed = paths.length
    ? await admin.storage.from(RECEIPT_BUCKET).createSignedUrls(paths, 600)
    : { data: [], error: null }
  const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]))
  const items = []
  for (const row of rows) {
    const { data: user } = await admin.auth.admin.getUserById(row.user_id)
    items.push({
      payment_id: row.id,
      email: user?.user?.email ?? null,
      amount_minor: row.amount_minor,
      submitted_at: row.created_at,
      receipt_url: row.receipt_path ? urls.get(row.receipt_path) ?? null : null,
    })
  }
  return items
}

export async function reviewCardPayment(
  admin: SupabaseClient,
  paymentId: unknown,
  approve: unknown,
  reviewerId: string,
  reason?: unknown,
) {
  if (
    typeof paymentId !== 'string' || !UUID_PATTERN.test(paymentId) || typeof approve !== 'boolean'
  ) {
    throw new HttpError(422, 'invalid_review', 'The review request is invalid.')
  }
  if (reason != null && (approve || typeof reason !== 'string' || !REJECTION_REASONS.has(reason))) {
    throw new HttpError(422, 'invalid_reason', 'The rejection reason is invalid.')
  }
  const { data, error } = await admin.rpc('review_card_payment', {
    p_payment_id: paymentId,
    p_approve: approve,
    p_reviewer: reviewerId,
    p_reason: reason ?? null,
  })
  if (error) throw rpcFailure(error.message)
  return data as Record<string, unknown>
}
