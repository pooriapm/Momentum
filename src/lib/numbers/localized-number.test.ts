import { describe, expect, it } from 'vitest'
import {
  optionalLocalizedNumber,
  parseLocalizedNumber,
  sanitizeLocalizedNumberInput,
  toLatinDigits,
} from './localized-number'

describe('localized number input', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(toLatinDigits('۱۲۳ و ٤٥٦')).toBe('123 و 456')
  })

  it('accepts Persian decimal and thousands separators', () => {
    expect(parseLocalizedNumber('۸۱٫۵')).toBe(81.5)
    expect(parseLocalizedNumber('۱٬۲۵۰')).toBe(1250)
  })

  it('sanitizes integer fields and keeps empty values optional', () => {
    expect(sanitizeLocalizedNumberInput('۱۲۳٫۴', false)).toBe('123')
    expect(sanitizeLocalizedNumberInput('۹.۵', false)).toBe('9')
    expect(optionalLocalizedNumber('')).toBeUndefined()
  })

  it('accepts Persian or English digits and caps height/weight to three digits', () => {
    expect(sanitizeLocalizedNumberInput('۱۷۰', true, 3)).toBe('170')
    expect(sanitizeLocalizedNumberInput('1680', true, 3)).toBe('168')
    expect(sanitizeLocalizedNumberInput('۷۲٫۴۵', true, 3)).toBe('72.4')
    expect(sanitizeLocalizedNumberInput('3501', true, 3)).toBe('350')
  })
})
