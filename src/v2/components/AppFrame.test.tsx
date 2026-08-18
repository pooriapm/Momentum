import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../platform/auth/auth-context'
import { I18nProvider } from '../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../platform/pwa/network'
import { demoPlan } from '../data/demo'
import { loadAccountDashboard, type AccountDashboardView } from '../data/repository'
import { MePage } from '../pages/app/MePage'
import { PlanPage } from '../pages/app/PlanPage'
import { TodayPage } from '../pages/app/TodayPage'
import { AppFrame, type AppFrameContentContext, type AppTab } from './AppFrame'

vi.mock('../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

vi.mock('../data/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/repository')>()
  return { ...actual, loadAccountDashboard: vi.fn() }
})

const online = vi.mocked(useOnlineStatus)
const loadDashboard = vi.mocked(loadAccountDashboard)

const user = {
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-08-01T00:00:00.000Z',
  email: 'ava@example.com',
  id: '7df18aa8-d1d9-40aa-9326-22262d806db6',
  user_metadata: {},
} as User

function dashboard(plan: AccountDashboardView['plan'] = demoPlan): AccountDashboardView {
  return {
    aiCountryVerified: true,
    aiPlanAccess: { reason: 'eligible', state: 'ready' },
    automationBlockReason: null,
    countryCode: 'DE',
    entitlementStatus: 'gift',
    onboardingStatus: 'complete',
    plan,
  }
}

function authValue(): AuthContextValue {
  return {
    isConfigured: true,
    requestPasswordReset: vi.fn(),
    resendConfirmation: vi.fn(),
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    status: 'authenticated',
    updatePassword: vi.fn(),
    user,
  }
}

function livePage({ lastSyncedAt, loadError, loading, onRetry, plan, preview }: AppFrameContentContext, tab: AppTab) {
  if (tab === 'today') return <TodayPage lastSyncedAt={lastSyncedAt} loadError={loadError} locale="en" onRetry={onRetry} plan={plan} preview={preview} />
  if (tab === 'plan') return <PlanPage lastSyncedAt={lastSyncedAt} loadError={loadError} loading={loading} locale="en" onRetry={onRetry} plan={plan} preview={preview} />
  return <MePage locale="en" plan={plan} preview={preview} />
}

function renderLiveApp(tab: AppTab, client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })) {
  function Tree({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <AuthContext.Provider value={authValue()}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </AuthContext.Provider>
      </I18nProvider>
    )
  }

  return {
    client,
    ...render(
      <Tree>
        <AppFrame locale="en" tab={tab}>
          {(context) => livePage(context, tab)}
        </AppFrame>
      </Tree>,
    ),
  }
}

describe('AppFrame live plan query surfaces', () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    loadDashboard.mockReset()
    sessionStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('PLAN-08 shows the week-geometry skeleton instead of the generic app loader', async () => {
    loadDashboard.mockImplementation(() => new Promise(() => {}))
    renderLiveApp('plan')
    expect(await screen.findByLabelText('Loading plan')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('The final Week-view geometry is preserved')).toBeInTheDocument()
    expect(document.querySelectorAll('.plan-skeleton-day').length).toBe(7)
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('PLAN-10 retries a cold plan load error from the page, not app-load-error', async () => {
    loadDashboard.mockRejectedValue(new Error('plan unavailable'))
    renderLiveApp('plan')
    expect(await screen.findByRole('heading', { name: /the latest plan could not be loaded/i })).toBeInTheDocument()
    expect(screen.queryByText('Your plan could not be loaded')).not.toBeInTheDocument()
    expect(loadDashboard).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(loadDashboard).toHaveBeenCalledTimes(2))
  })

  it('TODAY-09 retries a recoverable load error while keeping chrome and the cached plan safe', async () => {
    loadDashboard.mockRejectedValue(new Error('plan unavailable'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
    client.setQueryData(['active-plan', user.id, 'en'], dashboard())
    renderLiveApp('today', client)
    expect(await screen.findByRole('heading', { name: /today’s plan could not be loaded/i })).toBeInTheDocument()
    expect(screen.getByText(/saved plan is safe/i)).toBeInTheDocument()
    expect(screen.getByText(/the plan could not refresh/i)).toBeInTheDocument()
    expect(screen.queryByText('Your plan could not be loaded')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(loadDashboard).toHaveBeenCalled())
  })

  it('keeps the Me tab on the generic load-error chrome', async () => {
    loadDashboard.mockRejectedValue(new Error('plan unavailable'))
    renderLiveApp('me')
    expect(await screen.findByText('Your plan could not be loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(loadDashboard).toHaveBeenCalledTimes(2))
  })
})
