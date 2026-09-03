import { describe, expect, it } from 'vitest'
import { canonicalStateIds } from '../src/stories/product/coverage'

describe('canonical product inventory', () => {
  it('locks the post-D14 inventory at 137 unique state IDs', () => {
    const ids = canonicalStateIds()
    expect(ids).toHaveLength(137)
    expect(new Set(ids).size).toBe(137)
    expect(ids[0]).toBe('AUTH-01')
    expect(ids).toContain('ONB-29')
    expect(ids.at(-1)).toBe('TODAY-12')
  })
})
