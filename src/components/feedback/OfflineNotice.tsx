import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineNotice() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const showOnline = () => setIsOnline(true)
    const showOffline = () => setIsOnline(false)

    window.addEventListener('online', showOnline)
    window.addEventListener('offline', showOffline)

    return () => {
      window.removeEventListener('online', showOnline)
      window.removeEventListener('offline', showOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-highlight-soft)] px-4 py-2 text-xs font-bold text-[var(--color-highlight)]"
      role="status"
    >
      <WifiOff aria-hidden="true" size={15} />
      آفلاین هستید؛ نسخه ذخیره‌شده همچنان در دسترس است.
    </div>
  )
}
