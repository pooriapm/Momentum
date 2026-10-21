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
import { generationFailure, runMonthlyGeneration } from '../_shared/monthly-generation.ts'
import { assertProductEnrollmentAccess } from '../_shared/release-gates.ts'

interface GenerateBody {
  locale?: unknown
}

/** Supabase's edge runtime: keeps the worker alive for work that outlives the response. */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined

function backgroundRunner(): ((promise: Promise<unknown>) => void) | null {
  return typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime?.waitUntil === 'function'
    ? (promise) => EdgeRuntime!.waitUntil(promise)
    : null
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
    // Status polls (GET) are cheap reads with their own, looser limit; only POST can start work.
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      request.method === 'GET' ? 'generate-monthly-plan:status' : 'generate-monthly-plan',
      request.method === 'GET'
        ? integerEnv('PLAN_STATUS_RATE_LIMIT', 600, { min: 10, max: 5_000 })
        : integerEnv('PLAN_RATE_LIMIT', 3, { min: 1, max: 30 }),
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
      if (job.status === 'failed') {
        // Same error the POST would have returned, so clients show the same message.
        return errorResponse(request, generationFailure(job))
      }
      return jsonResponse(request, {
        job: { id: job.id, status: job.status, period_id: job.periodId },
        idempotent_replay: true,
      }, job.status === 'ready' ? 200 : 202)
    }

    const work = runMonthlyGeneration({
      userId: auth.user.id,
      emailConfirmed: Boolean(auth.user.email_confirmed_at),
      idempotencyKey,
      locale,
      store,
      admin: auth.admin,
      enforceCapacity: () => enforceAiCircuitBreaker(auth.admin),
    })
    // Generation takes 30-90 s. Answer within PLAN_SYNC_WAIT_MS either way: fast outcomes and
    // errors come back directly; slower ones keep running in the background and the client polls
    // GET with the same Idempotency-Key. Without a background runtime (tests), wait for the end.
    const runInBackground = backgroundRunner()
    const waitMs = integerEnv('PLAN_SYNC_WAIT_MS', 20_000, { min: 1_000, max: 120_000 })
    let timer: ReturnType<typeof setTimeout> | undefined
    const finished = runInBackground
      ? await Promise.race([
        work.then((result) => ({ result })),
        new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), waitMs) }),
      ])
      : { result: await work }
    clearTimeout(timer)
    if (finished) return jsonResponse(request, finished.result.body, finished.result.httpStatus)

    runInBackground!(work.catch((error) => {
      // The job row already records the failure; log only the code.
      console.error(JSON.stringify({
        event: 'plan_generation_background_failed',
        code: error instanceof HttpError ? error.code : 'unexpected',
      }))
    }))
    const job = await store.findJobByIdempotency(auth.user.id, idempotencyKey)
    return jsonResponse(request, {
      job: job
        ? { id: job.id, status: job.status === 'ready' ? 'ready' : 'in_progress', period_id: job.periodId }
        : { status: 'in_progress' },
      idempotent_replay: true,
    }, 202)
  } catch (error) {
    return errorResponse(request, mapPipelineError(error))
  }
})
