// Generates src/styles/tokens.css and src/design/tokens.ts from docs/design/tokens.json.
// `node scripts/design/build-css-tokens.mjs --check` exits 1 when the generated files are stale.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SOURCE = 'docs/design/tokens.json'
const CSS_OUT = 'src/styles/tokens.css'
const TS_OUT = 'src/design/tokens.ts'

const isToken = (node) => node && typeof node === 'object' && 'type' in node && 'value' in node
const kebab = (key) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
const rem = (px) => (px === 0 ? '0' : `${+(px / 16).toFixed(4)}rem`)

export function buildTokens(source) {
  const byPath = new Map()
  const walk = (node, path) => {
    for (const [key, child] of Object.entries(node)) {
      const next = path ? `${path}.${key}` : key
      if (isToken(child)) byPath.set(next, child)
      else if (child && typeof child === 'object' && !Array.isArray(child)) walk(child, next)
    }
  }
  walk(source, '')

  const aliasOf = (value) => (typeof value === 'string' ? /^\{(.+)\}$/.exec(value)?.[1] : undefined)

  // Resolve a raw value to CSS. An alias of a token that has its own property stays a var() so relations survive.
  function css(token, raw, mode, seen = new Set()) {
    const alias = aliasOf(raw)
    if (alias) {
      const target = byPath.get(alias)
      if (!target) throw new Error(`Unknown alias {${alias}}`)
      if (seen.has(alias)) throw new Error(`Alias cycle at {${alias}}`)
      seen.add(alias)
      if (target.css) return `var(${target.css})`
      return css(target, pick(target.value, mode), mode, seen)
    }
    switch (token.type) {
      case 'color': return String(raw).toLowerCase()
      case 'dimension': return typeof raw === 'number' ? (token.css?.startsWith('--radius-pill') ? `${raw}px` : rem(raw)) : String(raw)
      case 'duration': return `${raw}ms`
      case 'cubicBezier': return `cubic-bezier(${raw.join(', ')})`
      case 'fontWeight':
      case 'number': return String(raw)
      case 'fontFamily': return raw.map((name) => (/\s/.test(name) && !name.startsWith('-') ? `"${name}"` : name)).join(', ')
      case 'shadow': return (Array.isArray(raw) ? raw : [raw]).map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color.toLowerCase()}`).join(', ')
      default: throw new Error(`No CSS rule for type ${token.type}`)
    }
  }
  function pick(value, mode) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !('x' in value)) {
      if (mode && mode in value) return value[mode]
      return value.dark ?? value.expanded ?? value.fa ?? Object.values(value)[0]
    }
    return value
  }
  const modesOf = (token) => (token.value && typeof token.value === 'object' && !Array.isArray(token.value) && !('x' in token.value) ? Object.keys(token.value) : [])

  const blocks = { base: [], dark: [], light: [], fa: [], en: [], medium: [], compact: [] }
  const seenProps = new Set()
  for (const [path, token] of byPath) {
    if (!token.css) continue
    if (seenProps.has(token.css)) throw new Error(`${token.css} declared twice (${path})`)
    seenProps.add(token.css)
    const modes = modesOf(token)
    if (modes.includes('light') || modes.includes('dark')) {
      blocks.dark.push([token.css, css(token, pick(token.value, 'dark'), 'dark')])
      const light = css(token, pick(token.value, 'light'), 'light')
      if (light !== blocks.dark.at(-1)[1] || aliasOf(token.value.light)) blocks.light.push([token.css, light])
    } else if (modes.includes('expanded')) {
      blocks.base.push([token.css, css(token, token.value.expanded)])
      blocks.medium.push([token.css, css(token, token.value.medium)])
      blocks.compact.push([token.css, css(token, token.value.compact)])
    } else if (modes.includes('fa')) {
      blocks.fa.push([token.css, css(token, token.value.fa)])
      blocks.en.push([token.css, css(token, token.value.en)])
      blocks.base.push([token.css, css(token, token.value.fa)])
    } else {
      blocks.base.push([token.css, css(token, token.value)])
    }
  }

  // Type roles become size and line-height pairs.
  for (const [name, token] of Object.entries(source.typography.role)) {
    const { size, lineHeight } = token.value
    blocks.base.push([`--text-${kebab(name)}`, rem(size)])
    blocks.base.push([`--leading-${kebab(name)}`, String(+(lineHeight / size).toFixed(3))])
  }

  // Fluid sizes grow linearly between two viewport widths and clamp at both ends.
  for (const [name, token] of Object.entries(source.typography.fluid ?? {})) {
    const { min, max, fromViewport, toViewport } = token.value
    const slope = (max - min) / (toViewport - fromViewport)
    const base = min - slope * fromViewport
    blocks.base.push([`--text-${kebab(name)}`, `clamp(${rem(min)}, ${+(base / 16).toFixed(4)}rem + ${+(slope * 100).toFixed(4)}vw, ${rem(max)})`])
  }

  // Families: digits-first stacks so numbers render in Vazirmatn in both languages.
  const family = source.typography.fontFamily
  const stack = (...names) => css({ type: 'fontFamily' }, names.flatMap((n) => family[n].value))
  blocks.base.push(['--font-app', stack('digits', 'fa')], ['--font-latin', stack('digits', 'en')])
  blocks.fa.push(['--font-app', stack('digits', 'fa')])
  blocks.en.push(['--font-app', stack('digits', 'en')])

  const bp = source.layout.breakpoint
  const maxQuery = (px) => `(max-width: ${+((px - 0.16) / 16).toFixed(2)}rem)`
  const minQuery = (px) => `(min-width: ${+(px / 16).toFixed(4)}rem)`
  const media = {
    narrow: maxQuery(bp.narrow.value),
    compact: maxQuery(bp.medium.value),
    mediumDown: maxQuery(bp.expanded.value),
    expandedDown: maxQuery(bp.large.value),
    mediumUp: minQuery(bp.medium.value),
    expandedUp: minQuery(bp.expanded.value),
    largeUp: minQuery(bp.large.value),
  }

  const decls = (list, indent = '  ') => list.map(([k, v]) => `${indent}${k}: ${v};`).join('\n')
  const cssText = `/* Generated from ${SOURCE} by scripts/design/build-css-tokens.mjs. Do not edit: change the JSON and run npm run design:tokens. */

/* Dark is the default theme. */
:root {
${decls(blocks.base)}
${decls(blocks.dark)}
  color-scheme: dark;
}

:root.light,
:root[data-theme="light"] {
${decls(blocks.light)}
  color-scheme: light;
}

/* Language modes also apply to isolated story roots. */
:root:lang(fa),
[lang="fa"] {
${decls(blocks.fa)}
}

:root:lang(en),
[lang="en"] {
${decls(blocks.en)}
}

/* Window classes: compact < ${bp.medium.value}px ≤ medium < ${bp.expanded.value}px ≤ expanded. */
@media ${media.mediumDown} {
  :root {
${decls(blocks.medium, '    ')}
  }
}

@media ${media.compact} {
  :root {
${decls(blocks.compact, '    ')}
  }
}
`

  const z = Object.fromEntries(Object.entries(source.zIndex).map(([k, v]) => [k, v.value]))
  const duration = Object.fromEntries(Object.entries(source.motion.duration).map(([k, v]) => [k, v.value]))
  const ts = (obj) => ['{', ...Object.entries(obj).map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`), '}'].join('\n')
  const tsText = `// Generated from ${SOURCE} by scripts/design/build-css-tokens.mjs. Do not edit.

/** Media queries for the window classes. CSS uses the same strings; tests keep them in step. */
export const media = ${ts(media)} as const

export const zIndex = ${ts(z)} as const

/** Milliseconds. */
export const duration = ${ts(duration)} as const
`
  return { cssText, tsText, media }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const source = JSON.parse(readFileSync(resolve(root, SOURCE), 'utf8'))
  const { cssText, tsText } = buildTokens(source)
  const outputs = [[CSS_OUT, cssText], [TS_OUT, tsText]]
  if (process.argv.includes('--check')) {
    const stale = outputs.filter(([file, text]) => {
      try { return readFileSync(resolve(root, file), 'utf8') !== text } catch { return true }
    })
    if (stale.length) {
      console.error(`Stale: ${stale.map(([f]) => f).join(', ')}. Run npm run design:tokens.`)
      process.exit(1)
    }
  } else {
    for (const [file, text] of outputs) writeFileSync(resolve(root, file), text)
    console.log(`Wrote ${outputs.map(([f]) => f).join(', ')}`)
  }
}
