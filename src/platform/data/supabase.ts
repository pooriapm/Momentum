import { createClient } from '@supabase/supabase-js'
import { runtimeConfig } from '../config/runtime'

export const supabase = runtimeConfig.hasSupabase
  ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
      global: {
        headers: {
          'x-momentum-client': 'web',
        },
      },
    })
  : null

export class ServiceUnavailableError extends Error {
  constructor() {
    super('Momentum cloud services are not configured for this build.')
    this.name = 'ServiceUnavailableError'
  }
}

export function requireSupabase() {
  if (!supabase) {
    throw new ServiceUnavailableError()
  }

  return supabase
}
