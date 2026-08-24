import { Languages, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../platform/i18n/catalog'
import { localizedPath, switchLocalePath } from '../router/route-utils'
import { BrandLockup } from '../ui/OrbitMark'

function closeMenu(
  setMenuPath: (value: string | null) => void,
  menuButtonRef: RefObject<HTMLButtonElement | null>,
) {
  setMenuPath(null)
  window.requestAnimationFrame(() => menuButtonRef.current?.focus())
}

export function PublicHeader({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const [path] = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)
  const otherLocale: AppLocale = locale === 'fa' ? 'en' : 'fa'
  const open = menuPath === path

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    linksRef.current?.querySelector<HTMLElement>('a')?.focus()
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeMenu(setMenuPath, menuButtonRef)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      {open ? createPortal((
        <button
          aria-label={locale === 'fa' ? 'بستن منو' : 'Close menu'}
          className="public-menu-backdrop"
          onClick={() => closeMenu(setMenuPath, menuButtonRef)}
          type="button"
        />
      ), document.body) : null}
      <header className={`public-header-wrap${open ? ' public-header-wrap--menu-open' : ''}`}>
        <nav aria-label={locale === 'fa' ? 'ناوبری اصلی' : 'Main navigation'} className="public-header glass-chrome">
          <Link className="public-header__brand" href={localizedPath(locale)} onClick={() => setMenuPath(null)}>
            <BrandLockup compact />
          </Link>
          <div
            aria-hidden={!open}
            className={`public-header__links ${open ? 'public-header__links--open' : ''}`}
            ref={linksRef}
          >
            <Link href={localizedPath(locale, '/pricing')} onClick={() => setMenuPath(null)}>{t('nav.pricing')}</Link>
            <Link href={localizedPath(locale, '/safety')} onClick={() => setMenuPath(null)}>{t('nav.safety')}</Link>
            <Link className="locale-link" href={switchLocalePath(path, otherLocale)} onClick={() => setMenuPath(null)}>
              <Languages aria-hidden="true" size={17} />
              {otherLocale === 'fa' ? 'فارسی' : 'English'}
            </Link>
            <Link className="header-sign-in" href={localizedPath(locale, '/auth/sign-in')} onClick={() => setMenuPath(null)}>{t('common.signIn')}</Link>
            <Link className="header-cta" href={localizedPath(locale, '/auth/sign-up')} onClick={() => setMenuPath(null)}>{t('common.start')}</Link>
          </div>
          <button
            aria-expanded={open}
            aria-label={open ? (locale === 'fa' ? 'بستن منو' : 'Close menu') : (locale === 'fa' ? 'بازکردن منو' : 'Open menu')}
            className="public-header__menu"
            onClick={() => setMenuPath(open ? null : path)}
            ref={menuButtonRef}
            type="button"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>
      </header>
    </>
  )
}

export function PublicFooter({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  return (
    <footer className="public-footer">
      <BrandLockup />
      <div className="public-footer__links">
        <Link href={localizedPath(locale, '/pricing')}>{t('nav.pricing')}</Link>
        <Link href={localizedPath(locale, '/safety')}>{t('nav.safety')}</Link>
        <Link href={localizedPath(locale, '/privacy')}>{locale === 'fa' ? 'حریم خصوصی' : 'Privacy'}</Link>
        <Link href={localizedPath(locale, '/terms')}>{locale === 'fa' ? 'شرایط استفاده' : 'Terms'}</Link>
      </div>
      <small>© {new Date().getFullYear()} Momentum · General wellness only</small>
    </footer>
  )
}
