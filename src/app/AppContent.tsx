import { lazy, Suspense } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { APP_CONFIG } from '../config/app'
import { MomentumLogo } from '../components/brand/MomentumLogo'
import { IconButton } from '../components/ui/IconButton'
import { Surface } from '../components/ui/Surface'
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
      aria-label={`در حال بارگذاری ${APP_CONFIG.name}`}
      className="boot-splash"
      role="status"
    >
      <div className="boot-splash__content">
        <MomentumLogo
          className="boot-splash__logo"
          motion="splash"
        />
        <p className="boot-splash__name" dir="ltr">{APP_CONFIG.wordmark}</p>
        <p className="boot-splash__tagline">{APP_CONFIG.tagline}</p>
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
        <Surface
          className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-xl items-start gap-3 rounded-2xl p-4"
          role="alert"
          variant="danger"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--color-danger)]"
            size={19}
          />
          <p className="flex-1 text-xs font-bold leading-6 text-[var(--color-text-secondary)]">
            {storageError}
          </p>
          <IconButton
            aria-label="بستن هشدار ذخیره‌سازی"
            onClick={dismissStorageError}
          >
            <X aria-hidden="true" size={18} />
          </IconButton>
        </Surface>
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
