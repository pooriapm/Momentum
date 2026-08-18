import { describe, expect, it } from 'vitest'
import { generationResponseSchema, planHistoryItemSchema } from './contracts'

describe('Edge Function replay contracts', () => {
  it('accepts a plan-generation replay while the original request is running', () => {
    expect(generationResponseSchema.parse({
      job: { status: 'in_progress' },
      idempotent_replay: true,
    })).toEqual({ job: { status: 'in_progress' }, idempotent_replay: true })
  })

  it('does not accept a weekly days payload as the monthly generation contract', () => {
    expect(() => generationResponseSchema.parse({
      days: 7,
      locale: 'fa-IR',
    })).toThrow()
  })

  it('accepts a deterministic plan-history item for account-data', () => {
    expect(planHistoryItemSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      cycle: 2,
      valid_from: '2026-08-18',
      valid_to: '2026-09-16',
      ready_at: '2026-08-18T08:00:00.000Z',
      active: true,
      locale: 'fa-IR',
      catalog_release: 'momentum-core@v2',
      source: 'openai',
      schema_version: '1.2.0',
      changes: [
        { label: 'cycle 2 imported', detail: 'openai · locale fa-IR' },
        { label: 'catalog release', detail: 'momentum-core@v2' },
      ],
    }).active).toBe(true)
  })
})
