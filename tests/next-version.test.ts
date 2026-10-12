import { describe, expect, it } from 'vitest'
import { compareVersions, nextVersion } from '../scripts/ops/next-version.mjs'

describe('automatic versioning', () => {
  it('bumps the patch on every push', () => {
    expect(nextVersion('0.4.4', '0.4.4')).toBe('0.4.5')
    expect(nextVersion('0.4.9', '0.4.9')).toBe('0.4.10')
  })

  it('keeps a milestone that was raised by hand instead of bumping it again', () => {
    expect(nextVersion('0.5.0', '0.4.12')).toBe('0.5.0')
  })

  it('bumps when there is no earlier release tag', () => {
    expect(nextVersion('0.4.4', null)).toBe('0.4.5')
  })

  it('never reaches the reserved first user version automatically', () => {
    expect(() => nextVersion('0.9.0', '0.8.7')).toThrow(/reserved for the first user release/)
    expect(() => nextVersion('1.0.0', '0.8.7')).toThrow(/reserved/)
    expect(nextVersion('0.8.41', '0.8.41')).toBe('0.8.42')
  })

  it('allows 0.9.0 only when it is released deliberately', () => {
    expect(nextVersion('0.9.0', '0.8.7', { allowFirstUserVersion: true })).toBe('0.9.0')
  })

  it('compares versions numerically, not as text', () => {
    expect(compareVersions('0.4.10', '0.4.9')).toBeGreaterThan(0)
    expect(compareVersions('v0.5.0', '0.4.99')).toBeGreaterThan(0)
  })
})
