import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSafeErrorReport,
  registerGlobalErrorReporting,
  reportSafeError,
  sanitizeErrorText,
} from './safe-error-report'

const runtime = vi.hoisted(() => ({
  runtimeConfig: {
    appEnvironment: 'test',
    errorIngestUrl: '',
    hasSupabase: false,
    privacyEmail: '',
    supabasePublishableKey: '',
    supabaseUrl: '',
    supportEmail: '',
  },
}))

vi.mock('../config/runtime', () => runtime)

function parseReports(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
  const reports: Record<string, unknown>[] = []
  for (const call of spy.mock.calls) {
    for (const arg of call) {
      if (typeof arg !== 'string' || !arg.startsWith('{')) continue
      try {
        const parsed = JSON.parse(arg) as Record<string, unknown>
        if (typeof parsed.event === 'string' && typeof parsed.code === 'string') reports.push(parsed)
      } catch {
        // React and jsdom also write non-JSON console errors.
      }
    }
  }
  return reports
}

describe('privacy-safe error reports', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    runtime.runtimeConfig.errorIngestUrl = ''
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('redacts email from Error("user ava@x.com failed")', () => {
    const payload = buildSafeErrorReport({
      code: 'fatal_render',
      error: new Error('user ava@x.com failed'),
    })
    expect(payload).not.toBeNull()
    expect(JSON.stringify(payload)).not.toContain('ava@x.com')
    expect(payload?.message).toBe('fatal_render')
    expect(payload?.code).toBe('fatal_render')
    expect(payload?.event).toBe('fatal_render')
  })

  it('strips query strings from stack URLs', () => {
    const error = new Error('render failed')
    error.stack = [
      'Error: render failed',
      '    at https://momentum.pooria-pm.workers.dev/assets/app.js?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signaturepartxx',
      '    at /src/app/App.tsx?t=1710000000:12:3',
    ].join('\n')

    const payload = buildSafeErrorReport({ code: 'unhandled_error', error })
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toMatch(/\?/)
    expect(serialized).not.toContain('token=')
    expect(serialized).not.toContain('eyJhbGci')
    expect(payload?.stack).toContain('https://momentum.pooria-pm.workers.dev/assets/app.js')
    expect(payload?.stack).toContain('/src/app/App.tsx')
  })

  it('drops health-ish fields and does not copy unknown keys', () => {
    const error = Object.assign(new Error('check-in failed'), {
      weight_kg: 72.8,
      notes: 'chest pain after dinner',
      email: 'ava@x.com',
      prompt: 'generate a meal plan',
    })
    const payload = buildSafeErrorReport({ code: 'fatal_render', error })
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain('weight_kg')
    expect(serialized).not.toContain('72.8')
    expect(serialized).not.toContain('chest pain')
    expect(serialized).not.toContain('ava@x.com')
    expect(serialized).not.toContain('generate a meal plan')
    expect(Object.keys(payload ?? {})).toEqual([
      'event',
      'code',
      'message',
      'stack',
      'href',
      'env',
      'release',
      'request_id',
    ])
  })

  it('never reports arbitrary health text from an exception message', () => {
    const payload = buildSafeErrorReport({
      code: 'unhandled_error',
      error: new Error('chest pain after dinner; weight 72.8 kg'),
    })
    expect(JSON.stringify(payload)).not.toMatch(/chest pain|dinner|72\.8/i)
    expect(payload?.message).toBe('unhandled_error')
  })

  it('ignores unknown event codes', () => {
    expect(buildSafeErrorReport({ code: 'custom_leak', error: new Error('nope') })).toBeNull()
  })

  it('skips network when VITE_ERROR_INGEST_URL is unset', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    reportSafeError({ code: 'fatal_render', error: new Error('offline path') })
    expect(parseReports(consoleSpy)).toHaveLength(1)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('POSTs same-origin JSON with CORS-simple headers and ignores network failures', async () => {
    runtime.runtimeConfig.errorIngestUrl = '/ops/client-errors'
    const failingFetch = vi.fn().mockRejectedValue(new Error('ingest down'))
    vi.stubGlobal('fetch', failingFetch)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => reportSafeError({ code: 'unhandled_rejection', error: new Error('boom') })).not.toThrow()
    expect(parseReports(consoleSpy)[0]?.code).toBe('unhandled_rejection')
    expect(failingFetch).toHaveBeenCalledTimes(1)
    const [, init] = failingFetch.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.mode).toBe('same-origin')
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain' })
    await Promise.resolve()
  })

  it('does not POST to a cross-origin ingest URL', () => {
    runtime.runtimeConfig.errorIngestUrl = 'https://evil.example/hooks/errors?secret=webhook'
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    reportSafeError({ code: 'unhandled_error', error: new Error('stay local') })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('registers window error and unhandledrejection without rethrowing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    registerGlobalErrorReporting(window)
    registerGlobalErrorReporting(window)

    expect(() => {
      window.dispatchEvent(new ErrorEvent('error', {
        error: new Error('user ava@x.com failed'),
        message: 'user ava@x.com failed',
      }))
      window.dispatchEvent(new Event('unhandledrejection'))
    }).not.toThrow()

    const reports = parseReports(consoleSpy)
    expect(reports.some((report) => report.code === 'unhandled_error')).toBe(true)
    expect(JSON.stringify(reports)).not.toContain('ava@x.com')
  })

  it('sanitizes long digit strings and JWTs in free text', () => {
    expect(sanitizeErrorText('card 4111111111111111 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signaturepartxx'))
      .not.toMatch(/4111111111111111|eyJhbGci/)
  })
})
