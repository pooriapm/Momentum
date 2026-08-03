const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? ''
).trim()

export const runtimeConfig = Object.freeze({
  appEnvironment: import.meta.env.VITE_APP_ENV?.trim() || import.meta.env.MODE,
  supabaseUrl,
  supabasePublishableKey,
  hasSupabase: Boolean(supabaseUrl && supabasePublishableKey),
})

export type RuntimeConfig = typeof runtimeConfig
