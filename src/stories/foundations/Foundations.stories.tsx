import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import tokenSource from '../../../docs/design/tokens.json?raw'
import './Foundations.css'

type Theme = 'light' | 'dark'
type TokenValue = string | number | string[] | Record<string, unknown>

interface TokenLeaf {
  type: string
  value: TokenValue
  description?: string
}

interface TokenTree {
  [key: string]: TokenTree | TokenLeaf
}

interface MomentumTokens extends TokenTree {
  color: TokenTree & {
    primitive: TokenTree
    semantic: TokenTree
  }
  radius: TokenTree
  space: TokenTree
  typography: TokenTree & {
    fontFamily: TokenTree
    role: TokenTree
    weight: TokenTree
  }
}

const tokens = JSON.parse(tokenSource) as MomentumTokens

function isTokenLeaf(value: TokenTree | TokenLeaf): value is TokenLeaf {
  return 'type' in value && 'value' in value
}

function tokenAt(path: string): TokenLeaf {
  const parts = path.split('.')
  let current: TokenTree | TokenLeaf = tokens

  for (const part of parts) {
    if (isTokenLeaf(current) || !(part in current)) {
      throw new Error(`Unknown Momentum token: ${path}`)
    }

    current = current[part]
  }

  if (!isTokenLeaf(current)) {
    throw new Error(`Momentum token path is not a leaf: ${path}`)
  }

  return current
}

function resolveAlias(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const match = value.match(/^\{(.+)}$/)
  return match ? resolveAlias(tokenAt(match[1]).value) : value
}

function resolveThemeValue(token: TokenLeaf, theme: Theme): unknown {
  const value = token.value

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return resolveAlias(value[theme])
  }

  return resolveAlias(value)
}

function tokenEntries(tree: TokenTree, prefix = ''): Array<[string, TokenLeaf]> {
  return Object.entries(tree).flatMap(([name, value]) => {
    const path = prefix ? `${prefix}.${name}` : name
    return isTokenLeaf(value) ? [[path, value]] : tokenEntries(value, path)
  })
}

function numericValue(token: TokenLeaf): number {
  const value = resolveAlias(token.value)
  return typeof value === 'number' ? value : 0
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const colorGroups = Object.entries(tokens.color.semantic).filter(
  (entry): entry is [string, TokenTree] => !isTokenLeaf(entry[1]),
)
const spacing = tokenEntries(tokens.space)
const radii = tokenEntries(tokens.radius)
const typeRoles = tokenEntries(tokens.typography.role)

function ColorFoundations() {
  const theme = currentTheme()

  return (
    <FoundationSection
      eyebrow={`Theme · ${theme}`}
      title="Semantic color"
      description="Purpose-led roles used by product components. Change Light or Dark from the Storybook toolbar to inspect the active value."
    >
      <div className="mo-foundation-color-groups">
        {colorGroups.map(([groupName, group]) => (
          <section className="mo-foundation-color-group" key={groupName}>
            <h3>{groupName}</h3>
            <div className="mo-foundation-color-grid">
              {tokenEntries(group, `color.semantic.${groupName}`).map(([path, token]) => {
                const color = String(resolveThemeValue(token, theme))
                const role = path.split('.').at(-1)

                return (
                  <article className="mo-foundation-color-card" key={path}>
                    <div
                      aria-label={`${role} color ${color}`}
                      className="mo-foundation-color-swatch"
                      style={{ backgroundColor: color }}
                    />
                    <div className="mo-foundation-color-copy">
                      <strong>{role}</strong>
                      <code>{color}</code>
                      <p>{token.description}</p>
                      <small>{path}</small>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </FoundationSection>
  )
}

function TypographyFoundations() {
  return (
    <FoundationSection
      eyebrow="FA + EN"
      title="Typography roles"
      description="The same semantic hierarchy adapts to Vazirmatn for Persian and the platform system stack for English."
    >
      <div className="mo-foundation-type-list">
        {typeRoles.map(([path, token]) => {
          const role = path.split('.').at(-1) ?? path
          const value = token.value as Record<string, unknown>
          const size = Number(value.size)
          const lineHeight = Number(value.lineHeight)
          const weight = Number(resolveAlias(value.weight))
          const style = {
            fontSize: `${size}px`,
            fontWeight: weight,
            lineHeight: `${lineHeight}px`,
          }

          return (
            <article className="mo-foundation-type-row" key={path}>
              <div className="mo-foundation-type-meta">
                <strong>{role}</strong>
                <code>{size}/{lineHeight} · {weight}</code>
                <p>{token.description}</p>
              </div>
              <div className="mo-foundation-type-samples">
                <p className="mo-foundation-type-fa" dir="rtl" lang="fa" style={style}>
                  حرکت‌های کوچک، نتیجه‌های ماندگار
                </p>
                <p className="mo-foundation-type-en" dir="ltr" lang="en" style={style}>
                  Small moves, lasting momentum
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </FoundationSection>
  )
}

function SpacingFoundations() {
  const largestSpace = Math.max(...spacing.map(([, token]) => numericValue(token)))

  return (
    <FoundationSection
      eyebrow="4-point grid"
      title="Spacing scale"
      description="Use the named scale for gaps, padding, and layout rhythm instead of one-off values."
    >
      <div className="mo-foundation-space-list">
        {spacing.map(([path, token]) => {
          const name = path.split('.').at(-1)
          const value = numericValue(token)

          return (
            <div className="mo-foundation-space-row" key={path}>
              <code>space.{name}</code>
              <div className="mo-foundation-space-track">
                <span style={{ width: `${Math.max(2, value / largestSpace * 100)}%` }} />
              </div>
              <strong>{value}px</strong>
            </div>
          )
        })}
      </div>
    </FoundationSection>
  )
}

function RadiusFoundations() {
  return (
    <FoundationSection
      eyebrow="Geometry"
      title="Radius roles"
      description="Radius increases with container scale; pill is reserved for fully rounded indicators and controls."
    >
      <div className="mo-foundation-radius-grid">
        {radii.map(([path, token]) => {
          const name = path.split('.').at(-1)
          const value = numericValue(token)

          return (
            <article className="mo-foundation-radius-card" key={path}>
              <div style={{ borderRadius: `${value}px` }} />
              <strong>{name}</strong>
              <code>{value}px</code>
            </article>
          )
        })}
      </div>
    </FoundationSection>
  )
}

function AccessibilityFoundations() {
  return (
    <FoundationSection eyebrow="Inclusive by default" title="Interaction and accessibility" description="These are release constraints, not optional polish. Inspect in both directions and appearances.">
      <div className="mo-foundation-access-grid">
        <article><strong>44 × 44 minimum</strong><button autoFocus type="button">Visible focus</button><p>Every pointer target retains a comfortable hit area, even when its visible icon is smaller.</p></article>
        <article><strong>Direction aware</strong><div><span dir="rtl">ادامه ←</span><span dir="ltr">Continue →</span></div><p>Directional icons mirror with layout direction; universal symbols do not.</p></article>
        <article><strong>Text expansion</strong><p className="mo-foundation-long-copy">اطلاعاتت را بررسی کن؛ تغییرهایی که روی برنامه ماه آینده اثر دارند پیش از درخواست یک‌باره آن دوره قابل ویرایش هستند.</p><p>Containers grow with content and never depend on fixed text height.</p></article>
        <article><strong>Reduced effects</strong><div className="mo-foundation-effect-samples"><i /><i /></div><p>Reduced motion stops decorative animation. Reduced transparency falls back to opaque semantic chrome.</p></article>
      </div>
    </FoundationSection>
  )
}

function FoundationSection({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <main className="mo-foundation-page">
      <header className="mo-foundation-heading">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
      <footer>
        Source of truth · <code>docs/design/tokens.json</code>
      </footer>
    </main>
  )
}

const meta = {
  title: 'Foundations/Design tokens',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production-facing foundations generated from the canonical Human Strength token contract. Only Light and Dark modes are supported.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SemanticColors: Story = { render: () => <ColorFoundations /> }
export const Typography: Story = { render: () => <TypographyFoundations /> }
export const Spacing: Story = { render: () => <SpacingFoundations /> }
export const Radius: Story = { render: () => <RadiusFoundations /> }
export const AccessibilityContract: Story = { render: () => <AccessibilityFoundations /> }
