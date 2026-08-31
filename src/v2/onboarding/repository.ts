import { requireSupabase } from '../../platform/data/supabase'
import type { AppLocale } from '../../platform/i18n/catalog'
import { assertOnline } from '../../platform/pwa/network'
import {
  bodyCompositionConfirmationSchema,
  generationResponseSchema,
  onboardingCompletionSchema,
  starterPlanResponseSchema,
} from '../data/contracts'
import type { OnboardingStepKey } from './schema'

const MAX_BODY_REPORT_BYTES = 10 * 1024 * 1024

function isOwnedBodyReportPath(userId: string, path: string) {
  const parts = path.split('/')
  return parts.length === 2 && parts[0] === userId && parts[1].length > 0
}

export async function loadOnboardingDraft(userId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('onboarding_drafts')
    .select('current_step,payload')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    throw error
  }
  return {
    currentStep: (data?.current_step ?? 'basics') as OnboardingStepKey,
    values: (data?.payload ?? {}) as Record<string, string>,
  }
}

export async function saveOnboardingDraft(userId: string, currentStep: OnboardingStepKey, values: Record<string, string>) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client.from('onboarding_drafts').upsert(
    { user_id: userId, current_step: currentStep, payload: values },
    { onConflict: 'user_id' },
  )
  if (error) {
    throw error
  }
}

async function privacySafeBodyReport(file: File): Promise<File> {
  if (file.type === 'application/pdf') {
    if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('report_signature_mismatch')
    return new File([await file.arrayBuffer()], 'body-report.pdf', { type: 'application/pdf' })
  }

  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('report_dimensions_invalid')
    }
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('report_sanitization_unavailable')
    context.drawImage(bitmap, 0, 0)
    const outputType = file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error('report_sanitization_failed')),
        outputType,
        outputType === 'image/png' ? undefined : 0.92,
      )
    })
    const extension = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `body-report.${extension}`, { type: outputType })
  } finally {
    bitmap.close()
  }
}

export async function deleteOnboardingDraft(userId: string) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client.from('onboarding_drafts').delete().eq('user_id', userId)
  if (error) throw error
}

export async function uploadBodyReport(userId: string, file: File, measuredAt?: string) {
  assertOnline()
  if (file.size > MAX_BODY_REPORT_BYTES) throw new Error('report_too_large')
  const client = requireSupabase()
  const sanitizedFile = await privacySafeBodyReport(file)
  const extension = sanitizedFile.type === 'application/pdf'
    ? 'pdf'
    : sanitizedFile.type === 'image/png'
      ? 'png'
      : sanitizedFile.type === 'image/webp'
        ? 'webp'
        : 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client.storage.from('body-composition').upload(path, sanitizedFile, {
    cacheControl: 'private, max-age=0',
    contentType: sanitizedFile.type,
    upsert: false,
  })
  if (uploadError) {
    throw uploadError
  }
  const { data: measurement, error: recordError } = await client
    .from('body_composition_measurements')
    .insert({
      user_id: userId,
      report_object_path: path,
      source_type: sanitizedFile.type === 'application/pdf' ? 'pdf' : 'image',
      extraction_status: 'pending',
      measured_at: measuredAt ? `${measuredAt}T12:00:00.000Z` : new Date().toISOString(),
    })
    .select('id')
    .single()
  if (recordError) {
    const { error: cleanupError } = await client.storage.from('body-composition').remove([path])
    if (cleanupError) throw cleanupError
    throw recordError
  }
  return { id: measurement.id, path }
}

export async function discardBodyReport(userId: string, measurementId: string, path: string) {
  assertOnline()
  if (!isOwnedBodyReportPath(userId, path)) throw new Error('body_report_path_not_owned')
  const client = requireSupabase()
  const { error: storageError } = await client.storage.from('body-composition').remove([path])
  if (storageError) throw storageError
  const { data, error: recordError } = await client
    .from('body_composition_measurements')
    .delete()
    .eq('id', measurementId)
    .eq('user_id', userId)
    .select('id')
  if (recordError) throw recordError
  if (!Array.isArray(data) || data.length !== 1) throw new Error('body_report_delete_not_confirmed')
}

export async function completeOnboarding(idempotencyKey: string = crypto.randomUUID()) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'complete-onboarding' },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return onboardingCompletionSchema.parse(data).onboarding
}

export async function requestPlanGeneration(locale: AppLocale, idempotencyKey: string = crypto.randomUUID()) {
  assertOnline()
  const client = requireSupabase()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await client.functions.invoke('generate-monthly-plan', {
      body: { locale: locale === 'fa' ? 'fa-IR' : 'en-US' },
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    if (error) throw error
    const parsed = generationResponseSchema.parse(data)
    if (parsed.job.status !== 'in_progress') return parsed
    await new Promise((resolve) => window.setTimeout(resolve, 1_200))
  }
  throw new Error('plan_generation_still_processing')
}

export async function createStarterPlan(idempotencyKey: string = crypto.randomUUID()) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'create-starter-plan' },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return starterPlanResponseSchema.parse(data).starter_plan
}

export async function confirmBodyComposition(measurementId: string, idempotencyKey: string) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'confirm-body-composition', measurement_id: measurementId },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  if (error) throw error
  return bodyCompositionConfirmationSchema.parse(data).body_composition
}

export async function updateBodyCompositionValues(
  measurementId: string,
  values: Record<string, number | null>,
) {
  assertOnline()
  const client = requireSupabase()
  const { error } = await client
    .from('body_composition_measurements')
    .update(values)
    .eq('id', measurementId)
  if (error) throw error
}
