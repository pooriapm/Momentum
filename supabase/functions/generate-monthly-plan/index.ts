import { authenticate } from '../_shared/auth.ts'
import { integerEnv } from '../_shared/config.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  requireIdempotencyKey,
} from '../_shared/http.ts'
import { enforceAiCircuitBreaker, enforceRateLimit } from '../_shared/limits.ts'
import { createSupabaseGenerationStore } from '../_shared/monthly-generation-db.ts'
import { runMonthlyGeneration } from '../_shared/monthly-generation.ts'
import { assertProductEnrollmentAccess } from '../_shared/release-gates.ts'

interface GenerateBody {
  locale?: unknown
}

function parseLocale(value: unknown): 'fa-IR' | 'en-US' | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value === 'fa-IR' || value === 'en-US') return value
  throw new HttpError(400, 'invalid_locale', 'Locale must be fa-IR or en-US.')
}

function mapPipelineError(error: unknown): unknown {
  if (!(error instanceof HttpError)) return error
  if (error.code === 'consent_update_required') {
    return new HttpError(
      409,
      'CONSENT_REQUIRED',
      'Current terms, privacy policy, and health-data consent must be accepted.',
    )
  }
  if (error.code === 'authentication_required' || error.code === 'invalid_session') {
    return new HttpError(401, 'AUTH_REQUIRED', error.message)
  }
  return error
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)

  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST' && request.method !== 'GET') {
      throw new HttpError(405, 'method_not_allowed', 'Only GET and POST are supported.')
    }

    const auth = await authenticate(request)
    assertProductEnrollmentAccess(auth.user.id)
    const idempotencyKey = requireIdempotencyKey(request)
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      'generate-monthly-plan',
      integerEnv('PLAN_RATE_LIMIT', 3, { min: 1, max: 30 }),
      integerEnv('PLAN_RATE_WINDOW_SECONDS', 3600, { min: 60, max: 86_400 }),
    )

    const store = createSupabaseGenerationStore(auth.admin)
    let locale: 'fa-IR' | 'en-US' | undefined
    if (request.method === 'POST') {
      const body = await readJsonBody<GenerateBody>(request, 4_096)
      locale = parseLocale(body.locale)
    }

    if (request.method === 'GET') {
      const job = await store.findJobByIdempotency(auth.user.id, idempotencyKey)
      if (!job) {
        throw new HttpError(
          404,
          'generation_job_not_found',
          'No generation job exists for this key.',
        )
      }
      return jsonResponse(request, {
        job: { id: job.id, status: job.status, period_id: job.periodId },
        idempotent_replay: true,
      }, job.status === 'ready' ? 200 : 202)
    }

    const result = await runMonthlyGeneration({
      userId: auth.user.id,
      emailConfirmed: Boolean(auth.user.email_confirmed_at),
      idempotencyKey,
      locale,
      store,
      admin: auth.admin,
      enforceCapacity: () => enforceAiCircuitBreaker(auth.admin),
    })
    return jsonResponse(request, result.body, result.httpStatus)
  } catch (error) {
    return errorResponse(request, mapPipelineError(error))
  }
})
