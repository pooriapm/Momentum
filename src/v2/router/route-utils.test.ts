import { describe, expect, it } from 'vitest'
import { localeFromPath, localizedPath, switchLocalePath } from './route-utils'

describe('localized routing', () => {
  it('keeps product routes locale-aware', () => {
    expect(localizedPath('fa', '/app/today')).toBe('/fa/app/today')
    expect(localeFromPath('/en/pricing')).toBe('en')
  })

  it('switches only the locale segment', () => {
    expect(switchLocalePath('/fa/app/coach', 'en')).toBe('/en/app/coach')
  })
})
