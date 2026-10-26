import type { HTMLAttributes, ReactNode } from 'react'

// Page templates. Every app screen is a Page with one PageHeader; sections inside use SectionHeader.
// The layout follows the window classes in docs/design/tokens.json: one column below `large`,
// main column plus a summary rail from `large` up.

interface PageProps extends HTMLAttributes<HTMLElement> {
  /** Screen key, e.g. "plan" → class "plan-page". */
  name: string
  /** Set while the screen shows a skeleton; announced as the busy label. */
  busyLabel?: string
}

export function Page({ name, busyLabel, className = '', children, ...props }: PageProps) {
  return (
    <main
      aria-busy={busyLabel ? true : undefined}
      aria-label={busyLabel}
      className={`app-page ${name}-page screen-enter ${className}`.trim()}
      {...props}
    >
      {children}
    </main>
  )
}

interface PageHeaderProps {
  /** Short context above the title: section, date or period. Never a sentence. */
  eyebrow?: ReactNode
  /** The page title: the subject of the page in two to four words. Rendered as the page's only h1. */
  title: ReactNode
  /** One or two sentences a person needs to decide something on this page. */
  description?: ReactNode
  /** Status pills and at most one secondary button; the primary action belongs in the content. */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <section className={`page-heading ${className}`.trim()}>
      <div>
        {eyebrow ? <p className="orbit-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-heading__actions">{actions}</div> : null}
    </section>
  )
}

interface SectionHeaderProps {
  title: ReactNode
  /** Short context above the title. */
  eyebrow?: ReactNode
  /** Heading level inside the page; h2 for page sections, h3 inside a card. */
  as?: 'h2' | 'h3'
  /** Trailing icon, count or one small action. */
  meta?: ReactNode
  className?: string
}

export function SectionHeader({ title, eyebrow, as: Heading = 'h2', meta, className = '' }: SectionHeaderProps) {
  const heading = <Heading>{title}</Heading>
  return (
    <div className={`section-title-row ${className}`.trim()}>
      {eyebrow ? <div><p className="orbit-eyebrow">{eyebrow}</p>{heading}</div> : heading}
      {meta}
    </div>
  )
}

interface PageColumnsProps extends HTMLAttributes<HTMLElement> {
  /** The summary rail; stacks under the main column below the large window class. */
  aside: ReactNode
  asideLabel?: string
}

export function PageColumns({ aside, asideLabel, className = '', children, ...props }: PageColumnsProps) {
  return (
    <section className={`page-columns ${className}`.trim()} {...props}>
      <div className="page-columns__main">{children}</div>
      <aside aria-label={asideLabel} className="page-columns__aside">{aside}</aside>
    </section>
  )
}
