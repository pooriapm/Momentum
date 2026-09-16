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
  maxDigits?: number,
): string {
  const normalized = toLatinDigits(value)
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .replace(/[^0-9.]/g, '')

  const sanitized = allowDecimal ? keepOneDecimal(normalized) : (normalized.split('.', 1)[0] ?? '')
  return maxDigits == null ? sanitized : limitCappedNumber(sanitized, maxDigits, allowDecimal)
}

function keepOneDecimal(value: string) {
  const [whole = '', ...decimalParts] = value.split('.')
  return decimalParts.length > 0 ? `${whole}.${decimalParts.join('')}` : whole
}

function limitCappedNumber(value: string, maxDigits: number, allowDecimal: boolean) {
  const [whole = '', decimal = ''] = value.split('.')
  const limitedWhole = whole.slice(0, maxDigits)
  if (!allowDecimal || !value.includes('.')) return limitedWhole
  return `${limitedWhole}.${decimal.slice(0, 1)}`
}

export function parseLocalizedNumber(value: string): number {
  const normalized = sanitizeLocalizedNumberInput(value)
  return normalized === '' || normalized === '.' ? Number.NaN : Number(normalized)
}

export function optionalLocalizedNumber(value: string): number | undefined {
  const parsed = parseLocalizedNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
