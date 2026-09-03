const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? ''
).trim()

function envEmail(value: string | undefined): string {
  const email = value?.trim() ?? ''
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

export const runtimeConfig = Object.freeze({
  appEnvironment: import.meta.env.VITE_APP_ENV?.trim() || import.meta.env.MODE,
  supabaseUrl,
  supabasePublishableKey,
  hasSupabase: Boolean(supabaseUrl && supabasePublishableKey),
  supportEmail: envEmail(import.meta.env.VITE_SUPPORT_EMAIL),
  privacyEmail: envEmail(import.meta.env.VITE_PRIVACY_EMAIL),
  errorIngestUrl: import.meta.env.VITE_ERROR_INGEST_URL?.trim()
    || (import.meta.env.PROD ? '/ops/client-errors' : ''),
})

export type RuntimeConfig = typeof runtimeConfig
