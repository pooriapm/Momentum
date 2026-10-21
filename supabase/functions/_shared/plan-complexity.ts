import type { PlanBriefResult } from './plan-brief.ts'

/**
 * Routes each plan to the cheap "simple" model or the stronger "complex" model, from the brief
 * alone (no user text). Deterministic, so the same profile always takes the same route.
 *
 * Complex when the user reports an injury (the hardest case in the live evaluation), or when two or
 * more of the softer constraints stack up: each narrows the allowlists or adds rules the model has
 * to juggle at the same time.
 */
export const PLAN_COMPLEXITY_VERSION = 'momentum-plan-complexity/1.0.0'

export type PlanComplexity = 'simple' | 'complex'

export interface PlanComplexityDecision {
  tier: PlanComplexity
  /** Reason codes only, safe to store and log. */
  reasons: string[]
}

export function assessPlanComplexity(
  result: Pick<PlanBriefResult, 'brief' | 'relaxations'>,
  declaredAllergenIds: ReadonlySet<string>,
): PlanComplexityDecision {
  const { brief } = result
  const reasons: string[] = []
  if (brief.training.injury) reasons.push('injury')
  if (declaredAllergenIds.size > 0) reasons.push('allergens')
  if (brief.diet.pattern === 'vegetarian' || brief.diet.pattern === 'vegan') reasons.push('plant_based')
  if (brief.meals.slots.length >= 5) reasons.push('many_meals')
  if (brief.training.level === 'advanced' || brief.training.days_per_week >= 5) reasons.push('heavy_training')
  if (brief.history && typeof brief.history.note === 'string' && brief.history.note.trim()) {
    reasons.push('user_wish')
  }
  if (result.relaxations.length > 0 || brief.foods.length < 30) reasons.push('narrow_foods')
  const bmi = brief.person.weight_kg / (brief.person.height_cm / 100) ** 2
  if (bmi >= 35 || brief.person.age >= 60) reasons.push('body_risk')

  const complex = reasons.includes('injury') || reasons.length >= 2
  return { tier: complex ? 'complex' : 'simple', reasons }
}
