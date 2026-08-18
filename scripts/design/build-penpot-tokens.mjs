import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const sourcePath = resolve('docs/design/tokens.json')
const outputPath = resolve('docs/design/penpot/momentum.tokens.json')
const source = JSON.parse(await readFile(sourcePath, 'utf8'))

const modes = source.meta?.modes
if (JSON.stringify(modes) !== JSON.stringify(['light', 'dark'])) {
  throw new Error(`Penpot export requires exactly light and dark modes; received ${JSON.stringify(modes)}`)
}

const isToken = (value) => value && typeof value === 'object' && 'type' in value && 'value' in value

const normalizeValue = (type, value) => {
  if (typeof value === 'string' && value.startsWith('{')) return value
  if (type === 'dimension' && typeof value === 'number') return `${value}px`
  if (type === 'duration' && typeof value === 'number') return `${value}ms`
  if (type === 'fontFamily' && Array.isArray(value)) return value.join(', ')
  return value
}

const toDtcg = (token, value = token.value, type = token.type) => ({
  $value: normalizeValue(type, value),
  $type: type,
  ...(token.description ? { $description: token.description } : {}),
})

const mapTree = (value, selectValue) => Object.fromEntries(
  Object.entries(value).map(([key, child]) => [
    key,
    isToken(child)
      ? toDtcg(child, selectValue(child))
      : mapTree(child, selectValue),
  ]),
)

const scalarTree = (value) => mapTree(value, (token) => token.value)
const modeTree = (value, mode) => mapTree(value, (token) => token.value[mode])

const typography = scalarTree({
  fontFamily: source.typography.fontFamily,
  weight: source.typography.weight,
})

typography.role = { fa: {}, en: {} }
for (const [role, token] of Object.entries(source.typography.role)) {
  for (const locale of ['fa', 'en']) {
    const { size, lineHeight, weight } = token.value
    typography.role[locale][role] = {
      $type: 'typography',
      $value: {
        fontFamily: `{typography.fontFamily.${locale}}`,
        fontSize: `${size}px`,
        fontWeight: weight,
        letterSpacing: '0px',
        lineHeight: `${lineHeight}px`,
      },
      $description: `${token.description} — ${locale.toUpperCase()}`,
    }
  }
}

const modeEffects = (mode) => {
  const effects = { shadow: modeTree(source.shadow, mode), material: {} }

  for (const [name, token] of Object.entries(source.material)) {
    const value = token.value[mode]
    effects.material[name] = {
      fill: toDtcg(token, value.fill, 'color'),
      blur: toDtcg(token, value.blur, 'dimension'),
      saturation: toDtcg(token, value.saturation, 'number'),
      border: toDtcg(token, value.border, 'color'),
      shadow: toDtcg(token, value.shadow, 'shadow'),
      opaqueFallback: toDtcg(token, value.opaqueFallback, 'color'),
    }
  }

  return effects
}

const commonSets = [
  'Core/Color Primitives',
  'Core/Foundations',
  'Core/Layout',
  'Core/Components',
  'Core/Typography',
  'Core/Motion',
]

const document = {
  'Core/Color Primitives': { color: { primitive: scalarTree(source.color.primitive) } },
  'Core/Foundations': {
    space: scalarTree(source.space),
    radius: scalarTree(source.radius),
  },
  'Core/Layout': { layout: scalarTree(source.layout) },
  'Core/Components': { component: scalarTree(source.component) },
  'Core/Typography': { typography },
  'Core/Motion': { motion: scalarTree(source.motion) },
  'Theme/Light/Colors': { color: { semantic: modeTree(source.color.semantic, 'light') } },
  'Theme/Dark/Colors': { color: { semantic: modeTree(source.color.semantic, 'dark') } },
  'Theme/Light/Effects': modeEffects('light'),
  'Theme/Dark/Effects': modeEffects('dark'),
  $themes: [
    {
      name: 'Light',
      group: 'Momentum / Mode',
      selectedTokenSets: Object.fromEntries([
        ...commonSets.map((name) => [name, 'source']),
        ['Theme/Light/Colors', 'enabled'],
        ['Theme/Light/Effects', 'enabled'],
      ]),
    },
    {
      name: 'Dark',
      group: 'Momentum / Mode',
      selectedTokenSets: Object.fromEntries([
        ...commonSets.map((name) => [name, 'source']),
        ['Theme/Dark/Colors', 'enabled'],
        ['Theme/Dark/Effects', 'enabled'],
      ]),
    },
  ],
  $metadata: {
    tokenSetOrder: [
      ...commonSets,
      'Theme/Light/Colors',
      'Theme/Dark/Colors',
      'Theme/Light/Effects',
      'Theme/Dark/Effects',
    ],
    activeThemes: ['Light'],
    activeSets: commonSets,
    source: 'docs/design/tokens.json',
    sourceSchemaVersion: source.meta.schemaVersion,
  },
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`)

console.log(`Wrote ${outputPath}`)
