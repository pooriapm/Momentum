import type { User } from '@supabase/supabase-js'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { mocked } from 'storybook/test'
import { LocalizedStory } from '../../../.storybook/LocalizedStory'
import { AuthContext, type AuthContextValue } from '../../platform/auth/auth-context'
import type { AppLocale } from '../../platform/i18n/catalog'
import { QueryProvider } from '../../platform/query/QueryProvider'
import { AppFrame, type AppTab } from '../../v2/components/AppFrame'
import { demoPlan } from '../../v2/data/demo'
import { loadAccountDashboard } from '../../v2/data/repository'
import { MePage } from '../../v2/pages/app/MePage'
import { PlanPage } from '../../v2/pages/app/PlanPage'
import { ProgressPage } from '../../v2/pages/app/ProgressPage'
import { TodayPage } from '../../v2/pages/app/TodayPage'

const user = { app_metadata: {}, aud: 'authenticated', created_at: '2026-07-14T08:00:00.000Z', email: 'ava@example.com', id: '7df18aa8-d1d9-40aa-9326-22262d806db6', user_metadata: {} } as User
const auth: AuthContextValue = { isConfigured: true, requestPasswordReset: async () => undefined, resendConfirmation: async () => undefined, session: null, signIn: async () => undefined, signOut: async () => undefined, signUp: async () => 'authenticated', status: 'authenticated', updatePassword: async () => undefined, user }
function localeFromGlobal(value: unknown): AppLocale { return value === 'en' ? 'en' : 'fa' }

function FullApp({ locale, tab }: { locale: AppLocale; tab: AppTab }) {
  const page = { today: TodayPage, plan: PlanPage, progress: ProgressPage, me: MePage }[tab]
  const Page = page
  return <LocalizedStory locale={locale}><AuthContext.Provider value={auth}><QueryProvider><AppFrame locale={locale} tab={tab}>{({ plan, preview }) => <Page locale={locale} plan={plan} preview={preview} />}</AppFrame></QueryProvider></AuthContext.Provider></LocalizedStory>
}

function renderTab(tab: AppTab) { return (_: unknown, c: { globals: Record<string, unknown> }) => <FullApp locale={localeFromGlobal(c.globals.locale)} tab={tab} /> }

const meta = {
  title: 'Screens/App shell',
  parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'The complete production application chrome with functional Liquid Glass reserved for sidebar and compact navigation. Account data is local and deterministic.' } } },
  beforeEach: () => {
    mocked(loadAccountDashboard).mockResolvedValue({ aiPlanAccess: { reason: 'eligible', state: 'ready' }, automationBlockReason: null, countryCode: 'DE', onboardingStatus: 'complete', plan: demoPlan })
    return () => mocked(loadAccountDashboard).mockReset()
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Today: Story = { render: renderTab('today') }
export const Plan: Story = { render: renderTab('plan') }
export const Progress: Story = { render: renderTab('progress') }
export const Me: Story = { render: renderTab('me') }
