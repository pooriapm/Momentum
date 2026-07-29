import type {
  DayTargetOverrides,
  DayTargets,
  TargetStrategy,
} from '../../types/domain'

function adjusted(
  base: number | undefined,
  adjustment: number | undefined,
) {
  if (base === undefined && adjustment === undefined) return undefined
  return Math.max(0, (base ?? 0) + (adjustment ?? 0))
}

export function calculateDynamicTargets(
  defaults: DayTargets,
  strategy?: TargetStrategy,
  manualOverrides: DayTargetOverrides = {},
): DayTargets {
  const calculated: DayTargets = {
    calories: adjusted(
      defaults.calories,
      strategy?.calorieAdjustment,
    ) as number,
    protein: adjusted(
      defaults.protein,
      strategy?.proteinAdjustment,
    ) as number,
    carbs: adjusted(defaults.carbs, strategy?.carbAdjustment),
    fat: adjusted(defaults.fat, strategy?.fatAdjustment),
    fiber: adjusted(defaults.fiber, strategy?.fiberAdjustment),
    waterMl: defaults.waterMl,
    steps: defaults.steps,
    treadmillMinutes: defaults.treadmillMinutes,
  }

  return Object.fromEntries(
    Object.entries({
      ...calculated,
      ...manualOverrides,
    }).filter(([, value]) => value !== undefined),
  ) as unknown as DayTargets
}
