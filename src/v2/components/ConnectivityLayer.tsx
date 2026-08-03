import { RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const [showRestored, setShowRestored] = useState(false)
  const previousOnline = useRef(online)
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

  useEffect(() => {
    let showTimeout: number | undefined
    let hideTimeout: number | undefined
    if (!previousOnline.current && online) {
      showTimeout = window.setTimeout(() => setShowRestored(true), 0)
      hideTimeout = window.setTimeout(() => setShowRestored(false), 3500)
    }
    previousOnline.current = online
    return () => {
      if (showTimeout !== undefined) window.clearTimeout(showTimeout)
      if (hideTimeout !== undefined) window.clearTimeout(hideTimeout)
    }
  }, [online])

  return (
    <>
      {!online ? (
        <div aria-live="assertive" className="connectivity-toast connectivity-toast--offline" role="status">
          <span className="connectivity-toast__icon"><WifiOff size={19} /></span>
          <div>
            <strong>{fa ? 'Momentum در حالت آفلاین اجرا می‌شود' : 'Momentum is running offline'}</strong>
            <p>{fa ? 'اتصال به سرور برقرار نیست. صفحه‌های ذخیره‌شده در دسترس‌اند، اما ثبت اطلاعات و ساخت برنامه تا اتصال دوباره متوقف است.' : 'The server is unreachable. Cached screens remain available, but saving and generation pause until you reconnect.'}</p>
          </div>
        </div>
      ) : null}
      {online && showRestored ? (
        <div aria-live="polite" className="connectivity-toast connectivity-toast--restored" role="status">
          <span className="connectivity-toast__icon"><Wifi size={19} /></span>
          <div><strong>{fa ? 'اتصال دوباره برقرار شد' : 'You are back online'}</strong><p>{fa ? 'همگام‌سازی و ثبت اطلاعات دوباره فعال است.' : 'Sync and saving are available again.'}</p></div>
        </div>
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
