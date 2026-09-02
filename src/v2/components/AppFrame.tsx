import { useQuery } from '@tanstack/react-query'
import {
  CircleUserRound,
  House,
  LineChart,
  Salad,
  Sparkles,
  WifiOff,
} from 'lucide-react'
import { type MouseEvent, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearch } from 'wouter'
import type { AppLocale } from '../../platform/i18n/catalog'
import { useAuth } from '../../platform/auth/auth-context'
import { demoPlan } from '../data/demo'
import { loadAccountDashboard } from '../data/repository'
import { localize, type MomentumPlanView } from '../data/types'
import { localizedPath } from '../router/route-utils'
import { BrandLockup } from '../ui/OrbitMark'
import { GlassChrome, PageSkeleton } from '../ui/primitives'
import { appContentSurface, isMembershipRequiredTab, type EntitlementSnapshot } from '../entitlement'
import { EntitlementGate } from '../pages/app/EntitlementGate'
import { PrePlanState } from '../pages/app/PrePlanState'
import { useOfflineBanner } from './useOfflineBanner'
import { animateScrollToTop, ROUTE_SCROLL_DURATION_MS } from '../router/route-scroll'

export type AppTab = 'today' | 'plan' | 'progress' | 'me'

export interface AppFrameContentContext {
  plan: MomentumPlanView | null
  preview: boolean
  loading: boolean
  loadError: boolean
  onRetry?: () => void
  lastSyncedAt?: string
}

interface AppFrameProps {
  locale: AppLocale
  tab: AppTab
  children: (context: AppFrameContentContext) => ReactNode
}

const navItems = [
  { key: 'today', icon: House },
  { key: 'plan', icon: Salad },
  { key: 'progress', icon: LineChart },
  { key: 'me', icon: CircleUserRound },
] as const

function lastSyncedAtFromDashboard(account: unknown) {
  if (!account || typeof account !== 'object' || !('lastSyncedAt' in account)) return undefined
  const value = (account as { lastSyncedAt?: unknown }).lastSyncedAt
  return typeof value === 'string' ? value : undefined
}

function isScrollable(overflowY: string) {
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
}

function collectScrollRoots(layout: HTMLElement) {
  const roots: Array<Window | HTMLElement> = [window]
  const workspace = layout.querySelector<HTMLElement>('.app-workspace')
  if (workspace) roots.push(workspace)

  let current: HTMLElement | null = layout
  while (current) {
    if (isScrollable(getComputedStyle(current).overflowY)) roots.push(current)
    current = current.parentElement
  }

  return [...new Set(roots)]
}

function readScrollY(roots: Array<Window | HTMLElement>) {
  return roots.reduce((max, root) => {
    const y = root instanceof HTMLElement ? root.scrollTop : window.scrollY
    return Math.max(max, y)
  }, 0)
}

function attachChromeMinimize(layout: HTMLElement, setMinimized: (value: boolean) => void, onScrollTop?: () => void) {
  const nav = layout.querySelector<HTMLElement>('.app-bottom-nav')
  const roots = collectScrollRoots(layout)
  let lastY = readScrollY(roots)

  const onScroll = () => {
    const compact = Boolean(nav && getComputedStyle(nav).display !== 'none')
    if (!compact) {
      setMinimized(false)
      return
    }

    const y = readScrollY(roots)
    if (y < 24 || y < lastY - 6) {
      setMinimized(false)
      if (y < 8 && onScrollTop) onScrollTop()
    } else if (y > lastY + 6 && y > 48) {
      setMinimized(true)
    }
    lastY = y
  }

  roots.forEach((root) => root.addEventListener('scroll', onScroll, { passive: true }))
  return () => roots.forEach((root) => root.removeEventListener('scroll', onScroll))
}

export function AppFrame({ locale, tab, children }: AppFrameProps) {
  const { t } = useTranslation()
  const { status, user } = useAuth()
  const [, navigate] = useLocation()
  const search = useSearch()
  const preview = new URLSearchParams(search).get('preview') === '1'
  const planQuery = useQuery({
    queryKey: ['active-plan', user?.id, locale],
    queryFn: () => loadAccountDashboard(locale),
    enabled: Boolean(user) && !preview,
    refetchInterval: 5 * 60 * 1_000,
  })
  const [chromeMinimized, setChromeMinimized] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)
  const navigationTimerRef = useRef<number | null>(null)
  const offlineBanner = useOfflineBanner()
  const operationalTab = isMembershipRequiredTab(tab)
  const loading = !preview && (planQuery.isLoading || planQuery.isFetching) && !planQuery.data
  const loadError = !preview && planQuery.isError
  const showChrome = preview || (status !== 'loading' && Boolean(user) && (!planQuery.isLoading || operationalTab))

  function handleRouteIntent(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.target instanceof Element ? event.target : null
    const anchor = target?.closest<HTMLAnchorElement>('a[href]')
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
    const destination = new URL(anchor.href, window.location.href)
    if (destination.origin !== window.location.origin) return
    const current = `${window.location.pathname}${window.location.search}`
    if (`${destination.pathname}${destination.search}` === current) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const workspace = layoutRef.current?.querySelector<HTMLElement>('.app-workspace')
    const documentScrollTop = (document.scrollingElement as HTMLElement | null)?.scrollTop ?? window.scrollY
    const hasDistanceToTravel = (workspace?.scrollTop ?? 0) > 1 || documentScrollTop > 1
    event.preventDefault()
    if (workspace) animateScrollToTop(workspace, { reducedMotion })
    animateScrollToTop(window, { reducedMotion })
    const destinationPath = `${destination.pathname}${destination.search}${destination.hash}`
    if (reducedMotion || !hasDistanceToTravel) {
      navigate(destinationPath)
      return
    }
    if (navigationTimerRef.current) window.clearTimeout(navigationTimerRef.current)
    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null
      if (workspace) animateScrollToTop(workspace, { reducedMotion: true })
      animateScrollToTop(window, { reducedMotion: true })
      navigate(destinationPath)
    }, ROUTE_SCROLL_DURATION_MS)
  }

  useLayoutEffect(() => {
    if (!showChrome) return
    const layout = layoutRef.current
    if (!layout) return
    return attachChromeMinimize(layout, setChromeMinimized, offlineBanner.dismissOnScrollTop)
  }, [showChrome, offlineBanner.dismissOnScrollTop])

  useLayoutEffect(() => () => {
    if (navigationTimerRef.current) window.clearTimeout(navigationTimerRef.current)
  }, [])

  if (!preview && status === 'loading') return <PageSkeleton />
  if (!preview && !user) {
    return (
      <main className="guard-page screen-enter">
        <BrandLockup />
        <h1>{t('auth.titleIn')}</h1>
        <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-in')}>{t('common.signIn')}</Link>
        <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>{t('common.preview')}</Link>
      </main>
    )
  }
  if (!preview && planQuery.isLoading && !operationalTab) return <PageSkeleton />

  const plan = preview ? demoPlan : (planQuery.data?.plan ?? null)
  const account = planQuery.data
  const entitlement: EntitlementSnapshot = {
    aiPlanState: account?.aiPlanAccess.state,
    automationBlocked: account?.onboardingStatus === 'automation_blocked' || account?.aiPlanAccess.state === 'safety_blocked',
    hasSavedPlan: Boolean(plan),
    membership: account?.entitlementStatus ?? plan?.progress.entitlementStatus ?? 'none',
    onboardingStatus: account?.onboardingStatus ?? '',
    periodEnd: account?.entitlementPeriodEnd ?? plan?.progress.entitlementPeriodEnd,
    productRegion: account?.productRegion ?? plan?.progress.productRegion,
    planSourcePreference: account?.planSourcePreference,
  }
  const contentSurface = preview ? 'children' : appContentSurface(tab, entitlement)
  const navQuery = preview ? '?preview=1' : ''
  const lastSyncedAt = lastSyncedAtFromDashboard(account)
  const pageContext: AppFrameContentContext = {
    plan,
    preview,
    loading,
    loadError,
    onRetry: preview ? undefined : () => { void planQuery.refetch() },
    ...(lastSyncedAt ? { lastSyncedAt } : {}),
  }
  const pageOwnsPlanQuery = !preview && operationalTab && (loading || (loadError && !planQuery.data))

  return (
    <div className="app-layout" onClickCapture={handleRouteIntent} ref={layoutRef}>
      <aside className="app-sidebar glass-chrome">
        <Link className="app-sidebar__brand" href={localizedPath(locale)}><BrandLockup compact /></Link>
        <nav aria-label="App navigation">
          {navItems.map(({ key, icon: Icon }) => (
            <Link aria-current={key === tab ? 'page' : undefined} className={key === tab ? 'is-active' : ''} href={`${localizedPath(locale, `/app/${key}`)}${navQuery}`} key={key}>
              <Icon size={20} /><span>{t(`nav.${key}`)}</span>
            </Link>
          ))}
        </nav>
        <div className="app-sidebar__upgrade">
          <span><Sparkles size={17} /></span>
          <strong>{plan?.progress.entitlementLabel ? localize(plan.progress.entitlementLabel, locale) : (preview ? (locale === 'fa' ? 'عضویت Momentum' : 'Momentum membership') : 'Momentum')}</strong>
          <small>{locale === 'fa' ? 'برنامه تمرین و تغذیه ماه جاری' : 'Current monthly workout and nutrition plan'}</small>
          <div><i style={{ width: plan ? '100%' : '0%' }} /></div>
        </div>
      </aside>
      <div className="app-workspace">
        {offlineBanner.showBanner ? (
          <div className="app-offline-banner inline-notice" role="status">
            <WifiOff size={16} />
            <span>{locale === 'fa' ? 'Momentum آفلاین اجرا می‌شود' : 'Momentum is running offline'}</span>
          </div>
        ) : null}
        {preview ? <GlassChrome className="preview-notice"><Sparkles size={16} /><span>{t('app.previewNotice')}</span></GlassChrome> : null}
        {planQuery.isError && planQuery.data ? <div className="app-error-banner">{locale === 'fa' ? 'به‌روزرسانی برنامه انجام نشد؛ آخرین اطلاعات موجود نمایش داده می‌شود.' : 'The plan could not refresh. Showing the latest available data.'}</div> : null}
        {plan?.contentLocale && plan.contentLocale !== locale ? <div className="app-content-language-note">{locale === 'fa' ? 'متن برنامه با زبان پروفایل هنگام ساخت تولید شده و با تغییر زبان رابط ترجمه نمی‌شود.' : 'Plan content is generated in the profile language and is not machine-translated when the interface language changes.'}</div> : null}
        <div className="app-content">{pageOwnsPlanQuery
          ? children(pageContext)
          : !preview && planQuery.isError && !planQuery.data
          ? <div className="app-load-error" role="alert"><strong>{locale === 'fa' ? 'برنامه دریافت نشد' : 'Your plan could not be loaded'}</strong><p>{locale === 'fa' ? 'اتصال را بررسی کن و دوباره تلاش کن. اطلاعات حسابت حذف نشده است.' : 'Check your connection and try again. Your account data is safe.'}</p><button className="orbit-button orbit-button--primary" onClick={() => void planQuery.refetch()} type="button">{locale === 'fa' ? 'تلاش دوباره' : 'Try again'}</button></div>
          : contentSurface === 'entitlement'
            ? <EntitlementGate locale={locale} snapshot={entitlement} />
            : contentSurface === 'preplan' && account
              ? <PrePlanState account={account} locale={locale} />
              : children(pageContext)}</div>
      </div>
      <GlassChrome aria-label={locale === 'fa' ? 'ناوبری اصلی' : 'Primary navigation'} className={`app-bottom-nav${chromeMinimized ? ' is-minimized' : ''}`} role="navigation">
        {navItems.map(({ key, icon: Icon }) => (
          <Link aria-current={key === tab ? 'page' : undefined} className={key === tab ? 'is-active' : ''} href={`${localizedPath(locale, `/app/${key}`)}${navQuery}`} key={key}>
            <Icon size={20} /><span>{t(`nav.${key}`)}</span>
          </Link>
        ))}
      </GlassChrome>
    </div>
  )
}
