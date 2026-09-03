import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(import.meta.dirname, '..')

describe('private body-report retention contracts', () => {
  it('keeps a 30-day unconfirmed window and leaves confirmed measurements', () => {
    const migration = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202609030002_body_report_retention.sql',
    ), 'utf8')
    expect(migration).toContain("interval '30 days'")
    expect(migration).toContain("'pending', 'processing', 'needs_confirmation', 'failed'")
    expect(migration).toContain('grant execute on function public.purge_expired_body_reports() to service_role')
    expect(migration).toMatch(
      /revoke all on function public\.purge_expired_body_reports\(\)[\s\S]*from public, anon, authenticated/,
    )
    expect(migration).not.toContain("'confirmed'")
  })

  it('uploads private reports with a bounded MIME list and no shared cache', () => {
    const repository = fs.readFileSync(path.join(repoRoot, 'src/v2/onboarding/repository.ts'), 'utf8')
    expect(repository).toContain("cacheControl: 'private, max-age=0'")
    expect(repository).toContain('10 * 1024 * 1024')
    expect(repository).toContain("client.storage.from('body-composition').upload")
    expect(repository).toContain('discardBodyReport')
    const bucket = fs.readFileSync(path.join(
      repoRoot,
      'supabase/migrations/202607310001_initial_platform.sql',
    ), 'utf8')
    expect(bucket).toContain("file_size_limit, allowed_mime_types")
    expect(bucket).toContain('10485760')
    expect(bucket).toContain("'application/pdf', 'image/jpeg', 'image/png', 'image/webp'")
    expect(bucket).toContain('public = excluded.public')
  })

  it('wires the body-report drill into CI and the tracked ops contract', () => {
    const quality = fs.readFileSync(path.join(repoRoot, '.github/workflows/quality.yml'), 'utf8')
    expect(quality).toContain('npm run test:body-report')
    const operations = fs.readFileSync(path.join(repoRoot, 'supabase/R7-OPERATIONS.md'), 'utf8')
    expect(operations).toContain('npm run test:body-report')
    expect(fs.existsSync(path.join(repoRoot, 'scripts/ops/verify-body-report.mjs'))).toBe(true)
  })
})
