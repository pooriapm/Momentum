import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  user: User | null
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, locale: 'fa' | 'en') => Promise<'authenticated' | 'confirmation-required'>
  resendConfirmation: (email: string, locale: 'fa' | 'en') => Promise<void>
  requestPasswordReset: (email: string, locale: 'fa' | 'en') => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: (options?: { scope?: 'local' | 'global' }) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
