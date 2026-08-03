import { RefreshCw, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button, GlassChrome } from '../ui/primitives'
import { initializeInstallPromptCapture } from '../../platform/pwa/install-prompt'
import { useOnlineStatus } from '../../platform/pwa/network'

initializeInstallPromptCapture()

export function ConnectivityLayer() {
  const { i18n } = useTranslation()
  const online = useOnlineStatus()
  const [updateError, setUpdateError] = useState('')
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const fa = i18n.resolvedLanguage === 'fa'

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const check = () => {
      if (document.visibilityState === 'visible') {
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => undefined)
      }
    }
    const interval = window.setInterval(check, 30 * 60 * 1000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    check()
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return (
    <>
      {!online ? (
        <div className="offline-banner" role="status"><WifiOff size={16} />{fa ? 'آفلاین هستی؛ بعضی صفحه‌های ذخیره‌شده دیده می‌شوند اما ثبت و ساخت برنامه تا اتصال دوباره متوقف است.' : 'You are offline. Some cached screens remain visible, but saving and generation pause until you reconnect.'}</div>
      ) : null}
      {needRefresh ? (
        <GlassChrome aria-labelledby="pwa-update-title" aria-live="assertive" aria-modal="false" className="pwa-update-card" role="alertdialog">
          <button aria-label={fa ? 'بستن اعلان به‌روزرسانی' : 'Dismiss update'} onClick={() => setNeedRefresh(false)} type="button"><X size={17} /></button>
          <div><strong id="pwa-update-title">{fa ? 'نسخه‌ی تازه آماده است' : 'A new version is ready'}</strong><p>{updateError || (fa ? 'به‌روزرسانی، کش قبلی را امن جایگزین می‌کند.' : 'Update now to safely replace the previous cached version.')}</p></div>
          <Button onClick={() => { setUpdateError(''); void updateServiceWorker(true).catch(() => setUpdateError(fa ? 'به‌روزرسانی انجام نشد؛ اتصال را بررسی کن.' : 'Update failed. Check your connection.')) }}><RefreshCw size={17} />{fa ? 'به‌روزرسانی' : 'Update'}</Button>
        </GlassChrome>
      ) : null}
    </>
  )
}
