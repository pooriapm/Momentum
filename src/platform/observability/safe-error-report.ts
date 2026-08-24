import { APP_CONFIG } from '../../config/app'
import { runtimeConfig } from '../config/runtime'

export const SAFE_ERROR_CODES = [
  'fatal_render',
  'unhandled_error',
  'unhandled_rejection',
  'auth_rate_limited',
] as const

export type SafeErrorCode = (typeof SAFE_ERROR_CODES)[number]

export type SafeErrorReport = {
  event: SafeErrorCode
  code: SafeErrorCode
  message: string
  stack: string
  href: string
  env: string
  release: string
  request_id: string
}

const MAX_MESSAGE = 180
const MAX_STACK = 1200
const REGISTERED_FLAG = '__momentumSafeErrorReporting'

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const BEARER_RE = /\b(?:bearer|token)\s+[A-Za-z0-9._\-+=/]+/gi
const LONG_DIGITS_RE = /\d{8,}/g
const ABSOLUTE_URL_RE = /\bhttps?:\/\/[^\s)'"<>]+/gi
const RELATIVE_QUERY_RE = /(\/[A-Za-z0-9@._/~+-]+)\?[^\s)'"<>]*/g

let reporting = false

function isSafeErrorCode(value: string): value is SafeErrorCode {
  return (SAFE_ERROR_CODES as readonly string[]).includes(value)
}

function stripUrlSecrets(raw: string): string {
  try {
    const url = new URL(raw)
    return `${url.origin}${url.pathname}`
  } catch {
    return raw.split(/[?#]/, 1)[0] ?? raw
  }
}

export function sanitizeErrorText(value: string): string {
  return value
    .replace(ABSOLUTE_URL_RE, stripUrlSecrets)
    .replace(RELATIVE_QUERY_RE, '$1')
    .replace(EMAIL_RE, '[redacted]')
    .replace(JWT_RE, '[redacted]')
    .replace(BEARER_RE, '[redacted]')
    .replace(LONG_DIGITS_RE, '[redacted]')
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

function currentHref(): string {
  if (typeof window === 'undefined') return '/'
  try {
    const url = new URL(window.location.href)
    return `${url.origin}${url.pathname}`
  } catch {
    return '/'
  }
}

function readErrorStack(error: unknown): string {
  if (error instanceof Error) {
    // The first line repeats Error.message and may contain arbitrary health or
    // plan text. Keep only stack frames; event codes carry the safe diagnosis.
    return (error.stack || '').split('\n').slice(1).join('\n')
  }
  return ''
}

export function buildSafeErrorReport(input: {
  code: string
  error?: unknown
}): SafeErrorReport | null {
  if (!isSafeErrorCode(input.code)) return null

  const stack = readErrorStack(input.error)
  return {
    event: input.code,
    code: input.code,
    message: truncate(input.code, MAX_MESSAGE),
    stack: truncate(sanitizeErrorText(stack), MAX_STACK),
    href: currentHref(),
    env: String(runtimeConfig.appEnvironment || 'unknown'),
    release: APP_CONFIG.version,
    request_id: crypto.randomUUID(),
  }
}

function resolveSameOriginIngestUrl(): string | null {
  const raw = runtimeConfig.errorIngestUrl
  if (!raw || typeof window === 'undefined') return null

  try {
    const url = new URL(raw, window.location.origin)
    url.username = ''
    url.password = ''
    if (url.origin !== window.location.origin) return null
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

function postSafeErrorReport(payload: SafeErrorReport): void {
  const ingestUrl = resolveSameOriginIngestUrl()
  if (!ingestUrl || typeof fetch !== 'function') return

  void fetch(ingestUrl, {
    method: 'POST',
    mode: 'same-origin',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}

export function reportSafeError(input: { code: string; error?: unknown }): void {
  if (reporting) return
  reporting = true
  try {
    const payload = buildSafeErrorReport(input)
    if (!payload) return
    console.error(JSON.stringify(payload))
    postSafeErrorReport(payload)
  } catch {
    // Reporting must never throw back into the app or the window error loop.
  } finally {
    reporting = false
  }
}

type ErrorReportingWindow = Window & { [REGISTERED_FLAG]?: boolean }

export function registerGlobalErrorReporting(target: Window = window): void {
  const scoped = target as ErrorReportingWindow
  if (scoped[REGISTERED_FLAG]) return
  scoped[REGISTERED_FLAG] = true

  target.addEventListener('error', (event) => {
    const errorEvent = event as ErrorEvent
    reportSafeError({
      code: 'unhandled_error',
      error: errorEvent.error instanceof Error ? errorEvent.error : errorEvent.message,
    })
  })

  target.addEventListener('unhandledrejection', (event) => {
    const rejection = event as PromiseRejectionEvent
    reportSafeError({
      code: 'unhandled_rejection',
      error: rejection.reason,
    })
  })
}
