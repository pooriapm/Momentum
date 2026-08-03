const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
}

export function sanitizeLocalizedNumberInput(
  value: string,
  allowDecimal = true,
): string {
  const normalized = toLatinDigits(value)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .replace(/[^0-9.]/g, '')

  if (!allowDecimal) return normalized.split('.', 1)[0] ?? ''

  const [whole = '', ...decimalParts] = normalized.split('.')
  return decimalParts.length > 0
    ? `${whole}.${decimalParts.join('')}`
    : whole
}

export function parseLocalizedNumber(value: string): number {
  const normalized = sanitizeLocalizedNumberInput(value)
  return normalized === '' || normalized === '.' ? Number.NaN : Number(normalized)
}

export function optionalLocalizedNumber(value: string): number | undefined {
  const parsed = parseLocalizedNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
