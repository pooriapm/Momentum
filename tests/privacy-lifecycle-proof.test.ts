import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_EXPORT_TABLES } from '../supabase/functions/account-data/privacy.ts'

const repoRoot = path.resolve(import.meta.dirname, '..')

function parseQuotedNames(source: string, pattern: RegExp): string[] {
  const match = source.match(pattern)
  if (!match) throw new Error(`Could not parse inventory with ${pattern}.`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]).sort()
}

describe('account export/delete completeness contracts', () => {
  it('keeps Edge export, SQL inventory, and the ops drill on the same owner tables', () => {
    const sqlTables = parseQuotedNames(
      fs.readFileSync(path.join(repoRoot, 'supabase/tests/database/account_privacy_drill.sql'), 'utf8'),
      /and c\.table_name not in \(([\s\S]*?)\)/,
    )
    const drillTables = parseQuotedNames(
      fs.readFileSync(path.join(repoRoot, 'scripts/ops/verify-privacy-lifecycle.mjs'), 'utf8'),
      /export const ACCOUNT_EXPORT_TABLES = \[([\s\S]*?)\]/,
    )
    expect([...ACCOUNT_EXPORT_TABLES].sort()).toEqual(sqlTables)
    expect(drillTables).toEqual(sqlTables)
  })

  it('deletes owned rows, including provider usage, before Auth identity deletion', () => {
    const accountData = fs.readFileSync(
      path.join(repoRoot, 'supabase/functions/account-data/index.ts'),
      'utf8',
    )
    expect(accountData).toMatch(
      /deleteAccountStorage\([\s\S]*purgeAccountOwnedRows\([\s\S]*deleteAccountIdentity/,
    )
    const migration = fs.readFileSync(
      path.join(repoRoot, 'supabase/migrations/202609030001_account_purge_owned_rows.sql'),
      'utf8',
    )
    expect(migration).toContain('delete from public.usage_ledger')
    expect(migration).toContain('delete from public.ai_generation_jobs')
    expect(migration).toContain('grant execute on function public.purge_account_owned_rows(uuid) to service_role')
    expect(migration).toMatch(/revoke all on function public\.purge_account_owned_rows\(uuid\)[\s\S]*from public, anon, authenticated/)
  })

  it('does not store provider generations and hashes the safety identifier', () => {
    const openai = fs.readFileSync(
      path.join(repoRoot, 'supabase/functions/_shared/openai.ts'),
      'utf8',
    )
    expect(openai).toContain('store: false')
    expect(openai).not.toMatch(/\bstore:\s*true\b/)
    expect(openai).toContain('hashedSafetyIdentifier')
    expect(openai).toContain('safety_identifier')
  })
})
