/* eslint-disable react-refresh/only-export-components -- Story-only render kit intentionally co-locates locale helpers with its components. */
import { useState, type ReactNode } from 'react'
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleUserRound,
  House,
  ListChecks,
  Settings2,
  X,
} from 'lucide-react'
import './product-spec.css'

export type SpecLocale = 'fa' | 'en'
export type SpecTone = 'brand' | 'energy' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export function localeFromStory(value: unknown): SpecLocale {
  return value === 'en' ? 'en' : 'fa'
}

export function tx(locale: SpecLocale, fa: string, en: string) {
  return locale === 'fa' ? fa : en
}

export function ProductFrame({
  active = 'today',
  children,
  className = '',
  locale,
  mobile = false,
  nav = true,
  onActiveChange,
  title,
}: {
  active?: 'today' | 'plan' | 'progress' | 'me'
  children: ReactNode
  className?: string
  locale: SpecLocale
  mobile?: boolean
  nav?: boolean
  onActiveChange?: (active: 'today' | 'plan' | 'progress' | 'me') => void
  title: string
}) {
  const [localSelected, setLocalSelected] = useState(active)
  const selected = onActiveChange ? active : localSelected
  const items = [
    { id: 'today', icon: House, fa: 'امروز', en: 'Today' },
    { id: 'plan', icon: CalendarDays, fa: 'برنامه', en: 'Plan' },
    { id: 'progress', icon: ChartNoAxesCombined, fa: 'پیشرفت', en: 'Progress' },
    { id: 'me', icon: CircleUserRound, fa: 'من', en: 'Me' },
  ] as const

  return (
    <div className={`mo-spec ${mobile ? 'mo-spec--mobile' : ''} ${nav ? '' : 'mo-spec--chromeless'} ${className}`.trim()} dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale}>
      <div aria-hidden="true" className="mo-spec__aura mo-spec__aura--brand" />
      <div aria-hidden="true" className="mo-spec__aura mo-spec__aura--energy" />
      <header className="mo-spec__chrome">
        <div className="mo-spec__brand"><span>●</span><strong>MOMENTUM</strong></div>
        <span className="mo-spec__route">{title}</span>
        <button aria-label={tx(locale, 'تنظیمات', 'Settings')} className="mo-spec__icon-button" type="button"><Settings2 /></button>
      </header>
      <main className="mo-spec__main">{children}</main>
      {nav ? (
        <nav aria-label={tx(locale, 'ناوبری اصلی', 'Primary navigation')} className="mo-spec__tabbar">
          {items.map(({ id, icon: Icon, fa, en }) => (
            <button aria-current={selected === id ? 'page' : undefined} className={selected === id ? 'is-active' : ''} key={id} onClick={() => { setLocalSelected(id); onActiveChange?.(id) }} type="button">
              <Icon aria-hidden="true" /><span>{tx(locale, fa, en)}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

export function PublicFrame({ children, locale }: { children: ReactNode; locale: SpecLocale }) {
  return (
    <div className="mo-spec mo-spec--public" dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale}>
      <div aria-hidden="true" className="mo-spec__aura mo-spec__aura--brand" />
      <div aria-hidden="true" className="mo-spec__aura mo-spec__aura--energy" />
      <header className="mo-spec__chrome mo-spec__public-nav">
        <div className="mo-spec__brand"><span>●</span><strong>MOMENTUM</strong></div>
        <nav><a href="#features">{tx(locale, 'امکانات', 'Features')}</a><a href="#safety">{tx(locale, 'ایمنی', 'Safety')}</a><a href="#pricing">{tx(locale, 'عضویت', 'Membership')}</a></nav>
        <SpecButton>{tx(locale, 'ورود', 'Sign in')}</SpecButton>
      </header>
      <main className="mo-spec__main">{children}</main>
    </div>
  )
}

export function SpecOverlay({ children, kind, locale, material = 'glass', title }: { children: ReactNode; kind: 'dialog' | 'sheet'; locale: SpecLocale; material?: 'glass' | 'opaque'; title: string }) {
  return (
    <div className={`mo-spec mo-spec__overlay-stage mo-spec__overlay-stage--${kind} ${material === 'opaque' ? 'mo-spec--overlay-opaque' : ''}`} dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale}>
      <div aria-hidden="true" className="mo-spec__overlay-context"><span>● MOMENTUM</span><i /><i /><i /></div>
      <div aria-hidden="true" className="mo-spec__overlay-backdrop" />
      <section aria-label={title} aria-modal="true" className={`mo-spec__overlay-surface mo-spec__overlay-surface--${kind}`} role="dialog">
        {kind === 'sheet' ? <span aria-hidden="true" className="mo-spec__sheet-handle" /> : null}
        <button aria-label={tx(locale, 'بستن و بازگشت', 'Close and return')} className="mo-spec__overlay-close" type="button"><X /></button>
        {children}
      </section>
    </div>
  )
}

export function AuthFrame({ children, locale, step }: { children: ReactNode; locale: SpecLocale; step?: string }) {
  return (
    <div className="mo-spec mo-spec--auth" dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale}>
      <div aria-hidden="true" className="mo-spec__aura mo-spec__aura--brand" />
      <header className="mo-spec__chrome">
        <button aria-label={tx(locale, 'بازگشت', 'Back')} className="mo-spec__icon-button" type="button"><ChevronLeft className="mo-spec__directional" /></button>
        <div className="mo-spec__brand"><span>●</span><strong>MOMENTUM</strong></div>
        <span className="mo-spec__route">{step ?? tx(locale, 'حساب کاربری', 'Account')}</span>
      </header>
      <main className="mo-spec__main mo-spec__auth-main">{children}</main>
    </div>
  )
}

export function SpecHeader({ eyebrow, title, body, aside }: { eyebrow?: string; title: string; body?: string; aside?: ReactNode }) {
  return (
    <header className="mo-spec__heading">
      <div>{eyebrow ? <span className="mo-spec__eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{body ? <p>{body}</p> : null}</div>
      {aside ? <div className="mo-spec__heading-aside">{aside}</div> : null}
    </header>
  )
}

export function SpecCard({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: SpecTone }) {
  return <section className={`mo-spec__card ${tone ? `mo-spec__card--${tone}` : ''} ${className}`}>{children}</section>
}

export function SpecButton({ children, kind = 'primary', disabled = false, onClick }: { children: ReactNode; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; onClick?: () => void }) {
  return <button className={`mo-spec__button mo-spec__button--${kind}`} disabled={disabled} onClick={onClick} type="button">{children}</button>
}

export function SpecFloatingAction({ active = false, children, label, onClick }: { active?: boolean; children: ReactNode; label: string; onClick?: () => void }) {
  return <button aria-label={label} aria-pressed={active} className={`mo-spec__floating-action ${active ? 'is-active' : ''}`} onClick={onClick} type="button">{children}</button>
}

export function SpecBadge({ children, tone = 'brand' }: { children: ReactNode; tone?: SpecTone }) {
  return <span className={`mo-spec__badge mo-spec__badge--${tone}`}>{children}</span>
}

export function SpecCallout({ children, icon, title, tone = 'info' }: { children?: ReactNode; icon?: ReactNode; title: string; tone?: SpecTone }) {
  return (
    <aside className={`mo-spec__callout mo-spec__callout--${tone}`}>
      {icon ? <span className="mo-spec__callout-icon">{icon}</span> : null}
      <div><strong>{title}</strong>{children ? <p>{children}</p> : null}</div>
    </aside>
  )
}

export function SpecField({ label, value, hint, error, multiline = false }: { label: string; value?: string; hint?: string; error?: string; multiline?: boolean }) {
  return (
    <label className={`mo-spec__field ${error ? 'is-error' : ''}`}>
      <span>{label}</span>
      {multiline ? <textarea defaultValue={value} readOnly rows={3} /> : <input defaultValue={value} readOnly />}
      {error ? <small>{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function SpecSelect({ label, options, value }: { label: string; options?: string[]; value: string }) {
  const items = options?.length ? options : [value]
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(value)

  return (
    <label className="mo-spec__field mo-spec__select">
      <span>{label}</span>
      <button aria-expanded={open} className={`mo-spec__select-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} type="button">
        <strong>{selected}</strong>
        <ChevronDown />
      </button>
      {open ? (
        <div className="mo-spec__select-menu">
          <div className="mo-spec__select-menu-scroller" role="listbox">
            {items.map((item) => {
              const isSelected = item === selected
              return (
                <button aria-selected={isSelected} className={isSelected ? 'is-selected' : ''} key={item} onClick={() => { setSelected(item); setOpen(false) }} role="option" type="button">
                  <span>{item}</span>
                  {isSelected ? <Check /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </label>
  )
}

export function SpecConsentOption({ checked = false, description, error, label, required = true, version }: { checked?: boolean; description: string; error?: string; label: string; required?: boolean; version: string }) {
  return (
    <label className={`mo-spec__consent ${error ? 'is-error' : ''}`}>
      <input defaultChecked={checked} required={required} type="checkbox" />
      <span className="mo-spec__consent-control" aria-hidden="true" />
      <span className="mo-spec__consent-copy"><strong>{label}</strong><small>{description}</small>{error ? <em role="alert">{error}</em> : null}</span>
      <span className="mo-spec__consent-version">{version}</span>
    </label>
  )
}

export function SpecChips({ items }: { items: Array<{ blocked?: boolean; label: string; selected?: boolean }> }) {
  return (
    <div className="mo-spec-chips" role="group">
      {items.map((item) => (
        <button aria-pressed={item.selected ?? false} className={`mo-spec-chip ${item.selected ? 'is-selected' : ''} ${item.blocked ? 'is-blocked' : ''}`} key={item.label} type="button">
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function SpecTabs({ items, selected }: { items: string[]; selected: string }) {
  return <div className="mo-spec__segments" role="tablist">{items.map((item) => <button aria-selected={item === selected} className={item === selected ? 'is-active' : ''} key={item} role="tab" type="button">{item}</button>)}</div>
}

export function SpecMetric({ label, value, detail, tone = 'brand' }: { label: string; value: string; detail?: string; tone?: SpecTone }) {
  return <SpecCard className="mo-spec__metric"><span>{label}</span><strong data-tone={tone}>{value}</strong>{detail ? <small>{detail}</small> : null}</SpecCard>
}

export function SpecList({ rows }: { rows: Array<{ label: string; value?: string; detail?: string; icon?: ReactNode; tone?: SpecTone }> }) {
  return <div className="mo-spec__list">{rows.map((row, index) => <article key={`${row.label}-${index}`}>{row.icon ? <span className={`mo-spec__list-icon mo-spec__list-icon--${row.tone ?? 'neutral'}`}>{row.icon}</span> : null}<div><strong>{row.label}</strong>{row.detail ? <p>{row.detail}</p> : null}</div>{row.value ? <span>{row.value}</span> : null}</article>)}</div>
}

export function SpecProgress({ label, value }: { label: string; value: number }) {
  return <div className="mo-spec__progress"><div><span>{label}</span><strong>{value}%</strong></div><i><b style={{ inlineSize: `${value}%` }} /></i></div>
}

export function StateScreen({
  actions,
  body,
  eyebrow,
  icon,
  locale,
  note,
  title,
  tone = 'brand',
}: {
  actions?: ReactNode
  body: string
  eyebrow?: string
  icon: ReactNode
  locale: SpecLocale
  note?: ReactNode
  title: string
  tone?: SpecTone
}) {
  return (
    <AuthFrame locale={locale} step={eyebrow}>
      <SpecCard className="mo-spec__state-card">
        <span className={`mo-spec__state-icon mo-spec__state-icon--${tone}`}>{icon}</span>
        <h1>{title}</h1><p>{body}</p>{note}{actions ? <div className="mo-spec__actions">{actions}</div> : null}
      </SpecCard>
    </AuthFrame>
  )
}

export function FormActions({ locale, primary, secondary }: { locale: SpecLocale; primary: string; secondary?: string }) {
  return <div className="mo-spec__actions">{secondary ? <SpecButton kind="secondary">{secondary}</SpecButton> : null}<SpecButton>{primary}</SpecButton><span className="mo-spec__save"><ListChecks />{tx(locale, 'اطلاعات این مرحله ذخیره می‌شود', 'This step is saved')}</span></div>
}

export function ChartBars({ labels, values }: { labels: string[]; values: number[] }) {
  return <div aria-label="Chart" className="mo-spec__chart" role="img">{labels.map((label, index) => <div key={label}><i style={{ blockSize: `${values[index] ?? 0}%` }} /><span>{label}</span></div>)}</div>
}

export function SpecTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <div className="mo-spec__table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>
}

export function Timeline({ rows }: { rows: Array<{ title: string; body: string; status: 'done' | 'active' | 'pending' | 'error' }> }) {
  return <ol className="mo-spec__timeline">{rows.map((row) => <li className={`is-${row.status}`} key={row.title}><i /><div><strong>{row.title}</strong><p>{row.body}</p></div></li>)}</ol>
}

export function ActivityGlyph() {
  return <Activity aria-hidden="true" />
}
