import { z } from 'zod'
import type { AppLocale } from '../../platform/i18n/catalog'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'

const checkoutSchema = z.object({ url: z.string().url().startsWith('https://') })

async function invokePayments<T>(body: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  assertOnline()
  const { data, error } = await requireSupabase().functions.invoke('payments', { body })
  if (error) throw error
  return schema.parse(data)
}

/**
 * Starts a Zarinpal checkout for one 30-day membership and leaves the site for the gateway.
 * The locale makes the gateway return to the same language the buyer paid from.
 */
export async function startZarinpalCheckout(
  locale: AppLocale,
  navigate: (url: string) => void = (url) => window.location.assign(url),
) {
  const { url } = await invokePayments({ action: 'zarinpal-start', locale }, checkoutSchema)
  navigate(url)
}

export type PaymentResult = 'success' | 'failed' | 'cancelled'

/** The payments function sends the browser back to /{locale}/app/me?payment=… after the gateway. */
export function paymentResultFromSearch(search: string): PaymentResult | null {
  const value = new URLSearchParams(search).get('payment')
  return value === 'success' || value === 'failed' || value === 'cancelled' ? value : null
}

// Card-to-card (Iranian website members): transfer, upload the receipt, wait for review.

const cardDetailsSchema = z.object({
  card_number: z.string().regex(/^\d{16}$/),
  card_holder: z.string().min(1),
  amount_minor: z.number().int().positive(),
  currency: z.literal('IRR'),
})
export type CardDetails = z.infer<typeof cardDetailsSchema>

export function loadCardDetails() {
  return invokePayments({ action: 'card-details' }, cardDetailsSchema)
}

const RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024

/** Redraws the receipt so camera metadata (location, device) never leaves the browser. */
async function privacySafeReceipt(file: File): Promise<File> {
  if (!RECEIPT_TYPES.has(file.type)) throw new Error('receipt_type_unsupported')
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('receipt_dimensions_invalid')
    }
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('receipt_sanitization_unavailable')
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('receipt_sanitization_failed')), 'image/jpeg', 0.9)
    })
    if (blob.size > RECEIPT_MAX_BYTES) throw new Error('receipt_too_large')
    return new File([blob], 'receipt.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

/** Uploads a receipt into the member's private folder and returns its storage path. */
export async function uploadReceipt(userId: string, file: File): Promise<string> {
  assertOnline()
  const safe = await privacySafeReceipt(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await requireSupabase().storage.from('payment-receipts').upload(path, safe, {
    cacheControl: 'private, max-age=0',
    contentType: safe.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function discardReceipt(path: string) {
  await requireSupabase().storage.from('payment-receipts').remove([path])
}

export function submitCardPayment(receiptPath: string) {
  return invokePayments(
    { action: 'card-submit', receiptPath },
    z.object({ payment_id: z.string().uuid(), status: z.literal('pending') }),
  )
}

const latestPaymentSchema = z.object({
  provider: z.string(),
  status: z.enum(['pending', 'paid', 'failed']),
  failure_code: z.string().nullable(),
  created_at: z.string(),
}).nullable()
export type LatestPayment = z.infer<typeof latestPaymentSchema>

/** The member's most recent card-to-card payment (RLS limits rows to their own). */
export async function loadLatestCardPayment(userId: string): Promise<LatestPayment> {
  const { data, error } = await requireSupabase()
    .from('payments')
    .select('provider,status,failure_code,created_at')
    .eq('user_id', userId)
    .eq('provider', 'card_transfer')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return latestPaymentSchema.parse(data)
}

/** Members outside Iran ask to hear when membership opens for them. */
export function registerMembershipInterest() {
  return invokePayments({ action: 'membership-interest' }, z.object({ registered: z.literal(true) }))
}
