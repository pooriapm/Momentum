import type { z } from 'zod'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import {
  externalPlanContextResponseSchema,
  externalPlanImportResponseSchema,
} from '../data/contracts'

export type ExternalPlanContext = z.infer<typeof externalPlanContextResponseSchema>['external_plan_context']

export async function loadExternalPlanContext(): Promise<ExternalPlanContext> {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'external-plan-context' },
  })
  if (error) throw error
  return externalPlanContextResponseSchema.parse(data).external_plan_context
}

export async function importExternalPlan(
  plan: Record<string, unknown>,
  sourceKind: 'external_ai' | 'existing_plan',
) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('account-data', {
    body: { action: 'import-external-plan', plan, source_kind: sourceKind },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  })
  if (error) throw error
  return externalPlanImportResponseSchema.parse(data).external_plan_import
}

/** Built only in the browser. Momentum never sends this prompt to an external provider. */
export function buildExternalPlanPrompt(context: ExternalPlanContext): string {
  const locale = context.profile.locale === 'fa-IR' ? 'fa-IR' : 'en-US'
  const safety = {
    declared_allergen_ids: context.declared_allergen_ids,
    health: context.health,
  }
  const person = {
    profile: context.profile,
    goal: context.goal,
    dietary: context.dietary,
    training: context.training,
  }
  return [
    'Create one safe combined nutrition and workout plan for import into Momentum.',
    `Return exactly one raw JSON object. Do not use Markdown or explanatory text. Locale: ${locale}. Days: ${context.requested_days}.`,
    `The JSON must match schema version ${context.schema_version} and the JSON Schema below exactly.`,
    'Use only catalog IDs and immutable catalog facts supplied below. Never invent or alter a food, ingredient, exercise, equipment, nutrition value, allergen mapping, or substitution.',
    'Exclude every declared allergen. Keep calories at or above 1200. Do not diagnose, treat, or claim medical clearance.',
    'Make the plan practical for the person’s schedule, goal, food preferences, equipment, and training experience.',
    `PERSON_CONTEXT=${JSON.stringify(person)}`,
    `SAFETY_CONTEXT=${JSON.stringify(safety)}`,
    `GOVERNED_CATALOG=${JSON.stringify(context.catalog)}`,
    `OUTPUT_JSON_SCHEMA=${JSON.stringify(context.output_schema)}`,
  ].join('\n\n')
}
