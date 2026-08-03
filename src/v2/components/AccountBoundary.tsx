import type { PropsWithChildren } from 'react'
import { AuthProvider } from '../../platform/auth/AuthProvider'

export function AccountBoundary({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>
}
