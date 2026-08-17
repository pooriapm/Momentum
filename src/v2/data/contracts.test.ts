import { describe, expect, it } from 'vitest'
import { generationResponseSchema } from './contracts'

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
})
