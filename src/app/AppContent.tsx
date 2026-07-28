import { lazy, Suspense } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Onboarding } from '../features/onboarding/Onboarding'
import { useAppState } from './useAppState'

const AppShell = lazy(() =>
  import('../components/layout/AppShell').then((module) => ({
    default: module.AppShell,
  })),
)

function AppLoading() {
  return (
    <main
      aria-label="در حال بارگذاری Momentum"
      className="grid min-h-screen place-items-center"
      role="status"
    >
      <div className="text-center">
        <div className="mx-auto size-10 animate-pulse rounded-2xl bg-[var(--emerald-soft)] ring-1 ring-[var(--border-strong)]" />
        <p className="mt-3 text-xs font-bold text-[var(--text-muted)]">Momentum</p>
      </div>
    </main>
  )
}

export function AppContent() {
  const {
    appState,
    storageError,
    completeOnboarding,
    dismissStorageError,
  } = useAppState()

  return (
    <>
      {storageError && (
        <div
          className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface-strong)] p-4 shadow-2xl"
          role="alert"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--danger)]"
            size={19}
          />
          <p className="flex-1 text-xs font-bold leading-6 text-[var(--text-secondary)]">
            {storageError}
          </p>
          <button
            aria-label="بستن هشدار ذخیره‌سازی"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
            onClick={dismissStorageError}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
      )}
      {appState ? (
        <Suspense fallback={<AppLoading />}>
          <AppShell />
        </Suspense>
      ) : (
        <Onboarding onComplete={completeOnboarding} />
      )}
    </>
  )
}
