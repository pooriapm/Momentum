import { describe, expect, it } from 'vitest'
import { localeFromPath, localizedPath, switchLocalePath } from './route-utils'
import { isMembershipRequiredTab, isSetupAllowedTab, postOnboardingPath } from '../entitlement'

describe('localized routing', () => {
  it('keeps product routes locale-aware', () => {
    expect(localizedPath('fa', '/app/today')).toBe('/fa/app/today')
    expect(localeFromPath('/en/pricing')).toBe('en')
  })

  it('switches only the locale segment', () => {
    expect(switchLocalePath('/fa/app/plan', 'en')).toBe('/en/app/plan')
  })

  it('keeps Me as setup and Today as the post-review landing', () => {
    expect(isSetupAllowedTab('me')).toBe(true)
    expect(isMembershipRequiredTab('today')).toBe(true)
    expect(postOnboardingPath('en')).toBe('/en/app/today')
  })
})
