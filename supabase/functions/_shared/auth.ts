import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { requiredEnv } from './config.ts'
import { HttpError } from './http.ts'

export interface AuthContext {
  user: User
  userClient: SupabaseClient
  admin: SupabaseClient
}

export async function authenticate(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'authentication_required', 'Authentication is required.')
  }

  const url = requiredEnv('SUPABASE_URL')
  const anonKey = requiredEnv('SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const commonAuth = {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  }

  const userClient = createClient(url, anonKey, {
    auth: commonAuth,
    global: { headers: { Authorization: authorization } },
  })
  const admin = createClient(url, serviceRoleKey, { auth: commonAuth })
  const { data, error } = await userClient.auth.getUser()

  if (error || !data.user) {
    throw new HttpError(401, 'invalid_session', 'The session is invalid or expired.')
  }

  return { user: data.user, userClient, admin }
}
