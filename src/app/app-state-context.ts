import { createContext } from 'react'
import type {
  AppState,
  DailyCheckInUpdate,
  ISODate,
  MealOption,
  PlanConflictResolution,
  UserProfile,
  WeeklyMealPlan,
} from '../types/domain'

export interface AppStateContextValue {
  appState: AppState | null
  storageError?: string
  completeOnboarding: (profile: UserProfile, plan?: WeeklyMealPlan) => void
  updateProfile: (profile: UserProfile) => boolean
  importPlan: (plan: WeeklyMealPlan, resolution: PlanConflictResolution) => boolean
  removePlan: (storageKey: string) => boolean
  prioritizePlan: (storageKey: string) => boolean
  selectMealOption: (date: ISODate, mealId: string, optionId: string) => boolean
  toggleMealCompletion: (date: ISODate, mealId: string, xp: number) => boolean
  saveMealNote: (date: ISODate, mealId: string, note: string) => boolean
  logEmergencyFood: (date: ISODate, option: MealOption) => boolean
  saveDailyCheckIn: (date: ISODate, update: DailyCheckInUpdate) => boolean
  clearAllData: () => boolean
  dismissStorageError: () => void
}

export const AppStateContext = createContext<AppStateContextValue | null>(null)
