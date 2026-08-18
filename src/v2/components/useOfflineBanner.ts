import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '../../platform/pwa/network'

export function useOfflineBanner() {
  const online = useOnlineStatus()
  const prevOnlineRef = useRef(online)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const wentOffline = prevOnlineRef.current && !online
    const cameOnline = !prevOnlineRef.current && online
    prevOnlineRef.current = online

    if (wentOffline || cameOnline) {
      const resetTimer = setTimeout(() => setDismissed(false), 0)
      return () => clearTimeout(resetTimer)
    }
  }, [online])

  const dismissOnScrollTop = useCallback(() => {
    if (!online && !dismissed) setDismissed(true)
  }, [online, dismissed])

  return {
    online,
    showBanner: !online && !dismissed,
    dismissOnScrollTop,
  }
}
