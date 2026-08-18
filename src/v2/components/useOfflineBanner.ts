import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '../../platform/pwa/network'

export function useOfflineBanner() {
  const online = useOnlineStatus()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the last online→offline transition so we can reset on reconnect
  const prevOnlineRef = useRef(online)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // When connectivity changes, schedule collapse via timer (no setState directly in effect body)
  useEffect(() => {
    const wentOffline = prevOnlineRef.current && !online
    const cameOnline = !prevOnlineRef.current && online
    prevOnlineRef.current = online

    if (wentOffline) {
      // Reset flags on next tick to avoid cascading-setState warning
      const resetTimer = setTimeout(() => {
        setDismissed(false)
        setCollapsed(false)
      }, 0)
      timerRef.current = setTimeout(() => setCollapsed(true), 5000)
      return () => {
        clearTimeout(resetTimer)
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    if (cameOnline) {
      if (timerRef.current) clearTimeout(timerRef.current)
      const resetTimer = setTimeout(() => {
        setDismissed(false)
        setCollapsed(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }
  }, [online])

  const dismissOnScrollTop = useCallback(() => {
    if (!online && !dismissed) setDismissed(true)
  }, [online, dismissed])

  return {
    online,
    showBanner: !online && !dismissed && !collapsed,
    showIcon: !online && collapsed && !dismissed,
    dismissOnScrollTop,
    dismiss: () => setDismissed(true),
  }
}
