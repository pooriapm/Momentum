import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '../src/v2/ui/primitives'
import '../src/styles/app.css'
import '../src/stories/product/product-spec.css'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const orbitCss = readFileSync(resolve(root, 'src/styles/orbit.css'), 'utf8')
const appCss = readFileSync(resolve(root, 'src/styles/app.css'), 'utf8')
const specCss = readFileSync(resolve(root, 'src/stories/product/product-spec.css'), 'utf8')
const handoff = readFileSync(resolve(root, 'docs/design/HANDOFF.md'), 'utf8')
const step4 = readFileSync(resolve(root, 'docs/design/STEP-4-RESPONSIVE-A11Y.md'), 'utf8')

function blockFor(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))
  return match?.[1] ?? ''
}

function minHeightRem(css: string, selector: string) {
  const value = blockFor(css, selector).match(/min-height:\s*([\d.]+)rem/i)?.[1]
  return value ? Number(value) : 0
}

describe('accessibility evidence', () => {
  it('keeps a keyboard :focus-visible ring on primary buttons', () => {
    render(<Button variant="primary">Start workout</Button>)
    const button = screen.getByRole('button', { name: 'Start workout' })
    button.focus()

    expect(button).toHaveClass('orbit-button--primary')
    expect(button).toHaveFocus()
    expect(['48px', '3rem']).toContain(getComputedStyle(button).minHeight)

    expect(appCss).toMatch(/button:focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus\)/)
    expect(orbitCss).toMatch(/:where\(a, button[\s\S]*\):focus-visible[\s\S]*outline:\s*3px solid var\(--color-focus\)/)
    expect(specCss).toMatch(/\.mo-spec button:focus-visible[\s\S]*outline:\s*3px solid var\(--spec-brand\)/)
  })

  it('keeps app navigation hit targets at least 44px', () => {
    expect(minHeightRem(orbitCss, '.app-sidebar nav a')).toBeGreaterThanOrEqual(2.75)
    expect(minHeightRem(orbitCss, '.app-bottom-nav a')).toBeGreaterThanOrEqual(2.75)
    expect(minHeightRem(specCss, '.mo-spec__tabbar button')).toBeGreaterThanOrEqual(2.75)
    expect(minHeightRem(specCss, '.mo-spec--sidebar > .mo-spec__rail button')).toBeGreaterThanOrEqual(2.75)
  })

  it('keeps the Storybook 200% zoom reflow specimen', () => {
    expect(specCss).toMatch(/\.mo-spec-zoom-200\s*\{[\s\S]*zoom:\s*2/)
    expect(specCss).toMatch(/\.mo-spec-zoom-200\s*\{[\s\S]*width:\s*50%/)
  })

  it('leaves Forced Colors as an owner exception, not Pass', () => {
    expect(handoff).toMatch(/Forced Colors: owner exception, \*\*not Pass\*\*/)
    expect(step4).toMatch(/Forced Colors \| Owner exception — \*\*not Pass\*\*/)
    expect(appCss).not.toMatch(/forced-colors:\s*active/)
    expect(orbitCss).not.toMatch(/forced-colors:\s*active/)
  })
})
