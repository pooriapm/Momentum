import { z } from 'zod'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'

const common = {
  locale: z.enum(['fa', 'en']),
  product_region: z.enum(['ir', 'intl']).nullable(),
  plan_source: z.enum(['external', 'momentum']).nullable(),
  schema_version: z.literal('1.0.0'),
}

export const productEventSchema = z.discriminatedUnion('event_name', [
  z.object({ ...common, event_name: z.literal('onboarding_completed'), surface: z.literal('onboarding'), action_kind: z.null(), outcome: z.literal('completed') }).strict(),
  z.object({ ...common, event_name: z.literal('plan_activated'), surface: z.literal('onboarding'), action_kind: z.literal('plan'), outcome: z.literal('activated') }).strict(),
  z.object({ ...common, event_name: z.literal('plan_viewed'), surface: z.enum(['today', 'plan']), action_kind: z.literal('plan'), outcome: z.literal('viewed') }).strict(),
  z.object({ ...common, event_name: z.literal('meaningful_action_completed'), surface: z.enum(['today', 'plan']), action_kind: z.enum(['meal', 'workout']), outcome: z.literal('completed') }).strict(),
  z.object({ ...common, event_name: z.literal('daily_checkin_completed'), surface: z.literal('today'), action_kind: z.literal('daily_checkin'), outcome: z.literal('completed') }).strict(),
  z.object({ ...common, event_name: z.literal('weekly_checkin_completed'), surface: z.literal('progress'), action_kind: z.literal('weekly_checkin'), outcome: z.literal('completed') }).strict(),
])

export type ProductEvent = z.infer<typeof productEventSchema>

export function sanitizeProductEvent(value: unknown): ProductEvent {
  return productEventSchema.parse(value)
}

export async function recordProductEvent(value: unknown, eventId = crypto.randomUUID()) {
  assertOnline()
  const event = sanitizeProductEvent(value)
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'record-product-event', event_id: eventId, event },
    headers: { 'Idempotency-Key': eventId },
  })
  if (error) throw error
  if (data?.analytics?.accepted !== true) throw new Error('product_event_failed')
}

export function trackProductEvent(value: ProductEvent) {
  void recordProductEvent(value).catch(() => undefined)
}

export function eventContext(
  locale: 'fa' | 'en',
  productRegion?: 'ir' | 'intl',
  planSource?: 'external' | 'momentum',
) {
  return {
    locale,
    product_region: productRegion ?? null,
    plan_source: planSource ?? null,
    schema_version: '1.0.0' as const,
  }
}
