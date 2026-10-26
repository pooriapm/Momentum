const ALLOWED_ERROR_CODES = [
  'fatal_render',
  'unhandled_error',
  'unhandled_rejection',
  'auth_rate_limited',
] as const

const ALLOWED_REPORT_KEYS = [
  'event',
  'code',
  'message',
  'stack',
  'href',
  'env',
  'release',
  'request_id',
] as const

const MAX_BODY_BYTES = 8_192
const MAX_STACK = 1_200
const SENSITIVE_PATTERN = /(authorization|bearer\s+[a-z0-9._~+/=-]+|access_token|refresh_token|api[_-]?key|password|service_role|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi

type AllowedErrorCode = (typeof ALLOWED_ERROR_CODES)[number]
type AssetsEnv = { ASSETS: { fetch: (request: Request) => Promise<Response> } }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function isAllowedErrorCode(value: unknown): value is AllowedErrorCode {
  return typeof value === 'string' && (ALLOWED_ERROR_CODES as readonly string[]).includes(value)
}

function asSafeString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.length <= max ? value : value.slice(0, max)
}

export function sanitizeHref(value: unknown, max = 180): string {
  const raw = asSafeString(value, max * 2)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    url.search = ''
    url.hash = ''
    return asSafeString(`${url.origin}${url.pathname}`, max)
  } catch {
    return asSafeString(raw.replace(/[?#].*$/, '').replace(SENSITIVE_PATTERN, '[redacted]'), max)
  }
}

export function redactStack(value: unknown, max = MAX_STACK): string {
  const raw = asSafeString(value, max * 2)
  if (!raw) return ''
  return asSafeString(
    raw
      .replace(SENSITIVE_PATTERN, '[redacted]')
      .replace(/([?&][^=\s]+=)[^&\s]+/g, '$1[redacted]'),
    max,
  )
}

async function handleClientError(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ code: 'method_not_allowed' }, 405)
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse({ code: 'payload_too_large' }, 413)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return jsonResponse({ code: 'invalid_json' }, 400)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return jsonResponse({ code: 'invalid_json' }, 400)
  }

  if (!isAllowedErrorCode(parsed.code) || parsed.event !== parsed.code) {
    return jsonResponse({ code: 'unknown_event' }, 400)
  }

  if (parsed.message !== parsed.code) {
    return jsonResponse({ code: 'unsafe_message' }, 400)
  }

  const extraKeys = Object.keys(parsed).filter(
    (key) => !(ALLOWED_REPORT_KEYS as readonly string[]).includes(key),
  )
  if (extraKeys.length > 0) {
    return jsonResponse({ code: 'unknown_fields' }, 400)
  }

  console.log(JSON.stringify({
    event: parsed.code,
    code: parsed.code,
    env: asSafeString(parsed.env, 40),
    release: asSafeString(parsed.release, 40),
    request_id: asSafeString(parsed.request_id, 80),
    href: sanitizeHref(parsed.href, 180),
    stack: redactStack(parsed.stack, MAX_STACK),
  }))

  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export const CANONICAL_ORIGIN = 'https://momentumfit.ir'
const LEGACY_HOSTS = ['momentum.pooria-pm.workers.dev']

// The old service worker would keep serving the cached app on the legacy host,
// and a redirected sw.js is rejected by the browser, so it gets a script that
// unregisters itself and sends open tabs to the canonical origin.
const LEGACY_SERVICE_WORKER = `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      const url = new URL(client.url)
      client.navigate('${CANONICAL_ORIGIN}' + url.pathname + url.search + url.hash)
    }
  })())
})
`

function legacyHostResponse(url: URL): Response {
  if (url.pathname === '/sw.js') {
    return new Response(LEGACY_SERVICE_WORKER, {
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }
  return new Response(null, {
    status: 301,
    headers: {
      location: `${CANONICAL_ORIGIN}${url.pathname}${url.search}`,
      'cache-control': 'public, max-age=3600',
    },
  })
}

export default {
  async fetch(request: Request, env: AssetsEnv): Promise<Response> {
    const url = new URL(request.url)

    if (LEGACY_HOSTS.includes(url.hostname)) {
      return legacyHostResponse(url)
    }

    if (url.pathname === '/ops/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return jsonResponse({ code: 'method_not_allowed' }, 405)
      }
      return jsonResponse({
        service: 'momentum',
        status: 'ok',
        ops: {
          health: true,
          error_ingest: true,
        },
      })
    }

    if (url.pathname === '/ops/client-errors') {
      return handleClientError(request)
    }

    return env.ASSETS.fetch(request)
  },
}

export const OPS_ALLOWED_ERROR_CODES = ALLOWED_ERROR_CODES
