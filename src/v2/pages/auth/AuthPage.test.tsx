import type { User } from '@supabase/supabase-js'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { resources } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { AuthPage } from './AuthPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00.000Z',
    email: 'ava@example.com',
    id: '7df18aa8-d1d9-40aa-9326-22262d806db6',
    user_metadata: {},
    ...overrides,
  } as User
}

function createAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isConfigured: true,
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    resendConfirmation: vi.fn().mockResolvedValue(undefined),
    session: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue('confirmation-required'),
    status: 'anonymous',
    updatePassword: vi.fn().mockResolvedValue(undefined),
    user: null,
    ...overrides,
  }
}

function renderAuth(mode: 'sign-in' | 'sign-up' | 'recover' | 'update-password' | 'verify', auth = createAuth()) {
  return {
    auth,
    ...render(
      <I18nProvider>
        <AuthContext.Provider value={auth}>
          <AuthPage locale="en" mode={mode} />
        </AuthContext.Provider>
      </I18nProvider>,
    ),
  }
}

function fillCredentials(email = 'ava@example.com', password = 'password1') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  const passwordField = screen.queryByLabelText('Password')
  if (passwordField) fireEvent.change(passwordField, { target: { value: password } })
}

function submitNamed(name: string) {
  fireEvent.submit(screen.getByRole('button', { name }).closest('form')!)
}

describe('AuthPage screen states', { timeout: 15_000 }, () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    sessionStorage.clear()
    await i18n.changeLanguage('en')
  })

  afterEach(async () => {
    await i18n.changeLanguage('fa')
  })

  it('keeps auth copy keys in both locales, including resend interpolation', () => {
    const keys = [
      'offline', 'rateLimited', 'unverified', 'invalidLink', 'emailInvalid', 'passwordMismatch',
      'termsRequired', 'privacyRequired', 'fixFields', 'recoverSent', 'passwordUpdated',
      'verifyComplete', 'verifyWaiting', 'continueOnboarding', 'resendWait', 'resend',
      'resendSent', 'readDocument', 'requestNewLink', 'passwordConfirm',
    ] as const
    for (const key of keys) {
      expect(resources.fa.translation.auth[key]).toBeTruthy()
      expect(resources.en.translation.auth[key]).toBeTruthy()
    }
    expect(resources.en.translation.auth.resendWait).toContain('{{seconds}}')
    expect(resources.fa.translation.auth.resendWait).toContain('{{seconds}}')
  })

  it('AUTH-01 renders sign-in with recovery and create-account paths', () => {
    renderAuth('sign-in')
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New here? Create an account' })).toHaveAttribute('href', '/en/auth/sign-up')
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/en/auth/recover')
  })

  it('AUTH-02 keeps sign-in values while showing field-level validation', () => {
    renderAuth('sign-in')
    fillCredentials('not-an-email', 'short')
    submitNamed('Sign in to Momentum')
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument()
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Correct the highlighted fields. Your values are still here.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('not-an-email')
    expect(screen.getByLabelText('Password')).toHaveValue('short')
  })

  it('AUTH-03 blocks duplicate sign-in while submitting', async () => {
    let release!: () => void
    const signIn = vi.fn(() => new Promise<void>((resolve) => { release = resolve }))
    renderAuth('sign-in', createAuth({ signIn }))
    fillCredentials()
    submitNamed('Sign in to Momentum')
    const submit = await screen.findByRole('button', { name: 'Sign in to Momentum' })
    expect(submit).toBeDisabled()
    release()
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ava@example.com', 'password1'))
  })

  it('AUTH-04 shows a non-enumerating credential error', async () => {
    const signIn = vi.fn().mockRejectedValue({ code: 'invalid_credentials', message: 'Invalid login credentials' })
    renderAuth('sign-in', createAuth({ signIn }))
    fillCredentials()
    submitNamed('Sign in to Momentum')
    expect(await screen.findByText('We could not sign you in. Check your details and try again.')).toBeInTheDocument()
    expect(screen.queryByText(/no account/i)).not.toBeInTheDocument()
  })

  it('AUTH-05 explains verification and offers resend', async () => {
    const signIn = vi.fn().mockRejectedValue({ code: 'email_not_confirmed', message: 'Email not confirmed' })
    const auth = createAuth({ signIn })
    renderAuth('sign-in', auth)
    fillCredentials()
    submitNamed('Sign in to Momentum')
    expect(await screen.findByText(/This email is not verified yet/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation link' }))
    await waitFor(() => expect(auth.resendConfirmation).toHaveBeenCalledWith('ava@example.com', 'en'))
  })

  it('AUTH-06 shows an offline wait instead of a submit action', () => {
    const auth = createAuth()
    online.mockReturnValue(false)
    renderAuth('sign-in', auth)
    expect(screen.getByText('You are offline. Try again when the connection returns.')).toBeInTheDocument()
    fillCredentials()
    submitNamed('Sign in to Momentum')
    expect(screen.getAllByText('You are offline. Try again when the connection returns.').length).toBeGreaterThan(0)
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('AUTH-06 surfaces rate-limit retry-after separately from offline', async () => {
    const signIn = vi.fn().mockRejectedValue({ status: 429, message: 'rate limit' })
    renderAuth('sign-in', createAuth({ signIn }))
    fillCredentials()
    submitNamed('Sign in to Momentum')
    expect(await screen.findByText('We cannot send another email yet. Wait and try again.')).toBeInTheDocument()
    expect(screen.queryByText('You are offline. Try again when the connection returns.')).not.toBeInTheDocument()
  })

  it('AUTH-07 renders sign-up with versioned terms and privacy consent', () => {
    renderAuth('sign-up')
    expect(screen.getByRole('heading', { name: 'Build your Momentum' })).toBeInTheDocument()
    expect(screen.getByText('I have read and accept the Terms of Use.')).toBeInTheDocument()
    expect(screen.getByText('I accept the Privacy Policy and data-retention practices.')).toBeInTheDocument()
    expect(screen.getAllByText(/2026-08-01-alpha/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('AUTH-08 keeps sign-up values when password and consent are missing', () => {
    renderAuth('sign-up')
    fillCredentials('sara@example.com', 'short')
    submitNamed('Create secure account')
    expect(screen.getByText('Accept the Terms separately.')).toBeInTheDocument()
    expect(screen.getByText('Accept the Privacy Policy separately.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('sara@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('short')
  })

  it('AUTH-09 blocks duplicate sign-up while submitting', async () => {
    let release!: () => void
    const signUp = vi.fn(() => new Promise<'confirmation-required'>((resolve) => { release = () => resolve('confirmation-required') }))
    renderAuth('sign-up', createAuth({ signUp }))
    fillCredentials()
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    fireEvent.click(screen.getAllByRole('checkbox')[1]!)
    submitNamed('Create secure account')
    expect(await screen.findByRole('button', { name: 'Create secure account' })).toBeDisabled()
    release()
    await waitFor(() => expect(signUp).toHaveBeenCalledWith('ava@example.com', 'password1', 'en'))
  })

  it('AUTH-10 keeps existing-account failures non-enumerating', async () => {
    const signUp = vi.fn().mockRejectedValue({ message: 'User already registered' })
    renderAuth('sign-up', createAuth({ signUp }))
    fillCredentials()
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    fireEvent.click(screen.getAllByRole('checkbox')[1]!)
    submitNamed('Create secure account')
    expect(await screen.findByText('We could not sign you in. Check your details and try again.')).toBeInTheDocument()
    expect(screen.queryByText(/already registered/i)).not.toBeInTheDocument()
  })

  it('AUTH-11 and AUTH-12 show a durable verification wait with the pending email', () => {
    sessionStorage.setItem('momentum.pendingVerificationEmail', 'ava@example.com')
    renderAuth('verify')
    expect(screen.getByText('Open the verification link from your email. You can leave this page and come back.')).toBeInTheDocument()
    expect(screen.getByText('ava@example.com')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sign in' }).some((link) => link.getAttribute('href') === '/en/auth/sign-in')).toBe(true)
  })

  it('AUTH-13 shows remaining resend wait after sending a link', async () => {
    sessionStorage.setItem('momentum.pendingVerificationEmail', 'ava@example.com')
    const auth = createAuth()
    renderAuth('verify', auth)
    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation link' }))
    expect(await screen.findByText('A fresh link was sent.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled()
    expect(auth.resendConfirmation).toHaveBeenCalledWith('ava@example.com', 'en')
  })

  it('AUTH-14 asks for a new link when the recovery session is missing', () => {
    renderAuth('update-password')
    expect(screen.getByText('This link is invalid or expired. Request a new one.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/en/auth/recover')
  })

  it('AUTH-15 continues to onboarding after verification', () => {
    renderAuth('verify', createAuth({
      status: 'authenticated',
      user: fakeUser({ email_confirmed_at: '2026-08-01T00:00:00.000Z' }),
    }))
    expect(screen.getByText('Email verified. Your account is ready to continue.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue onboarding' })).toHaveAttribute('href', '/en/onboarding')
  })

  it('AUTH-16 requests recovery without revealing whether the account exists', async () => {
    const auth = createAuth()
    renderAuth('recover', auth)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ava@example.com' } })
    submitNamed('Send link')
    expect(await screen.findByText('If an account exists for this email, a recovery link will be sent.')).toBeInTheDocument()
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('ava@example.com', 'en')
    expect(screen.getByRole('link', { name: 'Already have an account? Sign in' })).toHaveAttribute('href', '/en/auth/sign-in')
  })

  it('AUTH-17 keeps recover confirmation and surfaces rate-limit separately', async () => {
    const requestPasswordReset = vi.fn().mockRejectedValue({ status: 429, message: 'rate limit' })
    renderAuth('recover', createAuth({ requestPasswordReset }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ava@example.com' } })
    submitNamed('Send link')
    expect(await screen.findByText('We cannot send another email yet. Wait and try again.')).toBeInTheDocument()
  })

  it('AUTH-18 validates, updates, and rejects mismatched passwords on a valid recovery session', async () => {
    const auth = createAuth({ user: fakeUser() })
    renderAuth('update-password', auth)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password2' } })
    submitNamed('Save new password')
    expect(screen.getByText('Both passwords must match.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveValue('password1')

    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password1' } })
    submitNamed('Save new password')
    expect(await screen.findByText('Password updated. You can now sign in.')).toBeInTheDocument()
    expect(auth.updatePassword).toHaveBeenCalledWith('password1')
  })
})
