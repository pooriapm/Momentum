import { useEffect, useRef, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { requestPlanGeneration } from '../../onboarding/repository'
import {
  type GenerationWaitSession,
  clearGenerationWaitSession,
  createGenerationWaitSession,
  mapGenerationFailure,
  mapJobStatusToPhase,
  markGenerationWaitFailure,
  readGenerationWaitSession,
  resumeGenerationWaitClock,
  waitHasTimedOut,
  writeGenerationWaitSession,
} from './generation-wait'

function readResumedSession(enabled: boolean): GenerationWaitSession | null {
  if (!enabled) return null
  const existing = readGenerationWaitSession()
  if (!existing) return null
  if (waitHasTimedOut(existing.startedAt) && !existing.failure) {
    const timedOut = markGenerationWaitFailure(existing, 'timeout')
    writeGenerationWaitSession(timedOut)
    return timedOut
  }
  return existing
}

export function useGenerationWait(locale: AppLocale, hasPriorPlan: boolean, enabled = true) {
  const [session, setSession] = useState<GenerationWaitSession | null>(() => readResumedSession(enabled))
  const running = useRef(false)
  const pollTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (pollTimer.current) window.clearTimeout(pollTimer.current)
  }, [])

  function persist(next: GenerationWaitSession | null) {
    if (next) writeGenerationWaitSession(next)
    else clearGenerationWaitSession()
    setSession(next)
  }

  function persistUnlessTimedOut(next: GenerationWaitSession) {
    const latest = readGenerationWaitSession()
    if (latest?.idempotencyKey === next.idempotencyKey && latest.failure === 'timeout' && next.phase !== 'ready') return
    persist(next)
  }

  async function run(current: GenerationWaitSession) {
    if (!enabled || running.current) return
    running.current = true
    const working = current.phase === 'queued' ? { ...current, phase: 'generating' as const, failure: null } : current
    if (working.phase !== current.phase) persistUnlessTimedOut(working)
    try {
      const result = await requestPlanGeneration(locale, working.idempotencyKey)
      const phase = mapJobStatusToPhase(result.job.status)
      if (phase === 'ready') {
        persist({ ...working, phase: 'ready', failure: null })
        clearGenerationWaitSession()
        window.location.reload()
        return
      }
      persistUnlessTimedOut({ ...working, phase, failure: null })
    } catch (caught) {
      const mapped = mapGenerationFailure(caught)
      if (mapped === 'still_processing') {
        persistUnlessTimedOut({ ...working, phase: 'generating', failure: null })
        if (pollTimer.current) window.clearTimeout(pollTimer.current)
        pollTimer.current = window.setTimeout(() => {
          pollTimer.current = null
          const latest = readGenerationWaitSession()
          if (!latest || latest.failure || latest.phase === 'ready' || waitHasTimedOut(latest.startedAt)) return
          running.current = false
          void run(latest)
        }, 2_500)
        return
      }
      persistUnlessTimedOut(markGenerationWaitFailure(working, mapped ?? 'provider'))
    } finally {
      running.current = false
    }
  }

  useEffect(() => {
    if (!enabled) return
    const existing = readGenerationWaitSession()
    if (!existing || existing.failure || existing.phase === 'ready') return
    if (waitHasTimedOut(existing.startedAt)) return
    const timer = window.setTimeout(() => {
      void run(existing)
    }, 0)
    return () => window.clearTimeout(timer)
    // Resume the stored job once when this surface mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  function markTimeout() {
    const current = readGenerationWaitSession()
    if (!current || current.failure) return
    const next = markGenerationWaitFailure(current, 'timeout')
    writeGenerationWaitSession(next)
    setSession(next)
  }

  function start() {
    if (!enabled) return
    running.current = false
    const existing = readGenerationWaitSession() ?? session
    const next = createGenerationWaitSession({ hasPriorPlan, existing })
    persist(next)
    void run(next)
  }

  function retry() {
    if (!enabled) return
    running.current = false
    const existing = readGenerationWaitSession() ?? session
    if (!existing) {
      start()
      return
    }
    const next = resumeGenerationWaitClock({ ...existing, hasPriorPlan: hasPriorPlan || existing.hasPriorPlan })
    persist(next)
    void run(next)
  }

  return { session, start, retry, markTimeout }
}
