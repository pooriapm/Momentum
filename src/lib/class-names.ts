export type ClassNameValue = string | false | null | undefined

export function cx(...values: ClassNameValue[]) {
  return values.filter(Boolean).join(' ')
}
