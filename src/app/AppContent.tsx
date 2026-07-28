import { lazy, Suspense } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Onboarding } from '../features/onboarding/Onboarding'
import { UpdatePrompt } from '../components/feedback/UpdatePrompt'
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
      className="boot-splash"
      role="status"
    >
      <div className="boot-splash__content">
        <img
          alt=""
          aria-hidden="true"
          className="boot-splash__logo"
          src="/pwa-192.png"
        />
        <p className="boot-splash__name" dir="ltr">MOMENTUM</p>
        <p className="boot-splash__tagline">ریتم پایدار، پیشرفت واقعی</p>
        <span className="boot-splash__progress" />
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
      <UpdatePrompt />
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
