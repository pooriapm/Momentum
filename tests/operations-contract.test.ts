import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SUPPORT_ISSUE_CODES, supportMailtoHref } from '../src/v2/pages/app/me-state'

const contract = JSON.parse(readFileSync(path.join(process.cwd(), 'ops/contract.json'), 'utf8')) as {
  backup: { hostedRestoreStatus: string; projectRef: string }
  support: { locales: string[] }
}
const macros = JSON.parse(readFileSync(path.join(process.cwd(), 'ops/support-macros.json'), 'utf8')) as {
  macros: Array<{ id: string; fa: { subject: string; body: string }; en: { subject: string; body: string } }>
}

describe('operations contracts', () => {
  it('does not claim a hosted restore while staging is missing', () => {
    expect(contract.backup.hostedRestoreStatus).toBe('blocked_no_staging')
    expect(contract.backup.projectRef).toBe('osyvvzglvyonevkhdzpu')
    expect(contract.support.locales).toEqual(['fa', 'en'])
  })

  it('keeps every support macro bilingual and coded', () => {
    expect(macros.macros.length).toBeGreaterThanOrEqual(8)
    for (const macro of macros.macros) {
      expect(macro.fa.subject).toContain(macro.id)
      expect(macro.en.subject).toContain(macro.id)
      expect(macro.fa.body).toContain(macro.id)
      expect(macro.en.body).toContain(macro.id)
    }
  })

  it('exposes user-facing issue codes without inventing a mailbox', () => {
    expect(SUPPORT_ISSUE_CODES.map((issue) => issue.id)).toEqual([
      'PLAN-IMPORT-207',
      'GENERATION-FAILED',
      'SIGNOUT-17',
      'ACCOUNT-EXPORT',
      'ACCOUNT-DELETE',
      'SAFETY-BOUNDARY',
    ])
    expect(supportMailtoHref('support@example.com', 'en')).toBe(
      'mailto:support@example.com?subject=Momentum%20support',
    )
    expect(supportMailtoHref('support@example.com', 'fa', 'PLAN-IMPORT-207')).toContain(
      encodeURIComponent('پشتیبانی Momentum PLAN-IMPORT-207'),
    )
  })
})
