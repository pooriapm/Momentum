import type { CSSProperties, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Activity,
  ChevronDown,
  Dumbbell,
  Home,
  MoreHorizontal,
  Sparkles,
  UserRound,
  Utensils,
} from 'lucide-react'
import tokenSource from '../../../docs/design/tokens.json?raw'
import './HumanStrength.css'

type Theme = 'light' | 'dark'
type Locale = 'fa' | 'en'
type TokenNode = { value?: unknown; [key: string]: unknown }
type ShowcaseStyle = CSSProperties & Record<`--hs-${string}`, string>

const tokens = JSON.parse(tokenSource) as TokenNode

const approved = {
  light: {
    canvas: '#FAF7F4', content: '#FFFFFF', raised: '#F1EAEF', sunken: '#F7F1F4',
    text: '#241A21', secondary: '#675762', muted: '#81717B', action: '#73395F',
    actionHover: '#62304F', actionPressed: '#512641', onAction: '#FFFFFF', soft: '#F3E1EC',
    energy: '#B95332', energySoft: '#FBE4DA', boundary: '#7C6A75', border: '#E4D9DF',
    glass: '#FFF9FCB8', glassBoundary: '#FFFFFFB8', focus: '#934F7A',
    success: '#247456', warning: '#9A5D00', danger: '#B3263E', scrim: '#241A2166',
  },
  dark: {
    canvas: '#161114', content: '#21191E', raised: '#2D2229', sunken: '#1B1519',
    text: '#FBF5F8', secondary: '#C2B3BC', muted: '#A696A0', action: '#E0A3C8',
    actionHover: '#EAB6D5', actionPressed: '#CA8DB1', onAction: '#351329', soft: '#48283A',
    energy: '#FF9A73', energySoft: '#4B261D', boundary: '#806D78', border: '#45363F',
    glass: '#35272FD1', glassBoundary: '#FFFFFF2E', focus: '#F1B8DA',
    success: '#62C69B', warning: '#F5BE67', danger: '#FF8798', scrim: '#090709A8',
  },
} as const

function at(path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (
    node && typeof node === 'object' ? (node as TokenNode)[key] : undefined
  ), tokens)
}

function resolve(value: unknown, theme: Theme, seen = new Set<string>()): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const node = value as TokenNode
    if ('value' in node) return resolve(node.value, theme, seen)
    if (theme in node) return resolve(node[theme], theme, seen)
  }

  if (typeof value === 'string') {
    const alias = value.match(/^\{(.+)}$/)?.[1]
    if (alias && !seen.has(alias)) {
      seen.add(alias)
      return resolve(at(alias), theme, seen)
    }
  }

  return value
}

function color(theme: Theme, paths: string[], fallback: string): string {
  for (const path of paths) {
    const value = resolve(at(path), theme)
    if (typeof value === 'string' && /^#[\da-f]{6,8}$/i.test(value)) return value
  }
  return fallback
}

function showcaseStyle(theme: Theme): ShowcaseStyle {
  const a = approved[theme]
  return {
    '--hs-canvas': color(theme, ['color.semantic.background.canvas'], a.canvas),
    '--hs-content': color(theme, ['color.semantic.surface.content'], a.content),
    '--hs-raised': color(theme, ['color.semantic.surface.raised'], a.raised),
    '--hs-sunken': color(theme, ['color.semantic.surface.sunken', 'color.semantic.background.subtle'], a.sunken),
    '--hs-text': color(theme, ['color.semantic.text.primary'], a.text),
    '--hs-secondary': color(theme, ['color.semantic.text.secondary'], a.secondary),
    '--hs-muted': color(theme, ['color.semantic.text.tertiary'], a.muted),
    '--hs-action': color(theme, ['color.semantic.action.primary'], a.action),
    '--hs-action-hover': color(theme, ['color.semantic.action.primaryHover'], a.actionHover),
    '--hs-action-pressed': color(theme, ['color.semantic.action.primaryPressed'], a.actionPressed),
    '--hs-on-action': color(theme, ['color.semantic.action.onPrimary'], a.onAction),
    '--hs-soft': color(theme, ['color.semantic.action.soft', 'color.semantic.plan.soft'], a.soft),
    '--hs-energy': color(theme, ['color.semantic.energy.primary'], a.energy),
    '--hs-energy-soft': color(theme, ['color.semantic.energy.soft'], a.energySoft),
    '--hs-boundary': color(theme, ['color.semantic.border.control', 'color.semantic.border.strong'], a.boundary),
    '--hs-border': color(theme, ['color.semantic.border.subtle'], a.border),
    '--hs-glass': color(theme, ['color.semantic.material.glass', 'color.semantic.surface.chrome'], a.glass),
    '--hs-glass-boundary': color(theme, ['color.semantic.material.glassBoundary', 'color.semantic.border.glass'], a.glassBoundary),
    '--hs-focus': color(theme, ['color.semantic.focus.ring'], a.focus),
    '--hs-success': color(theme, ['color.semantic.status.success'], a.success),
    '--hs-warning': color(theme, ['color.semantic.status.warning'], a.warning),
    '--hs-danger': color(theme, ['color.semantic.status.danger'], a.danger),
    '--hs-scrim': color(theme, ['color.semantic.surface.scrim'], a.scrim),
  }
}

const copy = {
  fa: {
    label: 'مسیر بصری مصوب', title: 'قدرت انسانی',
    intro: 'رابطی آرام و توانمند که برنامه‌ریزی سلامت را شخصی، روشن و بدون قضاوت نگه می‌دارد.',
    glass: 'لایه عملکردی شیشه‌ای', glassBody: 'شیشه فقط برای ناوبری و کنترل‌های موقت است؛ محتوای اصلی همیشه روی سطحی خوانا و مات باقی می‌ماند.',
    opaque: 'کارت محتوای مات', opaqueBody: 'برنامه تمرینی، تغذیه، نمودار و فرم برای خوانایی به جلوه شیشه‌ای وابسته نیستند.',
    today: 'امروز', workout: 'تمرین قدرتی تمام بدن', duration: '۴۵ دقیقه', exercises: '۶ حرکت', start: 'شروع تمرین', details: 'جزئیات',
    input: 'محل تمرین', inputValue: 'خانه', progress: 'پیشرفت این هفته', completed: '۳ از ۴ جلسه انجام شده',
    home: 'خانه', plan: 'برنامه', food: 'تغذیه', me: 'من', menu: 'گزینه‌های برنامه', edit: 'ویرایش برنامه', download: 'دریافت نسخه', cancel: 'بستن',
    sheet: 'آماده شروعی؟', sheetBody: 'زمان و امکانات امروز را بررسی کن؛ می‌توانی تمرین را با شرایط خودت هماهنگ کنی.',
    palette: 'نقش‌های رنگی', materials: 'متریال و سلسله‌مراتب', components: 'کامپوننت‌های مرجع', light: 'روشن', dark: 'تیره',
  },
  en: {
    label: 'Approved visual direction', title: 'Human Strength',
    intro: 'A calm, capable interface that keeps health planning personal, clear, and free of judgment.',
    glass: 'Functional glass layer', glassBody: 'Glass belongs to navigation and temporary controls; primary content always stays on a readable opaque surface.',
    opaque: 'Opaque content card', opaqueBody: 'Plans, nutrition, charts, and forms never depend on glass for hierarchy or readability.',
    today: 'Today', workout: 'Full-body strength', duration: '45 min', exercises: '6 exercises', start: 'Start workout', details: 'Details',
    input: 'Training location', inputValue: 'Home', progress: 'This week', completed: '3 of 4 sessions complete',
    home: 'Home', plan: 'Plan', food: 'Nutrition', me: 'Me', menu: 'Plan options', edit: 'Edit plan', download: 'Download copy', cancel: 'Close',
    sheet: 'Ready to begin?', sheetBody: 'Check today’s time and equipment. You can adapt this session to your circumstances.',
    palette: 'Color roles', materials: 'Material hierarchy', components: 'Reference components', light: 'Light', dark: 'Dark',
  },
} as const

function Shell({ children, locale, theme }: { children: ReactNode; locale: Locale; theme: Theme }) {
  const t = copy[locale]
  return (
    <main className="hs" data-hs-theme={theme} dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale} style={showcaseStyle(theme)}>
      <div className="hs__aura hs__aura--brand" />
      <div className="hs__aura hs__aura--energy" />
      <header className="hs__header">
        <div>
          <span className="hs__eyebrow">{t.label}</span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <span className="hs__appearance">{theme === 'light' ? t.light : t.dark}</span>
      </header>
      {children}
    </main>
  )
}

function Palette({ locale, theme }: { locale: Locale; theme: Theme }) {
  const t = copy[locale]
  const roles = [
    ['canvas', 'Canvas'], ['content', 'Content surface'], ['raised', 'Raised surface'], ['text', 'Primary text'],
    ['secondary', 'Secondary text'], ['action', 'Brand / action'], ['soft', 'Brand soft'], ['energy', 'Human energy'],
    ['energy-soft', 'Energy soft'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'],
  ] as const
  return (
    <Shell locale={locale} theme={theme}>
      <section className="hs__section">
        <div className="hs__section-heading"><span>01</span><h2>{t.palette}</h2></div>
        <div className="hs__swatches">
          {roles.map(([role, label]) => (
            <article className="hs__swatch" key={role}>
              <div style={{ background: `var(--hs-${role})` }} />
              <strong>{label}</strong><code>semantic.{role}</code>
            </article>
          ))}
        </div>
        <div className="hs__rule"><Sparkles aria-hidden="true" /><p>{t.intro}</p></div>
      </section>
    </Shell>
  )
}

function Materials({ locale, theme }: { locale: Locale; theme: Theme }) {
  const t = copy[locale]
  return (
    <Shell locale={locale} theme={theme}>
      <section className="hs__section">
        <div className="hs__section-heading"><span>02</span><h2>{t.materials}</h2></div>
        <div className="hs__material-stage">
          <article className="hs__content-card">
            <span className="hs__eyebrow">{t.opaque}</span><h3>{t.workout}</h3><p>{t.opaqueBody}</p>
            <div className="hs__metrics"><span><Dumbbell aria-hidden="true" />{t.exercises}</span><span><Activity aria-hidden="true" />{t.duration}</span></div>
          </article>
          <aside className="hs__glass-panel">
            <MoreHorizontal aria-hidden="true" /><div><strong>{t.glass}</strong><p>{t.glassBody}</p></div>
          </aside>
        </div>
        <div className="hs__material-notes">
          <article><strong>Opaque</strong><p>{t.opaqueBody}</p></article>
          <article><strong>Liquid Glass</strong><p>{t.glassBody}</p></article>
          <article><strong>Fallback</strong><p>backdrop-filter → semantic opaque chrome</p></article>
        </div>
      </section>
    </Shell>
  )
}

function Components({ locale, theme }: { locale: Locale; theme: Theme }) {
  const t = copy[locale]
  return (
    <Shell locale={locale} theme={theme}>
      <section className="hs__section">
        <div className="hs__section-heading"><span>03</span><h2>{t.components}</h2></div>
        <div className="hs__component-grid">
          <article className="hs__content-card hs__workout-card">
            <div className="hs__card-top"><span>{t.today}</span><span className="hs__status"><i />{t.progress}</span></div>
            <div className="hs__icon-tile"><Dumbbell aria-hidden="true" /></div>
            <h3>{t.workout}</h3><p>{t.completed}</p>
            <div className="hs__progress"><span /></div>
            <div className="hs__actions"><button className="hs__primary">{t.start}</button><button className="hs__secondary">{t.details}</button></div>
          </article>
          <div className="hs__control-stack">
            <label className="hs__field"><span>{t.input}</span><button>{t.inputValue}<ChevronDown aria-hidden="true" /></button></label>
            <div className="hs__popover" role="dialog" aria-label={t.menu}>
              <strong>{t.menu}</strong><button>{t.edit}</button><button>{t.download}</button><button>{t.cancel}</button>
            </div>
          </div>
        </div>
        <div className="hs__phone-stage">
          <div className="hs__sheet">
            <div className="hs__grabber" /><div className="hs__icon-tile hs__icon-tile--energy"><Sparkles aria-hidden="true" /></div>
            <h3>{t.sheet}</h3><p>{t.sheetBody}</p><button className="hs__primary">{t.start}</button>
          </div>
          <nav className="hs__tabbar" aria-label="Primary">
            <button className="is-active"><Home aria-hidden="true" /><span>{t.home}</span></button>
            <button><Dumbbell aria-hidden="true" /><span>{t.plan}</span></button>
            <button><Utensils aria-hidden="true" /><span>{t.food}</span></button>
            <button><UserRound aria-hidden="true" /><span>{t.me}</span></button>
          </nav>
        </div>
      </section>
    </Shell>
  )
}

const meta = {
  title: 'Foundations/Human Strength',
  parameters: {
    controls: { disable: true },
    docs: { description: { component: 'Approved Human Strength palette and functional Liquid Glass contract. Use the Storybook toolbar to inspect Light/Dark and Persian/English.' } },
  },
  render: (_, context) => {
    const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
    const locale = context.globals.locale === 'en' ? 'en' : 'fa'
    return <Palette theme={theme} locale={locale} />
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ColorRoles: Story = {}
export const MaterialHierarchy: Story = { render: (_, context) => <Materials theme={context.globals.theme === 'dark' ? 'dark' : 'light'} locale={context.globals.locale === 'en' ? 'en' : 'fa'} /> }
export const ReferenceComponents: Story = { render: (_, context) => <Components theme={context.globals.theme === 'dark' ? 'dark' : 'light'} locale={context.globals.locale === 'en' ? 'en' : 'fa'} /> }
