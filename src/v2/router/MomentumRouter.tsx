import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Redirect, Route, Switch } from 'wouter'
import { DocumentLocale } from '../../platform/i18n/I18nProvider'
import { isAppLocale, type AppLocale } from '../../platform/i18n/catalog'
import type { AppTab } from '../components/AppFrame'
import { onboardingSections, type OnboardingStepKey } from '../onboarding/schema'
import { PageSkeleton } from '../ui/primitives'
import { localizedPath } from './route-utils'
import { hasStoredLocalePreference, loadUiState } from '../../lib/ui-state'
import { loadPricingContext, suggestedLocaleFromContext } from '../data/pricing'
import { RouteScrollManager } from './RouteScrollManager'

const AppFrame = lazy(async () => ({ default: (await import('../components/AppFrame')).AppFrame }))
const AccountBoundary = lazy(async () => ({ default: (await import('../components/AccountBoundary')).AccountBoundary }))
const TodayPage = lazy(async () => ({ default: (await import('../pages/app/TodayPage')).TodayPage }))
const PlanPage = lazy(async () => ({ default: (await import('../pages/app/PlanPage')).PlanPage }))
const ProgressPage = lazy(async () => ({ default: (await import('../pages/app/ProgressPage')).ProgressPage }))
const MePage = lazy(async () => ({ default: (await import('../pages/app/MePage')).MePage }))
const AccountDataPage = lazy(async () => ({ default: (await import('../pages/app/AccountDataPage')).AccountDataPage }))
const AccountSettingsPage = lazy(async () => ({ default: (await import('../pages/app/AccountSettingsPage')).AccountSettingsPage }))
const ExternalPlanImportPage = lazy(async () => ({ default: (await import('../pages/app/ExternalPlanImportPage')).ExternalPlanImportPage }))
const AuthPage = lazy(async () => ({ default: (await import('../pages/auth/AuthPage')).AuthPage }))
const OnboardingPage = lazy(async () => ({ default: (await import('../pages/onboarding/OnboardingPage')).OnboardingPage }))
const OnboardingResumePage = lazy(async () => ({ default: (await import('../pages/onboarding/OnboardingResumePage')).OnboardingResumePage }))
const LandingPage = lazy(async () => ({ default: (await import('../pages/public/LandingPage')).LandingPage }))
const PricingPage = lazy(async () => ({ default: (await import('../pages/public/PricingPage')).PricingPage }))
const SafetyPage = lazy(async () => ({ default: (await import('../pages/public/SafetyPage')).SafetyPage }))
const LegalPage = lazy(async () => ({ default: (await import('../pages/public/LegalPage')).LegalPage }))

function withLocale(localeParam: string | undefined, render: (locale: AppLocale) => ReactNode) {
  if (!isAppLocale(localeParam)) return <Redirect replace to="/fa" />
  return <><DocumentLocale locale={localeParam} />{render(localeParam)}</>
}

const appTabs: readonly AppTab[] = ['today', 'plan', 'progress', 'me']

function RootLocaleRedirect() {
  const storedLocale = loadUiState().locale
  const [locale, setLocale] = useState<AppLocale | null>(
    hasStoredLocalePreference() ? storedLocale : null,
  )

  useEffect(() => {
    if (locale) return
    let active = true
    void loadPricingContext()
      .then((context) => {
        if (active) setLocale(suggestedLocaleFromContext(context, storedLocale))
      })
      .catch(() => {
        if (active) setLocale(storedLocale)
      })
    return () => {
      active = false
    }
  }, [locale, storedLocale])

  return locale ? <Redirect replace to={`/${locale}`} /> : <PageSkeleton />
}

export function MomentumRouter() {
  return (
    <>
      <RouteScrollManager />
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
      <Route path="/">
        <RootLocaleRedirect />
      </Route>
      <Route path="/:locale/auth/:mode">
        {(params) => withLocale(params.locale, (locale) => {
          const mode = params.mode === 'sign-up' || params.mode === 'recover' || params.mode === 'update-password' || params.mode === 'verify'
            ? params.mode
            : 'sign-in'
          return <AccountBoundary><AuthPage key={mode} locale={locale} mode={mode} /></AccountBoundary>
        })}
      </Route>
      <Route path="/:locale/onboarding">
        {(params) => withLocale(params.locale, (locale) => <AccountBoundary><OnboardingResumePage locale={locale} /></AccountBoundary>)}
      </Route>
      <Route path="/:locale/onboarding/:step">
        {(params) => withLocale(params.locale, (locale) => {
          const isStep = onboardingSections.some((section) => section.key === params.step)
          if (!isStep) return <Redirect replace to={localizedPath(locale, '/onboarding/basics')} />
          return <AccountBoundary><OnboardingPage key={params.step} locale={locale} step={params.step as OnboardingStepKey} /></AccountBoundary>
        })}
      </Route>
      <Route path="/:locale/app/account">
        {(params) => withLocale(params.locale, (locale) => (
          <AccountBoundary><AppFrame locale={locale} tab="me">
            {({ preview }) => <AccountDataPage locale={locale} preview={preview} />}
          </AppFrame></AccountBoundary>
        ))}
      </Route>
      <Route path="/:locale/app/settings">
        {(params) => withLocale(params.locale, (locale) => (
          <AccountBoundary><AppFrame locale={locale} tab="me">
            {({ preview }) => <AccountSettingsPage locale={locale} preview={preview} />}
          </AppFrame></AccountBoundary>
        ))}
      </Route>
      <Route path="/:locale/app/import-plan">
        {(params) => withLocale(params.locale, (locale) => (
          <AccountBoundary><ExternalPlanImportPage locale={locale} /></AccountBoundary>
        ))}
      </Route>
      <Route path="/:locale/app/:tab">
        {(params) => withLocale(params.locale, (locale) => {
          const tab = appTabs.includes(params.tab as AppTab) ? params.tab as AppTab : 'today'
          return (
            <AccountBoundary><AppFrame locale={locale} tab={tab}>
              {({ plan, preview, loading, loadError, lastSyncedAt, onRetry }) => {
                if (tab === 'today') return <TodayPage lastSyncedAt={lastSyncedAt} loadError={loadError} locale={locale} onRetry={onRetry} plan={plan} preview={preview} />
                if (tab === 'plan') return <PlanPage lastSyncedAt={lastSyncedAt} loadError={loadError} loading={loading} locale={locale} onRetry={onRetry} plan={plan} preview={preview} />
                if (tab === 'progress') return <ProgressPage lastSyncedAt={lastSyncedAt} loadError={loadError} loading={loading} locale={locale} onRetry={onRetry} plan={plan} preview={preview} />
                return <MePage locale={locale} plan={plan} preview={preview} />
              }}
            </AppFrame></AccountBoundary>
          )
        })}
      </Route>
      <Route path="/:locale/pricing">
        {(params) => withLocale(params.locale, (locale) => <AccountBoundary><PricingPage locale={locale} /></AccountBoundary>)}
      </Route>
      <Route path="/:locale/safety">
        {(params) => withLocale(params.locale, (locale) => <SafetyPage locale={locale} />)}
      </Route>
      <Route path="/:locale/privacy">
        {(params) => withLocale(params.locale, (locale) => <LegalPage kind="privacy" locale={locale} />)}
      </Route>
      <Route path="/:locale/terms">
        {(params) => withLocale(params.locale, (locale) => <LegalPage kind="terms" locale={locale} />)}
      </Route>
      <Route path="/:locale">
        {(params) => withLocale(params.locale, (locale) => <LandingPage locale={locale} />)}
      </Route>
      <Route><Redirect replace to="/fa" /></Route>
        </Switch>
      </Suspense>
    </>
  )
}
