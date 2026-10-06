import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { LocalizedStory } from '../../../../.storybook/LocalizedStory'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { intlMembershipCatalog } from '../../entitlement'
import { LandingPage } from './LandingPage'
import { LegalPage } from './LegalPage'
import { PricingPage } from './PricingPage'
import { SafetyPage } from './SafetyPage'
import './public-pages.stories.css'

const pricingClient = new QueryClient()
const storyAuth: AuthContextValue = {
  isConfigured: true,
  requestPasswordReset: async () => {},
  resendConfirmation: async () => {},
  session: null,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => 'confirmation-required',
  status: 'anonymous',
  updatePassword: async () => {},
  user: null,
}

function localeFromGlobal(value: unknown): AppLocale {
  return value === 'en' ? 'en' : 'fa'
}

function Screen({ children, locale }: { children: ReactNode; locale: AppLocale }) {
  return (
    <div className="mo-screen-story">
      <LocalizedStory locale={locale}>{children}</LocalizedStory>
    </div>
  )
}

const meta = {
  title: 'Screens/Public',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production public pages rendered with the shared Light/Dark and FA/EN toolbars. Pricing uses an isolated product fixture and never calls the network.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Landing: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LandingPage locale={locale} /></Screen>
  },
}

export const Safety: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><SafetyPage locale={locale} /></Screen>
  },
}

export const Privacy: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LegalPage kind="privacy" locale={locale} /></Screen>
  },
}

export const Terms: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LegalPage kind="terms" locale={locale} /></Screen>
  },
}

export const Pricing: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return (
      <Screen locale={locale}>
        <QueryClientProvider client={pricingClient}>
          <AuthContext.Provider value={storyAuth}>
            <PricingPage catalog={intlMembershipCatalog} giftCampaign="available" locale={locale} />
          </AuthContext.Provider>
        </QueryClientProvider>
      </Screen>
    )
  },
}
