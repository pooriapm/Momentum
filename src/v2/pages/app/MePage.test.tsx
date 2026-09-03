import type { User } from '@supabase/supabase-js'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { demoPlan } from '../../data/demo'
import { MePage } from './MePage'

const runtimeMock = vi.hoisted(() => ({
  runtimeConfig: {
    appEnvironment: 'test',
    hasSupabase: false,
    privacyEmail: '',
    supabasePublishableKey: '',
    supabaseUrl: '',
    supportEmail: '',
  },
}))

vi.mock('../../../platform/config/runtime', () => runtimeMock)

function fakeUser(): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00.000Z',
    email: 'ava@example.com',
    id: '7df18aa8-d1d9-40aa-9326-22262d806db6',
    user_metadata: {},
  } as User
}

function renderMe(overrides: Partial<Parameters<typeof MePage>[0]> & { signOut?: AuthContextValue['signOut'] } = {}) {
  const signOut = overrides.signOut ?? vi.fn().mockResolvedValue(undefined)
  const auth: AuthContextValue = {
    isConfigured: true,
    requestPasswordReset: vi.fn(),
    resendConfirmation: vi.fn(),
    session: null,
    signIn: vi.fn(),
    signOut,
    signUp: vi.fn(),
    status: 'authenticated',
    updatePassword: vi.fn(),
    user: fakeUser(),
  }
  return {
    signOut,
    ...render(
      <I18nProvider>
        <AuthContext.Provider value={auth}>
          <MePage locale="en" plan={demoPlan} preview={false} {...overrides} />
        </AuthContext.Provider>
      </I18nProvider>,
    ),
  }
}

describe('MePage inventory states', () => {
  beforeEach(async () => {
    runtimeMock.runtimeConfig.privacyEmail = ''
    runtimeMock.runtimeConfig.supportEmail = ''
    await i18n.changeLanguage('en')
  })

  it('ME-01 keeps a minimal hub without a Private badge', () => {
    renderMe()
    expect(screen.getByRole('heading', { name: /ava/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /profile & preferences/i })).toHaveAttribute('href', '/en/app/settings')
    expect(screen.getByRole('button', { name: /subscription/i })).toBeInTheDocument()
    expect(screen.queryByText(/private/i)).not.toBeInTheDocument()
  })

  it('ME-05 shows one Momentum membership and immutable history', () => {
    renderMe({ panel: 'subscription', membershipStatus: 'active' })
    expect(screen.getAllByRole('heading', { name: 'Momentum membership' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/there is one momentum membership/i)).toBeInTheDocument()
    expect(screen.getByText(/dual plans are not offered/i)).toBeInTheDocument()
    expect(screen.getByText('Plan history')).toBeInTheDocument()
  })

  it('LIFE-08 and LIFE-10 keep a single offer and block generation while pending', () => {
    renderMe({ panel: 'subscription', membershipStatus: 'pending' })
    expect(screen.getAllByText(/a new plan will not start/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /recover payment/i })).toHaveAttribute('href', '/en/pricing')
  })

  it('keeps cancelled membership terminal instead of presenting it as active', () => {
    renderMe({ panel: 'subscription', membershipStatus: 'cancelled' })
    expect(screen.getAllByText(/cancelled or expired/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /start membership/i })).toHaveAttribute('href', '/en/pricing')
    expect(screen.queryByRole('button', { name: /renewal is active/i })).not.toBeInTheDocument()
  })

  it('ME-08 keeps help, safety, and legal reachable from Me', () => {
    renderMe({ panel: 'help' })
    expect(screen.getByRole('link', { name: /safety guidance/i })).toHaveAttribute('href', '/en/safety')
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/en/privacy')
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/en/terms')
    expect(screen.getByText(/momentum is not an emergency service/i)).toBeInTheDocument()
    expect(screen.getByText(/contact local emergency services/i)).toBeInTheDocument()
  })

  it('shows a mailto support path when the operator sets VITE_SUPPORT_EMAIL', () => {
    runtimeMock.runtimeConfig.supportEmail = 'support@example.com'
    renderMe({ panel: 'help' })
    expect(screen.getByRole('link', { name: /email support/i })).toHaveAttribute(
      'href',
      'mailto:support@example.com?subject=Momentum%20support',
    )
    expect(screen.getByRole('link', { name: 'PLAN-IMPORT-207' })).toHaveAttribute(
      'href',
      'mailto:support@example.com?subject=Momentum%20support%20PLAN-IMPORT-207',
    )
    expect(screen.getByText(/do not send health details, passwords, or plan json/i)).toBeInTheDocument()
    expect(screen.queryByText(/public invite waits until the operator sets the support address/i)).not.toBeInTheDocument()
    expect(screen.getByText(/momentum is not an emergency service/i)).toBeInTheDocument()
  })

  it('does not invent a support mailbox when VITE_SUPPORT_EMAIL is empty', () => {
    renderMe({ panel: 'help' })
    expect(screen.getByText(/public invite waits until the operator sets the support address/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /email support/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^mailto:/i })).not.toBeInTheDocument()
    expect(screen.getByText('PLAN-IMPORT-207')).toBeInTheDocument()
    expect(screen.getByText(/momentum is not an emergency service/i)).toBeInTheDocument()
  })

  it('keeps Persian support codes and emergency copy on the help panel', async () => {
    await i18n.changeLanguage('fa')
    renderMe({ locale: 'fa', panel: 'help' })
    expect(screen.getByRole('heading', { name: /راهنما، ایمنی و قوانین/ })).toBeInTheDocument()
    expect(screen.getByText('PLAN-IMPORT-207')).toBeInTheDocument()
    expect(screen.getByText(/ورود برنامه ناموفق/)).toBeInTheDocument()
    expect(screen.getByText(/سرویس اورژانسی نیست/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ایمیل پشتیبانی/ })).not.toBeInTheDocument()
  })

  it('ME-09 confirms this-device or all-device sign-out and recovers from failure', async () => {
    const signOut = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
    renderMe({ signOut })
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(screen.getByRole('heading', { name: /where should we sign you out/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /all devices/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign out selected devices/i }))
    expect(await screen.findByText(/sign-out failed/i)).toBeInTheDocument()
    expect(screen.getByText(/SIGNOUT-17/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /sign out selected devices/i }))
    expect(signOut).toHaveBeenLastCalledWith({ scope: 'global' })
  })

  it('does not pressure a streak when training is paused', () => {
    renderMe({ plan: { ...demoPlan, progress: { ...demoPlan.progress, safetyPaused: true } } })
    expect(screen.getByText(/there is no pressure to keep a streak/i)).toBeInTheDocument()
    expect(screen.queryByText(/current streak|logged days/i)).not.toBeInTheDocument()
  })
})
