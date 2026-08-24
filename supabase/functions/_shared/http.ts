import { optionalEnv } from './config.ts'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export function correlationId(request: Request): string {
  const supplied = request.headers.get('x-request-id')?.trim() ?? ''
  return REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID()
}

function configuredOrigins(): Set<string> {
  return new Set(
    (optionalEnv('ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  if (!origin) return

  const allowed = configuredOrigins()
  if (!allowed.has(origin)) {
    throw new HttpError(403, 'origin_not_allowed', 'Origin is not allowed.')
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  const allowed = configuredOrigins()
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, idempotency-key, x-client-info, x-momentum-client',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }

  if (origin && allowed.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export function optionsResponse(request: Request): Response {
  try {
    assertAllowedOrigin(request)
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  } catch (error) {
    return errorResponse(request, error)
  }
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers(corsHeaders(request))
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Request-ID', correlationId(request))
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value))
  return new Response(JSON.stringify(body), { status, headers })
}

export function errorResponse(request: Request, error: unknown): Response {
  const requestId = correlationId(request)
  if (error instanceof HttpError) {
    return jsonResponse(
      request,
      { error: { code: error.code, message: error.message, request_id: requestId } },
      error.status,
      { 'X-Request-ID': requestId },
    )
  }

  // Details are intentionally omitted. Edge logs must also avoid logging the
  // request body, prompt, authorization header, or health context.
  return jsonResponse(
    request,
    {
      error: {
        code: 'internal_error',
        message: 'The request could not be completed.',
        request_id: requestId,
      },
    },
    500,
    { 'X-Request-ID': requestId },
  )
}

export async function readJsonBody<T>(
  request: Request,
  maxBytes = 32_768,
): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Content-Type must be application/json.')
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, 'request_too_large', 'Request body is too large.')
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, 'request_too_large', 'Request body is too large.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body is not valid JSON.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'invalid_json_object', 'Request body must be a JSON object.')
  }
  return parsed as T
}

export function requireIdempotencyKey(request: Request): string {
  const value = request.headers.get('idempotency-key')?.trim() ?? ''
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new HttpError(
      400,
      'invalid_idempotency_key',
      'A valid Idempotency-Key header is required.',
    )
  }
  return value
}
