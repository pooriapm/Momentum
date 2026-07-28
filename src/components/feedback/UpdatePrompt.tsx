import { useEffect } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

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
    <div
      aria-labelledby="update-title"
      aria-live="assertive"
      className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-md rounded-[24px] border border-[var(--emerald)] bg-[var(--surface-strong)] p-4 shadow-2xl desktop:bottom-6"
      role="alertdialog"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
          <Sparkles aria-hidden="true" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-black text-[var(--text-primary)]"
            id="update-title"
          >
            نسخه جدید Momentum آماده است
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
            با به‌روزرسانی، نسخه تازه جایگزین کش قبلی می‌شود و برنامه دوباره باز خواهد شد.
          </p>
        </div>
        <button
          aria-label="بعداً به‌روزرسانی می‌کنم"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
          onClick={() => setNeedRefresh(false)}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <button
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--emerald)] text-xs font-black text-[#07110d]"
        onClick={() => void updateServiceWorker(true)}
        type="button"
      >
        <RefreshCw aria-hidden="true" size={17} />
        به‌روزرسانی و باز کردن نسخه جدید
      </button>
    </div>
  )
}
