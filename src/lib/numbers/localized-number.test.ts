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
    expect(sanitizeLocalizedNumberInput('۱۲۳٫۴', false)).toBe('1234')
    expect(optionalLocalizedNumber('')).toBeUndefined()
  })
})
