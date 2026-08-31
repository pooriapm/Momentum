import type {
  AppState,
  DailyLog,
  ISODate,
  PlanConflictResolution,
  MonthlyMealPlan,
} from '../../../types/domain'

export function planRangesOverlap(first: MonthlyMealPlan, second: MonthlyMealPlan) {
  return first.validFrom <= second.validTo && second.validFrom <= first.validTo
}

export function getConflictingPlanKeys(state: AppState, plan: MonthlyMealPlan) {
  return Object.entries(state.plans)
    .filter(([, existingPlan]) => planRangesOverlap(existingPlan, plan))
    .map(([key]) => key)
}

function createStorageKey(state: AppState, plan: MonthlyMealPlan) {
  if (!state.plans[plan.planId]) {
    return plan.planId
  }

  let suffix = 2
  let key = `${plan.planId}::${suffix}`

  while (state.plans[key]) {
    suffix += 1
    key = `${plan.planId}::${suffix}`
  }

  return key
}

export function applyPlanImport(
  state: AppState,
  plan: MonthlyMealPlan,
  resolution: PlanConflictResolution = 'imported-first',
) {
  const storageKey = createStorageKey(state, plan)
  const conflicts = getConflictingPlanKeys(state, plan)
  const plans = { ...state.plans, [storageKey]: plan }
  const withoutImported = state.planPriority.filter((key) => key !== storageKey)
  let planPriority: string[]

  if (resolution === 'replace-conflicts') {
    planPriority = [storageKey, ...withoutImported.filter((key) => !conflicts.includes(key))]
  } else if (resolution === 'existing-first' && conflicts.length > 0) {
    const lastConflictIndex = Math.max(
      ...withoutImported.map((key, index) => (conflicts.includes(key) ? index : -1)),
    )
    planPriority = [
      ...withoutImported.slice(0, lastConflictIndex + 1),
      storageKey,
      ...withoutImported.slice(lastConflictIndex + 1),
    ]
  } else {
    planPriority = [storageKey, ...withoutImported]
  }

  return {
    state: { ...state, plans, planPriority },
    storageKey,
    conflicts,
  }
}

export function removePlanFromState(state: AppState, storageKey: string): AppState {
  const plans = { ...state.plans }
  delete plans[storageKey]

  return {
    ...state,
    plans,
    planPriority: state.planPriority.filter((key) => key !== storageKey),
  }
}

export function getPlanForDate(state: AppState, date: ISODate) {
  const storageKey = state.planPriority.find((key) => {
    const plan = state.plans[key]
    return plan && date >= plan.validFrom && date <= plan.validTo
  })

  return storageKey ? { storageKey, plan: state.plans[storageKey] } : undefined
}

export function createEmptyDailyLog(date: ISODate): DailyLog {
  return {
    date,
    selectedMealOptions: {},
    mealNotes: {},
    consumedMeals: {},
    extraFoodLogs: [],
    earnedXp: 0,
  }
}
