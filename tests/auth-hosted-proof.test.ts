import { describe, expect, it } from 'vitest'
import {
  HOSTED_API_URL,
  assertHostedAuthUrl,
  disposableProofEmail,
  hashedTokenFromGenerateLink,
  isRateLimitedError,
  isUnverifiedError,
  selectApiKeys,
} from '../scripts/ops/auth-proof-lib.mjs'

describe('hosted auth proof helpers', () => {
  it('accepts only the production Auth URL', () => {
    expect(() => assertHostedAuthUrl(HOSTED_API_URL)).not.toThrow()
    expect(() => assertHostedAuthUrl('https://example.supabase.co')).toThrow(/production project ref/)
  })

  it('reads hashed tokens without requiring the action link in logs', () => {
    expect(hashedTokenFromGenerateLink({
      properties: { hashed_token: 'abc123', action_link: 'https://example.test/?token=leak' },
    }, 'signup')).toBe('abc123')
    expect(hashedTokenFromGenerateLink({
      properties: {
        action_link: 'https://momentum.pooria-pm.workers.dev/en/auth/verify?token=from-link&type=signup',
      },
    }, 'signup')).toBe('from-link')
  })

  it('classifies unverified and rate-limited Auth errors', () => {
    expect(isUnverifiedError({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(true)
    expect(isRateLimitedError({ status: 429, code: 'over_email_send_rate_limit' })).toBe(true)
    expect(isRateLimitedError({ message: 'rate limit exceeded' })).toBe(true)
    expect(isRateLimitedError({ status: 400, message: 'invalid' })).toBe(false)
  })

  it('selects anon and service-role keys by name without exposing values in assertions', () => {
    const keys = selectApiKeys([
      { name: 'anon', api_key: 'anon-key-value' },
      { name: 'service_role', api_key: 'service-key-value' },
    ])
    expect(keys.anon).toHaveLength('anon-key-value'.length)
    expect(keys.serviceRole).toHaveLength('service-key-value'.length)
  })

  it('uses a real TLD for hosted disposable mailboxes', () => {
    expect(disposableProofEmail('freq', 'abc')).toBe('freq-abc@pooria-pm.workers.dev')
  })
})
