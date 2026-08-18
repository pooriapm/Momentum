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
  return maxDigits == null ? sanitized : limitDigitCount(sanitized, maxDigits)
}

function keepOneDecimal(value: string) {
  const [whole = '', ...decimalParts] = value.split('.')
  return decimalParts.length > 0 ? `${whole}.${decimalParts.join('')}` : whole
}

function limitDigitCount(value: string, maxDigits: number) {
  let digits = 0
  let result = ''
  let hasDot = false
  for (const char of value) {
    if (char === '.') {
      if (hasDot) continue
      result += '.'
      hasDot = true
      continue
    }
    if (digits >= maxDigits) continue
    result += char
    digits += 1
  }
  return result
}

export function parseLocalizedNumber(value: string): number {
  const normalized = sanitizeLocalizedNumberInput(value)
  return normalized === '' || normalized === '.' ? Number.NaN : Number(normalized)
}

export function optionalLocalizedNumber(value: string): number | undefined {
  const parsed = parseLocalizedNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
