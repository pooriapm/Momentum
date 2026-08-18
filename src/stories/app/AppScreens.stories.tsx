import type { User } from '@supabase/supabase-js'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { mocked } from 'storybook/test'
import { LocalizedStory } from '../../../.storybook/LocalizedStory'
import { AuthContext, type AuthContextValue } from '../../platform/auth/auth-context'
import type { AppLocale } from '../../platform/i18n/catalog'
import { useOnlineStatus } from '../../platform/pwa/network'
import { QueryProvider } from '../../platform/query/QueryProvider'
import { AppFrame } from '../../v2/components/AppFrame'
import { demoPlan } from '../../v2/data/demo'
import { loadAccountDashboard } from '../../v2/data/repository'
import type { MomentumPlanView } from '../../v2/data/types'
import { AccountDataPage } from '../../v2/pages/app/AccountDataPage'
import { AccountSettingsPage } from '../../v2/pages/app/AccountSettingsPage'
import { MePage } from '../../v2/pages/app/MePage'
import { PlanPage } from '../../v2/pages/app/PlanPage'
import { ProgressPage } from '../../v2/pages/app/ProgressPage'
import { TodayPage } from '../../v2/pages/app/TodayPage'
import './app-stories.css'

const storyUser = {
  app_metadata: {}, aud: 'authenticated', created_at: '2026-07-14T08:00:00.000Z',
  email: 'ava@example.com', id: '7df18aa8-d1d9-40aa-9326-22262d806db6', user_metadata: { name: 'Ava' },
} as User

const storyAuth: AuthContextValue = {
  isConfigured: true, requestPasswordReset: async () => undefined, resendConfirmation: async () => undefined, session: null,
  signIn: async () => undefined, signOut: async () => undefined,
  signUp: async () => 'authenticated', status: 'authenticated',
  updatePassword: async () => undefined, user: storyUser,
}

function localeFromGlobal(value: unknown): AppLocale { return value === 'en' ? 'en' : 'fa' }

function Screen({ children, locale, width = 'desktop' }: { children: ReactNode; locale: AppLocale; width?: 'desktop' | 'mobile' }) {
  return (
    <LocalizedStory locale={locale}>
      <AuthContext.Provider value={storyAuth}>
        <QueryProvider><div className={`mo-app-story mo-app-story--${width}`}>{children}</div></QueryProvider>
      </AuthContext.Provider>
    </LocalizedStory>
  )
}

function planForRestDay(): MomentumPlanView {
  const day = demoPlan.days?.find((item) => !item.workout) ?? demoPlan.days?.[1]
  return { ...structuredClone(demoPlan), ...(day ?? {}), workout: null, progress: { ...demoPlan.progress, readiness: 61, recovery: 88 } }
}

const storyPlan: MomentumPlanView = {
  ...demoPlan,
  progress: { ...demoPlan.progress, entitlementLabel: { fa: 'عضویت Momentum', en: 'Momentum membership' } },
}

const meta = {
  title: 'Screens/App',
  parameters: {
    controls: { disable: true }, layout: 'fullscreen',
    docs: { description: { component: 'Development-ready application screens using the production components and a deterministic local plan. Use the toolbar for Light/Dark and Persian/English. No network request is made.' } },
  },
  beforeEach: () => {
    mocked(useOnlineStatus).mockReturnValue(true)
    return () => mocked(useOnlineStatus).mockReset()
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const TodayActivePlan: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><TodayPage locale={locale} plan={storyPlan} preview /></Screen> } }
export const TodayRestDay: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><TodayPage locale={locale} plan={planForRestDay()} preview /></Screen> } }
export const TodayNoPlan: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><TodayPage locale={locale} plan={null} preview /></Screen> } }

export const PlanNutrition: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><PlanPage initialSegment="nutrition" locale={locale} plan={storyPlan} preview /></Screen> } }
export const PlanWorkout: Story = {
  render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><PlanPage initialSegment="training" locale={locale} plan={storyPlan} preview /></Screen> },
}
export const PlanShoppingList: Story = {
  render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><PlanPage initialSegment="grocery" locale={locale} plan={storyPlan} preview /></Screen> },
}
export const ProgressOverview: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><ProgressPage locale={locale} plan={storyPlan} preview /></Screen> } }
export const MeAndPreferences: Story = {
  globals: {
    viewport: { value: 'compact390', isRotated: false },
  },
  parameters: {
    viewport: { defaultViewport: 'compact390' },
    docs: {
      description: {
        story: 'Minimal Me hub in a 390×844 iPhone 13 frame. Install appears only when the app is not already installed.',
      },
    },
  },
  beforeEach: () => {
    mocked(useOnlineStatus).mockReturnValue(true)
    mocked(loadAccountDashboard).mockResolvedValue({
      aiCountryVerified: true,
      aiPlanAccess: { reason: 'eligible', state: 'ready' },
      automationBlockReason: null,
      countryCode: 'DE',
      onboardingStatus: 'complete',
      plan: storyPlan,
    })
    return () => {
      mocked(useOnlineStatus).mockReset()
      mocked(loadAccountDashboard).mockReset()
    }
  },
  render: (_, c) => {
    const locale = localeFromGlobal(c.globals.locale)
    return (
      <LocalizedStory locale={locale}>
        <AuthContext.Provider value={storyAuth}>
          <QueryProvider>
            <div className="mo-app-story mo-app-story--phone">
              <AppFrame locale={locale} tab="me">
                {({ plan, preview }) => <MePage locale={locale} plan={plan} preview={preview} />}
              </AppFrame>
            </div>
          </QueryProvider>
        </AuthContext.Provider>
      </LocalizedStory>
    )
  },
}
export const AccountSettings: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><AccountSettingsPage locale={locale} preview /></Screen> } }
export const PrivacyAndAccountData: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Screen locale={locale}><AccountDataPage locale={locale} preview /></Screen> } }

export const TodayMobile: Story = {
  globals: {
    viewport: { value: 'compact390', isRotated: false },
  },
  parameters: {
    viewport: { defaultViewport: 'compact390' },
    docs: {
      description: {
        story: 'Production Today in a 390×844 iPhone 13 frame. Horizontal overflow is clipped; vertical scroll stays inside the device.',
      },
    },
  },
  beforeEach: () => {
    mocked(useOnlineStatus).mockReturnValue(true)
    mocked(loadAccountDashboard).mockResolvedValue({
      aiCountryVerified: true,
      aiPlanAccess: { reason: 'eligible', state: 'ready' },
      automationBlockReason: null,
      countryCode: 'DE',
      onboardingStatus: 'complete',
      plan: storyPlan,
    })
    return () => {
      mocked(useOnlineStatus).mockReset()
      mocked(loadAccountDashboard).mockReset()
    }
  },
  render: (_, c) => {
    const locale = localeFromGlobal(c.globals.locale)
    return (
      <LocalizedStory locale={locale}>
        <AuthContext.Provider value={storyAuth}>
          <QueryProvider>
            <div className="mo-app-story mo-app-story--phone">
              <AppFrame locale={locale} tab="today">
                {({ plan, preview }) => <TodayPage locale={locale} plan={plan} preview={preview} />}
              </AppFrame>
            </div>
          </QueryProvider>
        </AuthContext.Provider>
      </LocalizedStory>
    )
  },
}
