import { z } from 'zod'
import type { AppLocale } from '../../platform/i18n/catalog'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'

const checkoutSchema = z.object({ url: z.string().url().startsWith('https://') })

/**
 * Starts a Zarinpal checkout for one 30-day membership and leaves the site for the gateway.
 * The locale makes the gateway return to the same language the buyer paid from.
 */
export async function startZarinpalCheckout(
  locale: AppLocale,
  navigate: (url: string) => void = (url) => window.location.assign(url),
) {
  assertOnline()
  const { data, error } = await requireSupabase().functions.invoke('payments', {
    body: { action: 'zarinpal-start', locale },
  })
  if (error) throw error
  navigate(checkoutSchema.parse(data).url)
}

export type PaymentResult = 'success' | 'failed' | 'cancelled'

/** The payments function sends the browser back to /{locale}/app/me?payment=… after the gateway. */
export function paymentResultFromSearch(search: string): PaymentResult | null {
  const value = new URLSearchParams(search).get('payment')
  return value === 'success' || value === 'failed' || value === 'cancelled' ? value : null
}
