import type { DailyLog, MealOption } from '../../types/domain'

export function toggleMealInLog(
  log: DailyLog,
  mealId: string,
  xp: number,
  options?: {
    selectedOption?: MealOption
    completedAt?: string
  },
): DailyLog {
  const currentCompletion = log.consumedMeals[mealId]
  const isUndo = currentCompletion?.completed === true
  const xpDelta = isUndo ? -(currentCompletion.xpAwarded ?? 0) : xp
  const selectedOption = options?.selectedOption

  return {
    ...log,
    consumedMeals: {
      ...log.consumedMeals,
      [mealId]: {
        ...currentCompletion,
        completed: !isUndo,
        completedAt: isUndo
          ? undefined
          : (options?.completedAt ?? new Date().toISOString()),
        xpAwarded: isUndo ? 0 : xp,
        optionId: isUndo
          ? currentCompletion?.optionId
          : selectedOption?.id,
        optionTitle: isUndo
          ? currentCompletion?.optionTitle
          : selectedOption?.title,
        nutrition: isUndo
          ? currentCompletion?.nutrition
          : selectedOption?.nutrition,
      },
    },
    earnedXp: Math.max(0, log.earnedXp + xpDelta),
  }
}
