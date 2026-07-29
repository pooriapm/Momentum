import { useEffect } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { APP_CONFIG } from '../../config/app'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { IconTile } from '../ui/IconTile'
import { Surface } from '../ui/Surface'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') {
        void navigator.serviceWorker
          .getRegistration()
          .then((registration) => registration?.update())
      }
    }

    const interval = window.setInterval(checkForUpdate, 30 * 60 * 1000)
    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', checkForUpdate)
    checkForUpdate()

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkForUpdate)
      document.removeEventListener('visibilitychange', checkForUpdate)
    }
  }, [])

  if (!needRefresh) return null

  return (
    <Surface
      aria-labelledby="update-title"
      aria-live="assertive"
      className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-md rounded-[24px] p-4 desktop:bottom-6"
      role="alertdialog"
      variant="accent"
    >
      <div className="flex items-start gap-3">
        <IconTile>
          <Sparkles aria-hidden="true" size={20} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-black text-[var(--color-text)]"
            id="update-title"
          >
            نسخه جدید {APP_CONFIG.name} آماده است
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
            با به‌روزرسانی، نسخه تازه جایگزین کش قبلی می‌شود و برنامه دوباره باز خواهد شد.
          </p>
        </div>
        <IconButton
          aria-label="بعداً به‌روزرسانی می‌کنم"
          onClick={() => setNeedRefresh(false)}
        >
          <X aria-hidden="true" size={18} />
        </IconButton>
      </div>
      <Button
        block
        className="mt-4 rounded-xl"
        onClick={() => void updateServiceWorker(true)}
        size="lg"
      >
        <RefreshCw aria-hidden="true" size={17} />
        به‌روزرسانی و باز کردن نسخه جدید
      </Button>
    </Surface>
  )
}
