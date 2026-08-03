export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) {
    throw new Error(`missing_env:${name}`)
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim()
  return value || undefined
}

export function integerEnv(
  name: string,
  fallback: number,
  options: { min: number; max: number },
): number {
  const raw = optionalEnv(name)
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < options.min || value > options.max) {
    throw new Error(`invalid_env:${name}`)
  }
  return value
}

export function enumEnv<T extends string>(
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = optionalEnv(name)
  if (!value) return undefined
  if (!allowed.includes(value as T)) {
    throw new Error(`invalid_env:${name}`)
  }
  return value as T
}
