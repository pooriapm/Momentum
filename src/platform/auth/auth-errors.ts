export type AuthFailure =
  | 'invalid_credentials'
  | 'unverified'
  | 'rate_limited'
  | 'offline'
  | 'invalid_link'
  | 'generic'

function readString(value: unknown, key: string): string {
  if (!value || typeof value !== 'object' || !(key in value)) return ''
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'string' ? candidate : ''
}

export function classifyAuthError(error: unknown): AuthFailure {
  if (error instanceof Error && error.message === 'offline_mutation_blocked') return 'offline'

  const code = readString(error, 'code').toLowerCase()
  const message = `${readString(error, 'message')} ${error instanceof Error ? error.message : ''}`.toLowerCase()
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'unverified'
  if (status === 429 || code.includes('rate_limit') || message.includes('rate limit')) return 'rate_limited'
  if (code === 'invalid_credentials' || message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'invalid_credentials'
  }
  if (message.includes('session') && (message.includes('missing') || message.includes('expired'))) return 'invalid_link'
  return 'generic'
}
