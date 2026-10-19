import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authenticate } from '../_shared/auth.ts'
import { validateBazaarPurchase } from '../_shared/bazaar.ts'
import { integerEnv, optionalEnv, requiredEnv } from '../_shared/config.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
} from '../_shared/http.ts'
import { enforceRateLimit } from '../_shared/limits.ts'
import { requestZarinpalPayment, verifyZarinpalPayment } from '../_shared/zarinpal.ts'

// One prepaid 30-day membership, sold in IRR:
//   POST {action: 'zarinpal-start', locale: 'fa'|'en'}   website checkout → { url }
//   GET  ?provider=zarinpal&locale=..&Authority=..&Status=OK|NOK  Zarinpal return → /{locale}/app/me
//   POST {action: 'bazaar-verify', productId, purchaseToken}  Android purchase → { period_end }
// Membership is granted only after the gateway or store confirms the payment.

interface PaymentsBody {
  action?: unknown
  locale?: unknown
  productId?: unknown
  purchaseToken?: unknown
}

interface PaymentRow {
  id: string
  user_id: string
  status: 'pending' | 'paid' | 'failed'
  amount_minor: number
}

function assertPaymentsEnabled() {
  if (optionalEnv('PAYMENTS_MASTER_ENABLED')?.toLowerCase() !== 'true') {
    throw new HttpError(503, 'PAYMENTS_DISABLED', 'Payments are unavailable.')
  }
}

function serviceClient(): SupabaseClient {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

async function membershipPrice(admin: SupabaseClient) {
  const { data, error } = await admin
    .from('product_prices')
    .select('id,amount_minor')
    .eq('product_code', 'membership')
    .eq('market', 'ir')
    .eq('currency', 'IRR')
    .eq('billing_interval', 'month')
    .eq('active', true)
    .maybeSingle()
  if (error || !data) {
    throw new HttpError(503, 'pricing_unavailable', 'Membership price is unavailable.')
  }
  return data as { id: string; amount_minor: number }
}

async function grant(admin: SupabaseClient, paymentId: string, receipt: string) {
  const { data, error } = await admin.rpc('grant_paid_month', {
    p_payment_id: paymentId,
    p_provider_receipt: receipt,
  })
  if (error) throw new HttpError(503, 'grant_failed', 'Membership could not be activated.')
  return data as { period_end: string; already_granted: boolean }
}

async function markFailed(admin: SupabaseClient, paymentId: string, code: string) {
  await admin.from('payments').update({ status: 'failed', failure_code: code })
    .eq('id', paymentId).eq('status', 'pending')
}

type SiteLocale = 'fa' | 'en'

/** The website is bilingual; the buyer returns to the language they paid from. */
function siteLocale(value: unknown): SiteLocale {
  return value === 'en' ? 'en' : 'fa'
}

function siteRedirect(result: 'success' | 'failed' | 'cancelled', locale: SiteLocale): Response {
  const site = requiredEnv('PUBLIC_SITE_URL').replace(/\/$/, '')
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${site}/${locale}/app/me?payment=${result}`,
      'Cache-Control': 'no-store',
    },
  })
}

async function zarinpalCallback(url: URL, locale: SiteLocale): Promise<Response> {
  const authority = url.searchParams.get('Authority')?.trim() ?? ''
  const status = url.searchParams.get('Status')
  if (!/^[A-Za-z0-9]{8,128}$/.test(authority)) return siteRedirect('failed', locale)

  const admin = serviceClient()
  const { data } = await admin.from('payments')
    .select('id,user_id,status,amount_minor')
    .eq('provider', 'zarinpal')
    .eq('provider_reference', authority)
    .maybeSingle()
  const payment = data as PaymentRow | null
  if (!payment) return siteRedirect('failed', locale)
  if (payment.status === 'paid') return siteRedirect('success', locale)
  if (payment.status === 'failed') return siteRedirect('failed', locale)

  if (status !== 'OK') {
    await markFailed(admin, payment.id, 'cancelled_by_user')
    return siteRedirect('cancelled', locale)
  }

  const verification = await verifyZarinpalPayment(authority, payment.amount_minor)
  if (!verification.ok) {
    await markFailed(
      admin,
      payment.id,
      `zarinpal_${verification.code ?? 'unknown'}`.replace('-', 'm'),
    )
    return siteRedirect('failed', locale)
  }
  await grant(admin, payment.id, verification.refId)
  return siteRedirect('success', locale)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)
  const url = new URL(request.url)

  // The gateway return is a top-level browser navigation, not an API call.
  if (request.method === 'GET' && url.searchParams.get('provider') === 'zarinpal') {
    const locale = siteLocale(url.searchParams.get('locale'))
    try {
      return await zarinpalCallback(url, locale)
    } catch {
      return siteRedirect('failed', locale)
    }
  }

  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST') {
      throw new HttpError(405, 'method_not_allowed', 'Only POST is supported.')
    }
    assertPaymentsEnabled()
    const auth = await authenticate(request)
    const body = await readJsonBody<PaymentsBody>(request, 4_096)
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      'payments',
      integerEnv('PAYMENTS_RATE_LIMIT', 20, { min: 1, max: 120 }),
      integerEnv('PAYMENTS_RATE_WINDOW_SECONDS', 3600, { min: 60, max: 86_400 }),
    )
    const price = await membershipPrice(auth.admin)

    if (body.action === 'zarinpal-start') {
      const checkout = await requestZarinpalPayment({
        amountIrr: price.amount_minor,
        callbackUrl: `${
          requiredEnv('SUPABASE_URL').replace(/\/$/, '')
        }/functions/v1/payments?provider=zarinpal&locale=${siteLocale(body.locale)}`,
        description: 'Momentum membership · عضویت یک‌ماهه Momentum',
        email: auth.user.email ?? undefined,
      })
      const { error } = await auth.admin.from('payments').insert({
        user_id: auth.user.id,
        provider: 'zarinpal',
        product_price_id: price.id,
        amount_minor: price.amount_minor,
        currency: 'IRR',
        provider_reference: checkout.authority,
      })
      if (error) {
        throw new HttpError(503, 'payment_not_recorded', 'The payment could not be started.')
      }
      return jsonResponse(request, { url: checkout.redirectUrl })
    }

    if (body.action === 'bazaar-verify') {
      const productId = typeof body.productId === 'string' ? body.productId : ''
      const purchaseToken = typeof body.purchaseToken === 'string' ? body.purchaseToken.trim() : ''
      if (
        productId !== requiredEnv('BAZAAR_PRODUCT_ID') ||
        !/^[A-Za-z0-9._:-]{8,512}$/.test(purchaseToken)
      ) {
        throw new HttpError(422, 'invalid_purchase', 'The purchase is invalid.')
      }

      const { data: existing } = await auth.admin.from('payments')
        .select('id,user_id,status,amount_minor')
        .eq('provider', 'bazaar')
        .eq('provider_reference', purchaseToken)
        .maybeSingle()
      const known = existing as PaymentRow | null
      if (known && known.user_id !== auth.user.id) {
        throw new HttpError(
          409,
          'purchase_owned_elsewhere',
          'This purchase belongs to another account.',
        )
      }
      // Idempotent retry (e.g. the app lost the response before consuming). This must
      // run before validation: once consumed, Bazaar reports the token as consumed and
      // validation rejects it as a replay (purchase_already_consumed).
      if (known?.status === 'paid') {
        return jsonResponse(request, await grant(auth.admin, known.id, ''))
      }

      const validation = await validateBazaarPurchase(productId, purchaseToken)
      if (!validation.ok) {
        throw new HttpError(
          402,
          `purchase_${validation.reason}`,
          'The purchase was not confirmed by Cafe Bazaar.',
        )
      }
      // The app always sets the developer payload to the account id, so a token bought
      // while signed in to one account cannot activate another. A missing payload is
      // rejected too: otherwise a leaked token could be claimed by whoever sends it first.
      if (validation.developerPayload !== auth.user.id) {
        throw new HttpError(
          409,
          'purchase_owned_elsewhere',
          'This purchase belongs to another account.',
        )
      }

      let paymentId = known?.id
      if (!paymentId) {
        const { data: inserted, error } = await auth.admin.from('payments').insert({
          user_id: auth.user.id,
          provider: 'bazaar',
          product_price_id: price.id,
          amount_minor: price.amount_minor,
          currency: 'IRR',
          provider_reference: purchaseToken,
        }).select('id').single()
        if (error || !inserted) {
          throw new HttpError(503, 'payment_not_recorded', 'The purchase could not be recorded.')
        }
        paymentId = (inserted as { id: string }).id
      }
      return jsonResponse(request, await grant(auth.admin, paymentId, validation.orderReference))
    }

    throw new HttpError(400, 'unsupported_action', 'Payment action is unsupported.')
  } catch (error) {
    return errorResponse(request, error)
  }
})
