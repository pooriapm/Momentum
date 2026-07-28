import type { AppState, UserProfile } from '../../types/domain'

const APP_STATE_KEY = 'momentum.appState'
const STAGING_STATE_KEY = 'momentum.appState.staging'
const RECOVERY_STATE_KEY = 'momentum.appState.recovery'
const SECOND_RECOVERY_STATE_KEY = 'momentum.appState.recovery.2'
const QUARANTINED_STATE_KEY = 'momentum.appState.quarantine'

const APP_STATE_KEYS = [
  APP_STATE_KEY,
  STAGING_STATE_KEY,
  RECOVERY_STATE_KEY,
  SECOND_RECOVERY_STATE_KEY,
  QUARANTINED_STATE_KEY,
] as const

export interface LoadAppStateResult {
  state: AppState | null
  error?: string
  recoveredFromBackup?: boolean
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const profile = value as Partial<UserProfile>
  return (
    typeof profile.name === 'string' &&
    typeof profile.startWeightKg === 'number' &&
    typeof profile.currentWeightKg === 'number' &&
    typeof profile.targetWeightKg === 'number' &&
    typeof profile.heightCm === 'number' &&
    typeof profile.journeyStartDate === 'string' &&
    typeof profile.goalDate === 'string'
  )
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Partial<AppState>
  return (
    state.storageVersion === 1 &&
    isUserProfile(state.profile) &&
    Boolean(state.settings) &&
    Boolean(state.plans) &&
    Array.isArray(state.planPriority) &&
    Boolean(state.dailyLogs) &&
    Boolean(state.achievements) &&
    Boolean(state.metadata)
  )
}

export function migrateAppState(value: unknown): AppState {
  if (isAppState(value)) {
    return value
  }

  throw new Error('نسخه اطلاعات ذخیره‌شده پشتیبانی نمی‌شود.')
}

function parseStoredState(serializedState: string | null) {
  if (!serializedState) return undefined

  try {
    return migrateAppState(JSON.parse(serializedState))
  } catch {
    return undefined
  }
}

function preserveCorruptedPrimary(serializedState: string | null) {
  if (!serializedState || parseStoredState(serializedState)) return

  try {
    if (!localStorage.getItem(QUARANTINED_STATE_KEY)) {
      localStorage.setItem(QUARANTINED_STATE_KEY, serializedState)
    }
  } catch {
    // The original primary value is intentionally left untouched.
  }
}

export function loadAppState(): LoadAppStateResult {
  try {
    const primaryRaw = localStorage.getItem(APP_STATE_KEY)
    const candidates = [
      { key: APP_STATE_KEY, state: parseStoredState(primaryRaw), priority: 4 },
      {
        key: STAGING_STATE_KEY,
        state: parseStoredState(localStorage.getItem(STAGING_STATE_KEY)),
        priority: 3,
      },
      {
        key: RECOVERY_STATE_KEY,
        state: parseStoredState(localStorage.getItem(RECOVERY_STATE_KEY)),
        priority: 2,
      },
      {
        key: SECOND_RECOVERY_STATE_KEY,
        state: parseStoredState(localStorage.getItem(SECOND_RECOVERY_STATE_KEY)),
        priority: 1,
      },
    ].filter(
      (candidate): candidate is { key: string; state: AppState; priority: number } =>
        candidate.state !== undefined,
    )

    if (candidates.length === 0) {
      if (primaryRaw) {
        preserveCorruptedPrimary(primaryRaw)
        return {
          state: null,
          error:
            'اطلاعات قابل خواندن نیست، اما نسخه خراب حذف یا بازنویسی نشده است.',
        }
      }

      return { state: null }
    }

    const selected = candidates.sort((first, second) => {
      const dateComparison = second.state.metadata.updatedAt.localeCompare(
        first.state.metadata.updatedAt,
      )
      return dateComparison || second.priority - first.priority
    })[0]

    if (selected.key !== APP_STATE_KEY) {
      preserveCorruptedPrimary(primaryRaw)
      return {
        state: selected.state,
        recoveredFromBackup: true,
        error:
          'نسخه اصلی قابل استفاده نبود؛ برنامه بدون حذف اطلاعات از نسخه بازیابی سالم باز شد.',
      }
    }

    return { state: selected.state }
  } catch {
    return {
      state: null,
      error:
        'مرورگر اجازه خواندن اطلاعات را نداد؛ هیچ داده‌ای توسط برنامه حذف نشده است.',
    }
  }
}

export function createAppState(profile: UserProfile): AppState {
  const now = new Date().toISOString()

  return {
    storageVersion: 1,
    profile,
    settings: {
      streakCompletionThreshold: 70,
      preserveRestDayStreak: true,
      print: {
        showNutrition: true,
        showNotes: true,
      },
    },
    plans: {},
    planPriority: [],
    dailyLogs: {},
    achievements: {
      unlockedAt: {},
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function saveAppState(state: AppState): { success: boolean; error?: string } {
  try {
    const nextState: AppState = {
      ...state,
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString(),
      },
    }
    const serializedNextState = JSON.stringify(nextState)

    // Validate before touching the current primary copy.
    migrateAppState(JSON.parse(serializedNextState))
    localStorage.setItem(STAGING_STATE_KEY, serializedNextState)

    if (localStorage.getItem(STAGING_STATE_KEY) !== serializedNextState) {
      throw new Error('staging verification failed')
    }

    const currentPrimary = localStorage.getItem(APP_STATE_KEY)
    const currentRecovery = localStorage.getItem(RECOVERY_STATE_KEY)

    preserveCorruptedPrimary(currentPrimary)

    if (parseStoredState(currentRecovery)) {
      localStorage.setItem(SECOND_RECOVERY_STATE_KEY, currentRecovery as string)
    }

    if (parseStoredState(currentPrimary)) {
      localStorage.setItem(RECOVERY_STATE_KEY, currentPrimary as string)
    }

    localStorage.setItem(APP_STATE_KEY, serializedNextState)

    if (!parseStoredState(localStorage.getItem(APP_STATE_KEY))) {
      throw new Error('primary verification failed')
    }

    localStorage.removeItem(STAGING_STATE_KEY)
    return { success: true }
  } catch {
    return {
      success: false,
      error:
        'ذخیره کامل نشد؛ نسخه قبلی و نسخه بازیابی دست‌نخورده باقی مانده‌اند. فضای مرورگر را بررسی کنید.',
    }
  }
}

export function resetAppState() {
  try {
    APP_STATE_KEYS.forEach((key) => localStorage.removeItem(key))
    return true
  } catch {
    return false
  }
}
