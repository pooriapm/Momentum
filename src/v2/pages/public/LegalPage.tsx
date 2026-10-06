import { Mail } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { FALLBACK_LEGAL_DOCUMENT_VERSIONS, loadLegalDocumentVersions } from '../../../config/legal'
import { runtimeConfig } from '../../../platform/config/runtime'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { GlassChrome } from '../../ui/primitives'
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
        <GlassChrome className="legal-contact">
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
        </GlassChrome>
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
  return (
    <div className="public-page legal-doc">
      <PublicHeader locale={locale} />
      <main>
        <header className="legal-hero">
          <GlassChrome className="legal-hero__card">
            <p className="legal-kicker">{document.kicker}</p>
            <h1>{document.title}</h1>
            <p>{document.summary}</p>
            {version ? <p className="legal-version">{fa ? 'نسخه' : 'Version'} <bdi dir="ltr">{version}</bdi> · {fa ? 'آلفا' : 'Alpha'}</p> : null}
          </GlassChrome>
        </header>
        <div className="legal-layout">
          <nav aria-label={fa ? 'فهرست مواد' : 'Contents'} className="legal-toc">
            <GlassChrome>
              <p>{fa ? 'مواد' : 'Contents'}</p>
              <ol>
                {document.sections.map((section, index) => (
                  <li key={section.id}><a href={`#${section.id}`}>{fa ? formatFaIndex(index + 1) : index + 1}. {section.title}</a></li>
                ))}
              </ol>
            </GlassChrome>
          </nav>
          <div className="legal-body">
            {document.sections.map((section, index) => (
              <GlassChrome className="legal-article" id={section.id} key={section.id}>
                <h2><span>{fa ? formatFaIndex(index + 1) : String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
                {section.blocks.map((block, blockIndex) => block.kind === 'p'
                  ? <p key={blockIndex}>{block.text}</p>
                  : <ul key={blockIndex}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>)}
              </GlassChrome>
            ))}
            {contact}
          </div>
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

function formatFaIndex(value: number) {
  return new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2, useGrouping: false }).format(value)
}
