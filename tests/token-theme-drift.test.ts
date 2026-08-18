import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = JSON.parse(readFileSync(resolve(root, 'docs/design/tokens.json'), 'utf8')) as Record<string, unknown>
const themeCss = readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8')

type TokenNode = { value?: unknown; [key: string]: unknown }

function at(path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (
    node && typeof node === 'object' ? (node as TokenNode)[key] : undefined
  ), tokens)
}

function resolveToken(value: unknown, theme: 'light' | 'dark', seen = new Set<string>()): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const node = value as TokenNode
    if ('value' in node) return resolveToken(node.value, theme, seen)
    if (theme in node) return resolveToken(node[theme], theme, seen)
  }

  if (typeof value === 'string') {
    const alias = value.match(/^\{(.+)}$/)?.[1]
    if (alias && !seen.has(alias)) {
      seen.add(alias)
      return resolveToken(at(alias), theme, seen)
    }
  }

  return value
}

function hex(path: string, theme: 'light' | 'dark') {
  const value = resolveToken(at(path), theme)
  if (typeof value !== 'string' || !/^#[\da-f]{3,8}$/i.test(value)) {
    throw new Error(`Expected a hex color at ${path} (${theme}), received ${String(value)}`)
  }
  return value.toLowerCase()
}

function declaredValues(css: string, property: string) {
  return [...css.matchAll(new RegExp(`${property}\\s*:\\s*([^;]+);`, 'gi'))]
    .map((match) => match[1].trim().toLowerCase().replace(/\s+/g, ''))
}

const SUPERSEDED_ACCENT = [
  '#4bd69a',
  '#087a5b',
  '#25ad73',
  '#72e5af',
  '#777bff',
  '#5b5fef',
  '#5559dc',
  '#4145c5',
  '#4b4fcf',
  '#9b70ff',
  '#7f51e8',
  '#f49378',
  '#d9684b',
  '#6366f1',
  '#7c3aed',
]

describe('Human Strength production theme drift', () => {
  it('maps canonical brand and energy hexes into theme.css', () => {
    const brandDark = hex('color.semantic.action.primary', 'dark')
    const brandLight = hex('color.semantic.action.primary', 'light')
    const energyDark = hex('color.semantic.energy.primary', 'dark')
    const energyLight = hex('color.semantic.energy.primary', 'light')
    const canvasDark = hex('color.semantic.background.canvas', 'dark')
    const canvasLight = hex('color.semantic.background.canvas', 'light')
    const textDark = hex('color.semantic.text.primary', 'dark')
    const textLight = hex('color.semantic.text.primary', 'light')

    expect(themeCss.toLowerCase()).toContain(brandDark)
    expect(themeCss.toLowerCase()).toContain(brandLight)
    expect(themeCss.toLowerCase()).toContain(energyDark)
    expect(themeCss.toLowerCase()).toContain(energyLight)
    expect(themeCss.toLowerCase()).toContain(canvasDark)
    expect(themeCss.toLowerCase()).toContain(canvasLight)
    expect(themeCss.toLowerCase()).toContain(textDark)
    expect(themeCss.toLowerCase()).toContain(textLight)

    expect(brandDark).toBe('#e0a3c8')
    expect(brandLight).toBe('#73395f')
    expect(energyDark).toBe('#ff9a73')
    expect(energyLight).toBe('#b95332')
  })

  it('keeps --color-accent on Human Strength plum, not mint or indigo/violet/coral', () => {
    const accents = declaredValues(themeCss, '--color-accent')
    expect(accents.length).toBeGreaterThanOrEqual(2)
    expect(accents).toContain('#e0a3c8')
    expect(accents).toContain('#73395f')

    for (const value of accents) {
      expect(SUPERSEDED_ACCENT).not.toContain(value)
    }

    expect(themeCss.toLowerCase()).not.toMatch(/--color-accent:\s*#4bd69a/i)
  })
})
