import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import {
  accountSettingsResponseSchema,
  accountSettingsUpdateResponseSchema,
  accountSettingsUpdateSchema,
  consentWithdrawalResponseSchema,
  type AccountSettingsUpdate,
} from './contracts'

export async function loadAccountSettings() {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-settings', {
    body: { action: 'get' },
  })
  if (error) throw error
  return accountSettingsResponseSchema.parse(data).settings
}

export async function updateAccountSettings(
  input: AccountSettingsUpdate,
  idempotencyKey = crypto.randomUUID(),
) {
  assertOnline()
  const settings = accountSettingsUpdateSchema.parse(input)
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-settings', {
    body: { action: 'update', settings },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return accountSettingsUpdateResponseSchema.parse(data).settings
}

export async function withdrawHealthConsent(idempotencyKey = crypto.randomUUID()) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-settings', {
    body: { action: 'withdraw-health-consent', confirmation: 'WITHDRAW' },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return consentWithdrawalResponseSchema.parse(data).withdrawal
}
