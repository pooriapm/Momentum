import { describe, expect, it } from 'vitest'
import { classifyAuthError } from './auth-errors'

describe('classifyAuthError', () => {
  it('keeps credential failures non-enumerating', () => {
    expect(classifyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }))
      .toBe('invalid_credentials')
  })

  it('surfaces verification, rate-limit, offline, and invalid-link states separately from generic errors', () => {
    expect(classifyAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe('unverified')
    expect(classifyAuthError({ code: 'over_email_send_rate_limit', message: 'rate limit', status: 429 })).toBe('rate_limited')
    expect(classifyAuthError(new Error('offline_mutation_blocked'))).toBe('offline')
    expect(classifyAuthError({ message: 'Auth session missing' })).toBe('invalid_link')
  })
})
