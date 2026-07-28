import { getPlanForDate } from '../../features/plans/state/plan-state'
import type { AppState, ISODate, MealSlot, Nutrition } from '../../types/domain'

export const emptyNutrition: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
}

export function addNutrition(first: Nutrition, second: Nutrition): Nutrition {
  return {
    calories: first.calories + second.calories,
    protein: first.protein + second.protein,
    carbs: first.carbs + second.carbs,
    fat: first.fat + second.fat,
    fiber: (first.fiber ?? 0) + (second.fiber ?? 0),
  }
}

export function getSelectedMealOption(
  state: AppState,
  date: ISODate,
  meal: MealSlot,
) {
  const selectedOptionId =
    state.dailyLogs[date]?.selectedMealOptions[meal.id] ?? meal.defaultOptionId
  return (
    meal.options.find((option) => option.id === selectedOptionId) ?? meal.options[0]
  )
}

export function calculateDailyNutrition(state: AppState, date: ISODate) {
  const activePlan = getPlanForDate(state, date)?.plan
  const planDay = activePlan?.days.find((day) => day.date === date)
  const dailyLog = state.dailyLogs[date]

  const plannedNutrition =
    planDay?.meals.reduce((total, meal) => {
      if (!dailyLog?.consumedMeals[meal.id]?.completed) {
        return total
      }

      const completion = dailyLog.consumedMeals[meal.id]
      return addNutrition(
        total,
        completion.nutrition ??
          getSelectedMealOption(state, date, meal).nutrition,
      )
    }, emptyNutrition) ?? emptyNutrition

  const extraNutrition =
    dailyLog?.extraFoodLogs.reduce(
      (total, item) => addNutrition(total, item.nutrition),
      emptyNutrition,
    ) ?? emptyNutrition

  const consumed = addNutrition(plannedNutrition, extraNutrition)
  const targets = planDay?.targets ?? activePlan?.defaultTargets

  return {
    activePlan,
    planDay,
    consumed,
    targets,
    remaining: targets
      ? {
          calories: targets.calories - consumed.calories,
          protein: targets.protein - consumed.protein,
          carbs: (targets.carbs ?? 0) - consumed.carbs,
          fat: (targets.fat ?? 0) - consumed.fat,
          fiber: (targets.fiber ?? 0) - (consumed.fiber ?? 0),
        }
      : undefined,
  }
}

export function getNextIncompleteMeal(state: AppState, date: ISODate) {
  const { planDay } = calculateDailyNutrition(state, date)
  return planDay?.meals.find(
    (meal) => !state.dailyLogs[date]?.consumedMeals[meal.id]?.completed,
  )
}
