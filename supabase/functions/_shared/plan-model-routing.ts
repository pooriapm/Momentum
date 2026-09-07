import { enumEnv, optionalEnv } from './config.ts'

export type PlanModelRoute = 'terra' | 'luna' | 'sol'
export type ServiceTierRoute = 'standard' | 'batch' | 'flex'

export const MODEL_ROUTING_VERSION = 'momentum-model-routing/1.0.0'

const DEFAULT_MODEL_IDS: Record<PlanModelRoute, string> = {
  terra: 'gpt-5.6-terra',
  luna: 'gpt-5.6-luna',
  sol: 'gpt-5.6-sol',
}

/**
 * Terra remains the production default unless OPENAI_PLAN_MODEL is set
 * or an explicit eval cohort routes to Luna behind a feature flag.
 */
export function resolvePlanModelRoute(input: {
  cycleIndex: number
  isRenewal: boolean
  evalCohort?: string | null
}): {
  route: PlanModelRoute
  modelId: string
  serviceTier: ServiceTierRoute
  routingVersion: typeof MODEL_ROUTING_VERSION
  reason: string
} {
  const configured = optionalEnv('OPENAI_PLAN_MODEL')
  const defaultRoute = (optionalEnv('AI_PLAN_DEFAULT_ROUTE')?.toLowerCase() ??
    'terra') as PlanModelRoute
  const safeDefault: PlanModelRoute =
    defaultRoute === 'luna' || defaultRoute === 'sol' || defaultRoute === 'terra'
      ? defaultRoute
      : 'terra'

  const lunaEvalEnabled = optionalEnv('AI_PLAN_LUNA_EVAL_ENABLED')?.toLowerCase() === 'true'
  const lunaCohorts = (optionalEnv('AI_PLAN_LUNA_EVAL_COHORTS') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  let route: PlanModelRoute = safeDefault
  let reason = `Default route ${safeDefault}.`

  if (lunaEvalEnabled && input.evalCohort && lunaCohorts.includes(input.evalCohort)) {
    route = 'luna'
    reason = `Luna eval cohort ${input.evalCohort}.`
  }

  // Configured OPENAI_PLAN_MODEL always wins for ops control; do not auto-switch.
  const modelId = configured && configured.trim()
    ? configured.trim()
    : DEFAULT_MODEL_IDS[route]

  if (configured) {
    reason = `Explicit OPENAI_PLAN_MODEL=${configured}.`
    if (configured.includes('luna')) route = 'luna'
    else if (configured.includes('sol')) route = 'sol'
    else route = 'terra'
  }

  const asyncTier = resolveAsyncServiceTier(input.isRenewal)
  return {
    route,
    modelId,
    serviceTier: asyncTier,
    routingVersion: MODEL_ROUTING_VERSION,
    reason,
  }
}

/**
 * Batch/Flex only for renewals when explicitly enabled. First-plan stays standard.
 */
export function resolveAsyncServiceTier(isRenewal: boolean): ServiceTierRoute {
  if (!isRenewal) return 'standard'
  const enabled = optionalEnv('AI_PLAN_ASYNC_RENEWAL_ENABLED')?.toLowerCase() === 'true'
  if (!enabled) return 'standard'
  const tier = enumEnv('AI_PLAN_ASYNC_SERVICE_TIER', ['batch', 'flex'] as const)
  return tier ?? 'flex'
}

export function isCompactSchemaEnabled(): boolean {
  return optionalEnv('AI_PLAN_COMPACT_SCHEMA')?.toLowerCase() !== 'false'
}
