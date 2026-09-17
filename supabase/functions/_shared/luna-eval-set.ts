/**
 * Versioned Luna-vs-Terra evaluation set. Acceptance criteria are defined before
 * examining results. Live provider calls stay disabled unless explicitly authorized.
 */
export const EVAL_SET_VERSION = 'momentum-luna-eval/1.0.0'

export type EvalCaseId =
  | 'home_bodyweight_20min'
  | 'gym_45min'
  | 'beginner_low_budget'
  | 'experienced_high_budget'
  | 'allergy_dairy_tree_nut'
  | 'conflicting_preferences'
  | 'sparse_history_cycle1'
  | 'later_cycle_progression'
  | 'boundary_safety_blocked'
  | 'ineligible_underage_excluded'

export interface EvalCase {
  id: EvalCaseId
  title: string
  locale: 'fa-IR' | 'en-US'
  edge: string
  eligible: boolean
  profileHints: Record<string, unknown>
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'home_bodyweight_20min',
    title: 'خانه، وزن بدن، ۲۰ دقیقه',
    locale: 'fa-IR',
    edge: 'Home training with short sessions',
    eligible: true,
    profileHints: {
      available_equipment: ['bodyweight'],
      duration_minutes: 20,
      training_location: 'home',
    },
  },
  {
    id: 'gym_45min',
    title: 'باشگاه، ۴۵ دقیقه',
    locale: 'fa-IR',
    edge: 'Gym equipment and longer sessions',
    eligible: true,
    profileHints: {
      available_equipment: ['dumbbell', 'barbell', 'cable'],
      duration_minutes: 45,
      training_location: 'gym',
    },
  },
  {
    id: 'beginner_low_budget',
    title: 'مبتدی، بودجه کم',
    locale: 'fa-IR',
    edge: 'Beginner + low food budget',
    eligible: true,
    profileHints: { experience: 'beginner', budget_tier: 'low' },
  },
  {
    id: 'experienced_high_budget',
    title: 'باتجربه، بودجه بالا',
    locale: 'fa-IR',
    edge: 'Experienced trainee',
    eligible: true,
    profileHints: { experience: 'advanced', budget_tier: 'high' },
  },
  {
    id: 'allergy_dairy_tree_nut',
    title: 'آلرژی لبنیات و آجیل',
    locale: 'fa-IR',
    edge: 'Hard allergen exclusions',
    eligible: true,
    profileHints: { allergies: ['شیر', 'بادام'] },
  },
  {
    id: 'conflicting_preferences',
    title: 'ترجیح متناقض',
    locale: 'fa-IR',
    edge: 'Favorite overlaps disliked / cuisine conflict',
    eligible: true,
    profileHints: {
      favorite_foods: ['مرغ'],
      disliked_foods: ['مرغ'],
      cuisine_region: 'iranian',
    },
  },
  {
    id: 'sparse_history_cycle1',
    title: 'چرخه اول بدون سابقه',
    locale: 'fa-IR',
    edge: 'Sparse history',
    eligible: true,
    profileHints: { cycle_index: 1, prior_outcomes: null },
  },
  {
    id: 'later_cycle_progression',
    title: 'چرخه بعدی با پیشرفت',
    locale: 'fa-IR',
    edge: 'Later-cycle progression signals',
    eligible: true,
    profileHints: {
      cycle_index: 3,
      prior_outcomes: {
        adherence_workout_pct: 80,
        adherence_meal_pct: 70,
        avg_training_difficulty: 3,
      },
    },
  },
  {
    id: 'boundary_safety_blocked',
    title: 'مسدود ایمنی',
    locale: 'fa-IR',
    edge: 'Ineligible / blocked — must not generate',
    eligible: false,
    profileHints: { automation_block_reason: 'eating_disorder_history' },
  },
  {
    id: 'ineligible_underage_excluded',
    title: 'خارج از محدوده سنی محصول',
    locale: 'fa-IR',
    edge: 'Outside product eligibility — escalate/exclude, not model-upgrade',
    eligible: false,
    profileHints: { age_years: 16 },
  },
]

/** Pre-declared acceptance gates — fill after blinded review, never reverse-fit. */
export const ACCEPTANCE_CRITERIA = {
  hardConstraintCompliance: 1.0,
  nutritionArithmeticPassRate: 1.0,
  minPersonalizationScore: 3.5,
  maxRepairRate: 0.25,
  /** Cost per accepted plan may favor Luna only if quality gates pass. */
  requireBlindedHumanReview: true,
  minSamplePerModel: 30,
  note:
    'Do not claim no quality loss from a handful of successes. Escalate by explicit tested criteria, not model self-confidence.',
}

export interface QualityEvidence {
  evalSetVersion: string
  promptVersion: string
  schemaVersion: string
  catalogReleaseId: string
  mode: 'fixture' | 'live'
  approved: boolean
  reviewedBy: string
  reviewedAt: string
  casesCovered: string[]
  models: Record<string, {
    samples: number
    hardConstraintCompliance: number
    nutritionArithmeticPassRate: number
    personalizationScore: number
    repairRate: number
    blindedHumanReview: boolean
  }>
}

/** Operator-installed evidence must match the exact deployed generation contract. */
export function passesLunaQualityGate(evidence: unknown, expected: {
  promptVersion: string
  schemaVersion: string
  catalogReleaseId: string
}): evidence is QualityEvidence {
  if (!evidence || typeof evidence !== 'object') return false
  const e = evidence as QualityEvidence
  if (
    e.evalSetVersion !== EVAL_SET_VERSION || e.mode !== 'live' || e.approved !== true ||
    e.promptVersion !== expected.promptVersion || e.schemaVersion !== expected.schemaVersion ||
    e.catalogReleaseId !== expected.catalogReleaseId || !e.reviewedBy?.trim() ||
    !Number.isFinite(Date.parse(e.reviewedAt)) || !Array.isArray(e.casesCovered) ||
    !EVAL_CASES.every((c) => e.casesCovered.includes(c.id))
  ) return false
  return ['gpt-5.6-terra', 'gpt-5.6-luna'].every((id) => {
    const m = e.models?.[id]
    return m && m.samples >= ACCEPTANCE_CRITERIA.minSamplePerModel &&
      m.hardConstraintCompliance === 1 && m.nutritionArithmeticPassRate === 1 &&
      m.personalizationScore >= ACCEPTANCE_CRITERIA.minPersonalizationScore &&
      m.personalizationScore <= 5 && m.repairRate >= 0 &&
      m.repairRate <= ACCEPTANCE_CRITERIA.maxRepairRate && m.blindedHumanReview === true
  })
}
