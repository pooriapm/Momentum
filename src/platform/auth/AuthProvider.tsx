import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { LEGAL_DOCUMENT_VERSION } from '../../config/legal'
import { runtimeConfig } from '../config/runtime'
import { requireSupabase, supabase } from '../data/supabase'
import { assertOnline } from '../pwa/network'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'
import { resolveSignupRegion } from './signup-region'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const activeUserId = useRef<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    runtimeConfig.hasSupabase ? 'loading' : 'anonymous',
  )

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return
      }
      activeUserId.current = data.session?.user.id ?? null
      setSession(data.session)
      setStatus(data.session ? 'authenticated' : 'anonymous')
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null
      if (activeUserId.current && activeUserId.current !== nextUserId) {
        queryClient.clear()
      }
      activeUserId.current = nextUserId
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'anonymous')
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const signIn = useCallback(async (email: string, password: string) => {
    assertOnline()
    const client = requireSupabase()
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
    queryClient.clear()
  }, [queryClient])

  const signUp = useCallback(async (email: string, password: string, locale: 'fa' | 'en') => {
    assertOnline()
    const client = requireSupabase()
    const region = await resolveSignupRegion(locale)
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          locale: locale === 'fa' ? 'fa-IR' : 'en-US',
          product_region: region.productRegion,
          product_region_source: region.source,
          ...(region.countryCode ? { country_code: region.countryCode } : {}),
          terms_version: LEGAL_DOCUMENT_VERSION,
          privacy_version: LEGAL_DOCUMENT_VERSION,
        },
        emailRedirectTo: `${window.location.origin}/${locale}/auth/verify`,
      },
    })
    if (error) {
      throw error
    }
    return data.session ? 'authenticated' : 'confirmation-required'
  }, [])

  const resendConfirmation = useCallback(async (email: string, locale: 'fa' | 'en') => {
    assertOnline()
    const client = requireSupabase()
    const { error } = await client.auth.resend({
      email,
      type: 'signup',
      options: { emailRedirectTo: `${window.location.origin}/${locale}/auth/verify` },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const client = requireSupabase()
    const { error } = await client.auth.signOut()
    if (error) {
      throw error
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string, locale: 'fa' | 'en') => {
    assertOnline()
    const client = requireSupabase()
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/auth/update-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    assertOnline()
    const client = requireSupabase()
    const { error } = await client.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isConfigured: runtimeConfig.hasSupabase,
      signIn,
      signUp,
      resendConfirmation,
      requestPasswordReset,
      updatePassword,
      signOut,
    }),
    [requestPasswordReset, resendConfirmation, session, signIn, signOut, signUp, status, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
