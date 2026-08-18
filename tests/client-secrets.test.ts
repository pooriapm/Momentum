import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  collectForbiddenMatches,
  isExcludedSecretScanPath,
} from '../scripts/ops/scan-secrets.mjs'

const repoRoot = path.resolve(import.meta.dirname, '..')
const srcRoot = path.join(repoRoot, 'src')

describe('client secret literals', () => {
  it('does not embed sk-, service_role, or OPENAI_API_KEY= in src/', () => {
    expect(isExcludedSecretScanPath(path.join(repoRoot, 'supabase/.env.example'))).toBe(true)
    expect(isExcludedSecretScanPath(path.join(repoRoot, '.env.example'))).toBe(true)

    const matches = collectForbiddenMatches(srcRoot)
    expect(matches, formatMatches(matches)).toEqual([])
  })

  it('keeps example env files out of the client scan roots', () => {
    expect(fs.existsSync(path.join(repoRoot, 'supabase/.env.example'))).toBe(true)
    expect(srcRoot.includes(`${path.sep}src`)).toBe(true)
    expect(collectForbiddenMatches(srcRoot).some((match) => match.file.endsWith('.env.example'))).toBe(false)
  })
})

function formatMatches(matches: Array<{ file: string; pattern: string }>) {
  if (matches.length === 0) return 'no forbidden literals'
  return matches
    .map((match) => `${path.relative(repoRoot, match.file)}: ${match.pattern}`)
    .join('\n')
}
