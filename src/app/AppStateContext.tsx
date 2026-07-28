import { useState, type ReactNode } from 'react'
import {
  createAppState,
  loadAppState,
  resetAppState,
  saveAppState,
} from '../lib/storage/app-state'
import {
  applyPlanImport,
  createEmptyDailyLog,
  getPlanForDate,
  removePlanFromState,
} from '../features/plans/state/plan-state'
import { toggleMealInLog } from '../lib/calculations/daily-log'
import { getSelectedMealOption } from '../lib/calculations/nutrition'
import { resetUiState } from '../lib/ui-state'
import type {
  AppState,
  DailyCheckInUpdate,
  ISODate,
  MealOption,
  PlanConflictResolution,
  UserProfile,
  WeeklyMealPlan,
} from '../types/domain'
import { AppStateContext } from './app-state-context'

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(loadAppState)
  const [appState, setAppState] = useState<AppState | null>(initialLoad.state)
  const [storageError, setStorageError] = useState<string | undefined>(initialLoad.error)

  const persistState = (nextState: AppState) => {
    const result = saveAppState(nextState)

    if (!result.success) {
      setStorageError(result.error)
      return false
    }

    setAppState(nextState)
    setStorageError(undefined)
    return true
  }

  const completeOnboarding = (profile: UserProfile, plan?: WeeklyMealPlan) => {
    const initialState = createAppState(profile)
    const nextState = plan
      ? applyPlanImport(initialState, plan, 'imported-first').state
      : initialState
    persistState(nextState)
  }

  const updateProfile = (profile: UserProfile) => {
    if (!appState) {
      return false
    }

    return persistState({ ...appState, profile })
  }

  const importPlan = (plan: WeeklyMealPlan, resolution: PlanConflictResolution) => {
    if (!appState) {
      return false
    }

    return persistState(applyPlanImport(appState, plan, resolution).state)
  }

  const removePlan = (storageKey: string) => {
    if (!appState || !appState.plans[storageKey]) {
      return false
    }

    return persistState(removePlanFromState(appState, storageKey))
  }

  const prioritizePlan = (storageKey: string) => {
    if (!appState || !appState.plans[storageKey]) {
      return false
    }

    return persistState({
      ...appState,
      planPriority: [
        storageKey,
        ...appState.planPriority.filter((key) => key !== storageKey),
      ],
    })
  }

  const selectMealOption = (
    date: ISODate,
    mealId: string,
    optionId: string,
  ) => {
    if (!appState) {
      return false
    }

    const currentLog = appState.dailyLogs[date] ?? createEmptyDailyLog(date)
    if (currentLog.consumedMeals[mealId]?.completed) {
      return false
    }

    const nextLog = {
      ...currentLog,
      selectedMealOptions: {
        ...currentLog.selectedMealOptions,
        [mealId]: optionId,
      },
    }

    return persistState({
      ...appState,
      dailyLogs: {
        ...appState.dailyLogs,
        [date]: nextLog,
      },
    })
  }

  const toggleMealCompletion = (date: ISODate, mealId: string, xp: number) => {
    if (!appState) {
      return false
    }

    const currentLog = appState.dailyLogs[date] ?? createEmptyDailyLog(date)
    const currentCompletion = currentLog.consumedMeals[mealId]
    const plan = getPlanForDate(appState, date)?.plan
    const meal = plan?.days
      .find((day) => day.date === date)
      ?.meals.find((candidate) => candidate.id === mealId)
    const selectedOption =
      currentCompletion?.completed || !meal
        ? undefined
        : getSelectedMealOption(appState, date, meal)

    return persistState({
      ...appState,
      dailyLogs: {
        ...appState.dailyLogs,
        [date]: toggleMealInLog(currentLog, mealId, xp, { selectedOption }),
      },
    })
  }

  const saveMealNote = (date: ISODate, mealId: string, note: string) => {
    if (!appState) {
      return false
    }

    const currentLog = appState.dailyLogs[date] ?? createEmptyDailyLog(date)
    return persistState({
      ...appState,
      dailyLogs: {
        ...appState.dailyLogs,
        [date]: {
          ...currentLog,
          mealNotes: {
            ...currentLog.mealNotes,
            [mealId]: note,
          },
        },
      },
    })
  }

  const logEmergencyFood = (date: ISODate, option: MealOption) => {
    if (!appState) {
      return false
    }

    const currentLog = appState.dailyLogs[date] ?? createEmptyDailyLog(date)
    const loggedAt = new Date().toISOString()
    const id =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `emergency-${Date.now()}`

    return persistState({
      ...appState,
      dailyLogs: {
        ...appState.dailyLogs,
        [date]: {
          ...currentLog,
          extraFoodLogs: [
            ...currentLog.extraFoodLogs,
            {
              id,
              title: option.title,
              nutrition: option.nutrition,
              loggedAt,
              source: 'emergency',
            },
          ],
          earnedXp: currentLog.earnedXp + 5,
        },
      },
    })
  }

  const saveDailyCheckIn = (date: ISODate, update: DailyCheckInUpdate) => {
    if (!appState) {
      return false
    }

    const currentLog = appState.dailyLogs[date] ?? createEmptyDailyLog(date)
    const firstCheckIn = !currentLog.checkInCompletedAt
    const nextLog = {
      ...currentLog,
      ...update,
      checkInCompletedAt: currentLog.checkInCompletedAt ?? new Date().toISOString(),
      checkInXpAwarded: currentLog.checkInXpAwarded ?? 8,
      earnedXp: currentLog.earnedXp + (firstCheckIn ? 8 : 0),
    }
    const dailyLogs = {
      ...appState.dailyLogs,
      [date]: nextLog,
    }
    const latestWeightEntry = Object.values(dailyLogs)
      .filter((log) => log.weightKg !== undefined)
      .sort((first, second) => second.date.localeCompare(first.date))[0]

    return persistState({
      ...appState,
      profile: latestWeightEntry?.weightKg
        ? { ...appState.profile, currentWeightKg: latestWeightEntry.weightKg }
        : appState.profile,
      dailyLogs,
    })
  }

  const clearAllData = () => {
    if (!resetAppState()) {
      setStorageError('پاک‌کردن اطلاعات انجام نشد. دسترسی ذخیره‌سازی مرورگر را بررسی کنید.')
      return false
    }

    resetUiState()
    setAppState(null)
    setStorageError(undefined)
    return true
  }

  return (
    <AppStateContext.Provider
      value={{
        appState,
        storageError,
        completeOnboarding,
        updateProfile,
        importPlan,
        removePlan,
        prioritizePlan,
        selectMealOption,
        toggleMealCompletion,
        saveMealNote,
        logEmergencyFood,
        saveDailyCheckIn,
        clearAllData,
        dismissStorageError: () => setStorageError(undefined),
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}
