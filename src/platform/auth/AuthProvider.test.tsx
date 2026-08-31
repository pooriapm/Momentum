import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './auth-context'
import { AuthProvider } from './AuthProvider'
import { resolveSignupRegion } from './signup-region'
import { requireSupabase } from '../data/supabase'

vi.mock('../config/runtime', () => ({
  runtimeConfig: {
    appEnvironment: 'test',
    hasSupabase: true,
    supabasePublishableKey: 'test-publishable-key',
    supabaseUrl: 'https://test.supabase.co',
  },
}))

vi.mock('../pwa/network', () => ({
  assertOnline: vi.fn(),
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('./signup-region', () => ({
  resolveSignupRegion: vi.fn(),
}))

vi.mock('../data/supabase', () => {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resend: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  }
  const rpc = vi.fn().mockResolvedValue({
    data: {
      terms: '2026-08-01-alpha',
      privacy: '2026-08-01-alpha',
      health: '2026-08-01-alpha',
    },
    error: null,
  })
  return {
    supabase: { auth, rpc },
    requireSupabase: () => ({ auth, rpc }),
  }
})

const authApi = requireSupabase().auth as unknown as {
  getSession: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  signInWithPassword: ReturnType<typeof vi.fn>
  signUp: ReturnType<typeof vi.fn>
  resend: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  resetPasswordForEmail: ReturnType<typeof vi.fn>
  updateUser: ReturnType<typeof vi.fn>
}
const mockedResolveSignupRegion = vi.mocked(resolveSignupRegion)

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <button onClick={() => void auth.signUp('ava@example.com', 'password1', 'fa')} type="button">sign-up</button>
      <button onClick={() => void auth.resendConfirmation('ava@example.com', 'en')} type="button">resend</button>
    </div>
  )
}

describe('AuthProvider signup payment route and resend', { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.getSession.mockResolvedValue({ data: { session: null }, error: null })
    authApi.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    mockedResolveSignupRegion.mockResolvedValue({
      countryCode: 'IR',
      productRegion: 'ir',
      source: 'ip_at_signup',
    })
  })

  it('stores suggested payment route and explicit language with legal versions', async () => {
    authApi.signUp.mockResolvedValue({ data: { session: null }, error: null })
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'sign-up' }))

    await waitFor(() => expect(authApi.signUp).toHaveBeenCalled())
    expect(authApi.signUp).toHaveBeenCalledWith({
      email: 'ava@example.com',
      password: 'password1',
      options: {
        data: {
          locale: 'fa-IR',
          product_region: 'ir',
          product_region_source: 'ip_at_signup',
          country_code: 'IR',
          terms_version: '2026-08-01-alpha',
          privacy_version: '2026-08-01-alpha',
          health_consent_version: '2026-08-01-alpha',
        },
        emailRedirectTo: `${window.location.origin}/fa/auth/verify`,
      },
    })
  })

  it('resends signup confirmation to the verify route', async () => {
    authApi.resend.mockResolvedValue({ error: null })
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'resend' }))

    await waitFor(() => expect(authApi.resend).toHaveBeenCalledWith({
      email: 'ava@example.com',
      type: 'signup',
      options: { emailRedirectTo: `${window.location.origin}/en/auth/verify` },
    }))
  })
})
