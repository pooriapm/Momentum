import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { media } from '../src/design/tokens'
import { supersededIcons } from '../src/v2/ui/icons'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const tokensCss = read('src/styles/tokens.css')

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src', '.storybook'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((path) => path && existsSync(resolve(root, path)))
const isStory = (path: string) => path.startsWith('src/stories/') || /\.stories\.(css|tsx?)$/.test(path)
const productionCss = tracked.filter((path) => path.endsWith('.css') && !isStory(path) && path !== 'src/styles/tokens.css')
const sourceFiles = tracked.filter((path) => /\.(css|tsx?)$/.test(path))

function block(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`)
  return start < 0 ? '' : css.slice(start, css.indexOf('\n}', start))
}
function declared(css: string) {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]))
}
function declarations(css: string, property: RegExp) {
  const withoutFaces = css.replace(/@font-face\s*\{[^}]*\}/g, '')
  return [...withoutFaces.matchAll(new RegExp(`(?:^|[{;\\s])(${property.source})\\s*:\\s*([^;{}]+)`, 'g'))].map((match) => ({ property: match[1], value: match[2].trim() }))
}

const tokenProperties = declared(tokensCss)

describe('design tokens', () => {
  it('keeps the generated CSS and TS in step with docs/design/tokens.json', () => {
    const result = spawnSync(process.execPath, ['scripts/design/build-css-tokens.mjs', '--check'], { cwd: root, encoding: 'utf8' })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('maps the canonical Saffron & Ink colors into both themes', () => {
    const dark = block(tokensCss, ':root')
    const light = block(tokensCss, ':root[data-theme="light"]')
    expect(dark).toContain('--color-action: #f0a93b;')
    expect(light).toContain('--color-action: #a35e00;')
    expect(dark).toContain('--color-brand: #f0a93b;')
    expect(light).toContain('--color-brand: #a35e00;')
    expect(dark).toContain('--color-energy: #ff8a5c;')
    expect(light).toContain('--color-energy: #b5441a;')
    expect(dark).toContain('--color-background: #0e0d0b;')
    expect(light).toContain('--color-background: #f6f4f0;')
    expect(tokensCss).toContain('--color-food: var(--color-brand);')
    expect(tokensCss).toContain('--color-training: var(--color-energy);')
    for (const superseded of ['#4bd69a', '#087a5b', '#777bff', '#6366f1', '#7c3aed', '#9b70ff', '#e0a3c8']) {
      expect(tokensCss).not.toContain(superseded)
    }
  })

  it('resolves every var() in source to a declared custom property', () => {
    const local = new Set<string>()
    for (const path of sourceFiles) {
      const text = read(path)
      for (const name of declared(text)) local.add(name)
      for (const match of text.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)) local.add(match[1])
      for (const match of text.matchAll(/['"](--[\w-]+)['"]\s*:/g)) local.add(match[1])
    }
    const missing = sourceFiles.flatMap((path) =>
      [...read(path).matchAll(/var\((--[\w-]+)(?![\w$-])(\s*,)?/g)]
        .filter((match) => !match[2] && !local.has(match[1]))
        .map((match) => `${path}: ${match[1]}`),
    )
    expect(missing).toEqual([])
  })

  it('declares token properties only in tokens.css', () => {
    // The one sanctioned override: more contrast promotes muted text and borders.
    const allowed = /@media \(prefers-contrast: more\)\s*\{\s*:root:root \{[^}]*\}/g
    const offenders = productionCss.flatMap((path) =>
      [...declared(read(path).replace(allowed, ''))].filter((name) => tokenProperties.has(name)).map((name) => `${path}: ${name}`),
    )
    expect(offenders).toEqual([])
  })

  it('keeps production CSS on the type, weight, radius and layer scales', () => {
    const offenders: string[] = []
    for (const path of productionCss) {
      const css = read(path)
      for (const { value } of declarations(css, /font-size/)) {
        if (!/^(var\(--text-[\w-]+\)|inherit|\d*\.?\d+em|\d+%)( !important)?$/.test(value)) offenders.push(`${path}: font-size ${value}`)
      }
      for (const { value } of declarations(css, /font-weight/)) {
        if (!/^(var\(--weight-\w+\)|inherit|normal|bold)$/.test(value)) offenders.push(`${path}: font-weight ${value}`)
      }
      for (const { property, value } of declarations(css, /border(?:-[a-z]+)*-radius/)) {
        for (const part of value.split(/\s+(?![^(]*\))/)) {
          const px = /^(\d*\.?\d+)(rem|px)$/.exec(part)
          const brandShape = px && (px[2] === 'rem' ? Number(px[1]) * 16 : Number(px[1])) > 28
          if (!/^(var\(--radius-\w+\)|0|50%|inherit|\/)$/.test(part) && !brandShape) offenders.push(`${path}: ${property} ${value}`)
        }
      }
      for (const { value } of declarations(css, /z-index/)) {
        const n = Number(value)
        if (!(value.startsWith('var(--z-') || (Number.isInteger(n) && n < 10))) offenders.push(`${path}: z-index ${value}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps spacing on the 4pt scale apart from hairlines and page clearances', () => {
    const offenders: string[] = []
    for (const path of productionCss) {
      for (const { property, value } of declarations(read(path), /padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?|gap|row-gap|column-gap/)) {
        const bare = value.replace(/(var|env)\([^()]*(\([^()]*\))?[^()]*\)/g, '')
        for (const match of bare.matchAll(/(?<![\w.-])(\d*\.?\d+)(rem|px)\b/g)) {
          const px = match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1])
          if (px >= 2 && px <= 48) offenders.push(`${path}: ${property} ${value}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('draws each concept with one icon: superseded Lucide names are not imported', () => {
    const offenders = sourceFiles.filter((path) => path.endsWith('.tsx')).flatMap((path) => {
      const imports = [...read(path).matchAll(/import \{([^}]+)\} from ['"]lucide-react['"]/g)].flatMap((match) => match[1].split(',').map((name) => name.trim()))
      return imports.filter((name) => name in supersededIcons).map((name) => `${path}: ${name} → ${supersededIcons[name as keyof typeof supersededIcons]}`)
    })
    expect(offenders).toEqual([])
  })

  it('uses only the window-class breakpoints in media queries', () => {
    const allowed = new Set(Object.values(media))
    const offenders = productionCss.flatMap((path) =>
      [...read(path).matchAll(/\((?:max|min)-width:\s*[^)]+\)/g)].map((match) => match[0]).filter((query) => !allowed.has(query as never)).map((query) => `${path}: ${query}`),
    )
    expect(offenders).toEqual([])
  })
})
