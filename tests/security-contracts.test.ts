import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { requireIdempotencyKey } from '../supabase/functions/_shared/http.ts'
import {
  assertAiJurisdiction,
  productRegionFromCountry,
} from '../supabase/functions/_shared/jurisdiction.ts'
import { assertLiveOpenAiHardDisabled } from '../supabase/functions/_shared/openai.ts'

const repoRoot = path.resolve(import.meta.dirname, '..')

describe('jurisdiction and idempotency boundaries', () => {
  it('treats Iran as a served product region, not a geo-block', () => {
    expect(productRegionFromCountry('IR')).toBe('ir')
    expect(() => assertAiJurisdiction('IR', '2026-08-09T00:00:00.000Z', 'admin_review'))
      .not.toThrow()
  })

  it('maps every other ISO country to the international product version', () => {
    expect(productRegionFromCountry('US')).toBe('intl')
    expect(productRegionFromCountry('GB')).toBe('intl')
  })

  it('still requires a complete billing-country verification tuple', () => {
    expect(() => assertAiJurisdiction('US', null, 'payment_provider'))
      .toThrow(expect.objectContaining({ code: 'verified_country_required', status: 409 }))
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

describe('threat-model executable subset', () => {
  it('does not expose region_blocked as a client product error', () => {
    const hits = grepDirectory(path.join(repoRoot, 'src'), /region_blocked/)
    expect(hits).toEqual([])
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

  it('keeps the live OpenAI helper hard-disabled', () => {
    expect(() => assertLiveOpenAiHardDisabled()).toThrow(expect.objectContaining({
      code: 'LIVE_OPENAI_DISABLED',
      status: 503,
    }))
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
