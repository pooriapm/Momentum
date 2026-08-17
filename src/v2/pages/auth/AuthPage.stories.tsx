import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { LocalizedStory } from '../../../../.storybook/LocalizedStory'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { AuthPage } from './AuthPage'
import '../public/public-pages.stories.css'

type AuthMode = 'sign-in' | 'sign-up' | 'recover' | 'update-password' | 'verify'

const mockAuth: AuthContextValue = {
  isConfigured: true,
  requestPasswordReset: async () => undefined,
  resendConfirmation: async () => undefined,
  session: null,
  signIn: async () => undefined,
  signOut: async () => undefined,
  signUp: async () => 'confirmation-required',
  status: 'anonymous',
  updatePassword: async () => undefined,
  user: null,
}

function localeFromGlobal(value: unknown): AppLocale {
  return value === 'en' ? 'en' : 'fa'
}

function AuthScreen({ locale, mode }: { locale: AppLocale; mode: AuthMode }) {
  return (
    <div className="mo-screen-story">
      <LocalizedStory locale={locale}>
        <AuthContext.Provider value={mockAuth}>
          <AuthPage locale={locale} mode={mode} />
        </AuthContext.Provider>
      </LocalizedStory>
    </div>
  )
}

function renderMode(mode: AuthMode) {
  return (_args: unknown, context: { globals: Record<string, unknown> }): ReactElement => (
    <AuthScreen locale={localeFromGlobal(context.globals.locale)} mode={mode} />
  )
}

const meta = {
  title: 'Screens/Auth',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'All production authentication modes backed by an in-memory Auth context. No Supabase request is made.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SignIn: Story = { render: renderMode('sign-in') }
export const SignUp: Story = { render: renderMode('sign-up') }
export const RecoverPassword: Story = { render: renderMode('recover') }
export const UpdatePassword: Story = { render: renderMode('update-password') }
export const VerifyEmail: Story = { render: renderMode('verify') }
