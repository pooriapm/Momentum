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
    href: asSafeString(parsed.href, 180),
    stack: asSafeString(parsed.stack, MAX_STACK),
  }))

  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export default {
  async fetch(request: Request, env: AssetsEnv): Promise<Response> {
    const url = new URL(request.url)

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
