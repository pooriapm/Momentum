export const APP_CONFIG = {
  name: 'Momentum',
  wordmark: 'MOMENTUM',
  version: '0.4.0',
  tagline: 'برنامه ماهانه برای حرکت‌های ماندگار',
  monthlyPlanDays: 30,
  locale: 'fa-IR',
  storageNamespace: 'momentum',
  brandMotion: {
    bootMinimumDurationMs: 1400,
    bootExitDurationMs: 360,
  },
  planFile: {
    extension: '.json',
    mimeType: 'application/json',
    maxBytes: 1024 * 1024,
  },
} as const

const namespace = APP_CONFIG.storageNamespace

export const STORAGE_KEYS = {
  appState: `${namespace}.appState`,
  stagingState: `${namespace}.appState.staging`,
  recoveryState: `${namespace}.appState.recovery`,
  secondRecoveryState: `${namespace}.appState.recovery.2`,
  quarantinedState: `${namespace}.appState.quarantine`,
  uiState: `${namespace}.uiState`,
} as const
