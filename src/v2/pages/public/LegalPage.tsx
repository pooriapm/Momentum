import { Mail } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { FALLBACK_LEGAL_DOCUMENT_VERSIONS, loadLegalDocumentVersions } from '../../../config/legal'
import { runtimeConfig } from '../../../platform/config/runtime'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { legalDocument, type LegalDocument } from './legal-copy'
import './legal.css'

export function LegalPage({ locale, kind }: { locale: AppLocale; kind: 'privacy' | 'terms' }) {
  const fa = locale === 'fa'
  const [legalVersions, setLegalVersions] = useState(FALLBACK_LEGAL_DOCUMENT_VERSIONS)
  const version = kind === 'privacy' ? legalVersions.privacy : legalVersions.terms
  const privacyContactEmail = runtimeConfig.privacyEmail || runtimeConfig.supportEmail
  useEffect(() => {
    void loadLegalDocumentVersions().then(setLegalVersions)
  }, [])

  return (
    <LegalShell
      document={legalDocument(kind, locale)}
      locale={locale}
      version={version}
      contact={kind === 'privacy' ? (
        <aside className="legal-contact">
          <Mail size={18} />
          <div>
            <h2>{fa ? 'تماس حریم خصوصی' : 'Privacy contact'}</h2>
            {privacyContactEmail ? (
              <p>
                {fa ? 'فقط پرسش درباره این اطلاعیه را بفرستید، نه مقدار سلامت، رمز، یا فایل برنامه: ' : 'Write only about this notice. Do not include health values, passwords, or plan files: '}
                <a href={`mailto:${privacyContactEmail}?subject=${encodeURIComponent('Momentum privacy')}`}><bdi>{privacyContactEmail}</bdi></a>
              </p>
            ) : (
              <p>{fa
                ? 'نشانی تماس هنوز تنظیم نشده است. تا آن زمان، این صفحه سند نهایی یک شخص حقوقی معین نیست.'
                : 'A contact address is not configured yet. Until it is, this page is not the final notice of a named legal entity.'}</p>
            )}
          </div>
        </aside>
      ) : null}
    />
  )
}

export function LegalShell({
  document,
  locale,
  version,
  contact,
}: {
  document: LegalDocument
  locale: AppLocale
  version?: string
  contact?: ReactNode
}) {
  const fa = locale === 'fa'
  const [active, setActive] = useState(document.sections[0]?.id ?? '')
  const words = document.sections.reduce((total, section) => total + section.blocks.reduce(
    (count, block) => count + (block.kind === 'p' ? block.text : block.items.join(' ')).split(/\s+/).length,
    0,
  ), 0)
  const minutes = Math.max(1, Math.round(words / 200))

  // Scroll-spy: the contents list follows the section being read.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (visible[0]) setActive(visible[0].target.id)
    }, { rootMargin: '-20% 0px -70% 0px' })
    for (const section of document.sections) {
      const node = window.document.getElementById(section.id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [document])

  return (
    <div className="public-page legal-doc">
      <PublicHeader locale={locale} />
      <main>
        <header className="legal-hero">
          <p className="legal-kicker">{document.kicker}</p>
          <h1>{document.title}</h1>
          <p className="legal-summary">{document.summary}</p>
          <dl className="legal-meta">
            {version ? <div><dt>{fa ? 'نسخه' : 'Version'}</dt><dd><bdi dir="ltr">{version}</bdi> · {fa ? 'آلفا' : 'Alpha'}</dd></div> : null}
            <div><dt>{fa ? 'بخش‌ها' : 'Sections'}</dt><dd>{formatIndex(document.sections.length, fa, false)}</dd></div>
            <div><dt>{fa ? 'زمان خواندن' : 'Reading time'}</dt><dd>{fa ? `حدود ${formatIndex(minutes, true, false)} دقیقه` : `About ${minutes} min`}</dd></div>
          </dl>
        </header>
        <div className="legal-layout">
          <nav aria-label={fa ? 'فهرست مواد' : 'Contents'} className="legal-toc">
            <p>{fa ? 'مواد' : 'Contents'}</p>
            <ol>
              {document.sections.map((section, index) => (
                <li key={section.id}>
                  <a aria-current={active === section.id ? 'location' : undefined} href={`#${section.id}`}>
                    <span>{formatIndex(index + 1, fa)}</span>{section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-body">
            {document.sections.map((section, index) => (
              <section aria-labelledby={`${section.id}-title`} className="legal-article" id={section.id} key={section.id}>
                <span aria-hidden="true" className="legal-article__num">{formatIndex(index + 1, fa)}</span>
                <div>
                  <h2 id={`${section.id}-title`}>{section.title}</h2>
                  {section.blocks.map((block, blockIndex) => block.kind === 'p'
                    ? <p key={blockIndex}>{block.text}</p>
                    : <ul key={blockIndex}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>)}
                </div>
              </section>
            ))}
            {contact}
          </div>
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

function formatIndex(value: number, fa: boolean, pad = true) {
  return new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US', { minimumIntegerDigits: pad ? 2 : 1, useGrouping: false }).format(value)
}
