import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertAllowedOrigin,
  correlationId,
  corsHeaders,
  errorResponse,
  HttpError,
  jsonResponse,
  requireIdempotencyKey,
} from '../supabase/functions/_shared/http.ts'
import { productRegionFromCountry } from '../supabase/functions/_shared/jurisdiction.ts'
import { assertLiveOpenAiEnabled } from '../supabase/functions/_shared/openai.ts'
import { revokeAccountSessions } from '../supabase/functions/account-data/privacy.ts'

const repoRoot = path.resolve(import.meta.dirname, '..')

describe('jurisdiction and idempotency boundaries', () => {
  it('treats Iran as a served product region, not a geo-block', () => {
    expect(productRegionFromCountry('IR')).toBe('ir')
  })

  it('maps every other ISO country to the international payment route', () => {
    expect(productRegionFromCountry('US')).toBe('intl')
    expect(productRegionFromCountry('GB')).toBe('intl')
  })

  it('rejects missing, short, or unsafe idempotency keys', () => {
    for (const key of [undefined, 'short', 'unsafe key', 'x'.repeat(129)]) {
      const headers = key ? { 'Idempotency-Key': key } : undefined
      expect(() => requireIdempotencyKey(new Request('https://example.test', { headers })))
        .toThrow(expect.objectContaining({ code: 'invalid_idempotency_key' }))
    }
  })

  it('normalizes a valid idempotency key without changing its identity', () => {
    const request = new Request('https://example.test', {
      headers: { 'Idempotency-Key': '  revision:request-01  ' },
    })
    expect(requireIdempotencyKey(request)).toBe('revision:request-01')
  })
})

describe('privacy-safe Edge response contracts', () => {
  beforeEach(() => {
    vi.stubGlobal('Deno', {
      env: {
        get: (name: string) => name === 'ALLOWED_ORIGINS'
          ? 'https://momentum.pooria-pm.workers.dev,http://localhost:5173'
          : undefined,
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('allows only exact configured browser origins', () => {
    const allowed = new Request('https://api.example.test', {
      headers: { Origin: 'https://momentum.pooria-pm.workers.dev' },
    })
    const lookalike = new Request('https://api.example.test', {
      headers: { Origin: 'https://momentum.pooria-pm.workers.dev.attacker.test' },
    })

    expect(() => assertAllowedOrigin(allowed)).not.toThrow()
    expect(corsHeaders(allowed)).toMatchObject({
      'Access-Control-Allow-Origin': 'https://momentum.pooria-pm.workers.dev',
      Vary: 'Origin',
    })
    expect(() => assertAllowedOrigin(lookalike)).toThrow(expect.objectContaining({
      code: 'origin_not_allowed',
      status: 403,
    }))
    expect(corsHeaders(lookalike)).not.toHaveProperty('Access-Control-Allow-Origin')
  })

  it('preserves a safe caller correlation ID on successful responses', async () => {
    const request = new Request('https://example.test', {
      headers: { 'X-Request-ID': 'request:r1-auth-01' },
    })
    const response = jsonResponse(request, { ok: true })
    expect(response.headers.get('x-request-id')).toBe('request:r1-auth-01')
    expect(await response.json()).toEqual({ ok: true })
  })

  it('replaces unsafe correlation input with an opaque generated ID', () => {
    const request = new Request('https://example.test', {
      headers: { 'X-Request-ID': 'email=user@example.com health=private' },
    })
    const id = correlationId(request)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(id).not.toContain('@')
  })

  it('returns the same correlation ID in structured error headers and bodies', async () => {
    const request = new Request('https://example.test', {
      headers: { 'X-Request-ID': 'request:r1-error-01' },
    })
    const response = errorResponse(
      request,
      new HttpError(409, 'ownership_conflict', 'The requested resource is unavailable.'),
    )
    expect(response.status).toBe(409)
    expect(response.headers.get('x-request-id')).toBe('request:r1-error-01')
    expect(await response.json()).toEqual({
      error: {
        code: 'ownership_conflict',
        message: 'The requested resource is unavailable.',
        request_id: 'request:r1-error-01',
      },
    })
  })

  it('redacts unexpected error details while retaining an opaque correlation ID', async () => {
    const response = errorResponse(
      new Request('https://example.test'),
      new Error('user@example.com weighs 75kg'),
    )
    const body = await response.json() as {
      error: { code: string; message: string; request_id: string }
    }
    expect(response.status).toBe(500)
    expect(body.error.code).toBe('internal_error')
    expect(body.error.message).not.toContain('75kg')
    expect(body.error.request_id).toBe(response.headers.get('x-request-id'))
  })
})

describe('threat-model executable subset', () => {
  it('routes protected-function authentication through the shared exact-CORS handler', () => {
    const config = fs.readFileSync(path.join(repoRoot, 'supabase/config.toml'), 'utf8')
    for (const functionName of [
      'account-data',
      'account-settings',
      'checkins',
      'generate-monthly-plan',
    ]) {
      expect(config).toMatch(new RegExp(
        `\\[functions\\.${functionName}\\][\\s\\S]*?verify_jwt\\s*=\\s*false`,
      ))
      const entrypoint = fs.readFileSync(
        path.join(repoRoot, 'supabase/functions', functionName, 'index.ts'),
        'utf8',
      )
      expect(entrypoint).toMatch(/authenticate\(request\)/)
    }
  })

  it('does not expose region_blocked as a client product error', () => {
    const hits = grepDirectory(path.join(repoRoot, 'src'), /region_blocked/)
    expect(hits).toEqual([])
  })

  it('cannot persist or expose the retired AI-country gate', () => {
    expect(fs.existsSync(path.join(
      repoRoot,
      'supabase/functions/_shared/ai-market.ts',
    ))).toBe(false)
    const migration = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202608260001_non_regional_product_policy.sql',
    ), 'utf8')
    expect(migration).toContain('profiles_clear_legacy_ai_country_gate')
    expect(migration).toContain('new.ai_country_verified_at := null')
    const databaseFixes = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202608310003_database_contract_fixes.sql',
    ), 'utf8')
    expect(databaseFixes).toContain('e.source = \'subscription\'')
    expect(databaseFixes).toMatch(
      /revoke all on function private\.clear_legacy_ai_country_gate\(\)[\s\S]*from public, anon, authenticated/,
    )
    const accountData = fs.readFileSync(path.join(
      repoRoot,
      'supabase/functions/account-data/index.ts',
    ), 'utf8')
    expect(accountData).toContain("'ai_country_verified'")
  })

  it('does not register coach product routes', () => {
    const router = fs.readFileSync(path.join(repoRoot, 'src/v2/router/MomentumRouter.tsx'), 'utf8')
    expect(router).not.toMatch(/path=["'`][^"'`]*coach/i)
    expect(router).not.toMatch(/localizedPath\([^)]*coach/i)

    const functionNames = fs.readdirSync(path.join(repoRoot, 'supabase/functions'))
      .filter((name) => name !== '_shared' && !name.startsWith('.'))
    expect(functionNames).not.toContain('coach')

    const invokeHits = grepDirectory(path.join(repoRoot, 'src'), /functions\.invoke\(\s*['"]coach['"]/)
    expect(invokeHits).toEqual([])
  })

  it('keeps generate-monthly-plan as the provider-calling route', () => {
    const functionPath = path.join(repoRoot, 'supabase/functions/generate-monthly-plan/index.ts')
    expect(fs.existsSync(functionPath)).toBe(true)
    expect(fs.readFileSync(functionPath, 'utf8')).toContain('generate-monthly-plan')
    const clientHits = grepDirectory(path.join(repoRoot, 'src'), /functions\.invoke\(\s*['"]generate-monthly-plan['"]/)
    expect(clientHits.length).toBeGreaterThan(0)
  })

  it('fails closed when an active monthly plan cannot be projected completely', () => {
    const accountData = fs.readFileSync(path.join(
      repoRoot,
      'supabase/functions/account-data/index.ts',
    ), 'utf8')
    expect(accountData).toContain("dayCount !== 30")
    expect(accountData).toContain("days.length !== 30")
    expect(accountData).toContain("'plan_projection_invalid'")
  })

  it('enforces the complete 30-day monthly plan at the database boundary', () => {
    const migration = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202608310001_thirty_day_monthly_plan.sql',
    ), 'utf8')
    expect(migration).toContain('check (requested_days = 30) not valid')
    expect(migration).toContain('check (valid_to - valid_from = 29) not valid')
    expect(migration).toContain("jsonb_array_length(content -> 'days') = 30")
    expect(migration).toContain('{"day_index":29}')
    const progressMigration = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202608310002_exact_monthly_progress.sql',
    ), 'utf8')
    expect(progressMigration).toContain("interval '30 days'")
    expect(progressMigration).toContain('monthly_periods_enforce_thirty_day_window')
  })

  it('does not mark account deletion session revocation as successful after an auth failure', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { message: 'auth unavailable' } })
    await expect(revokeAccountSessions({
      auth: { admin: { signOut } },
    } as never, 'verified-access-token')).rejects.toMatchObject({
      code: 'account_delete_session_revoke_failed',
      status: 503,
    })
    expect(signOut).toHaveBeenCalledWith('verified-access-token', 'global')
  })

  it('keeps the live OpenAI helper disabled by default', () => {
    vi.stubGlobal('Deno', { env: { get: () => undefined } })
    try {
      expect(() => assertLiveOpenAiEnabled()).toThrow(expect.objectContaining({
        code: 'LIVE_OPENAI_DISABLED',
        status: 503,
      }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

function grepDirectory(rootDir: string, pattern: RegExp): string[] {
  const hits: string[] = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop() as string
    const stat = fs.statSync(current)
    if (stat.isDirectory()) {
      if (current.endsWith(`${path.sep}node_modules`)) continue
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry))
      continue
    }
    if (!stat.isFile()) continue
    pattern.lastIndex = 0
    if (pattern.test(fs.readFileSync(current, 'utf8'))) {
      hits.push(path.relative(repoRoot, current))
    }
  }
  return hits
}
