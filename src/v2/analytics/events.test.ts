import { describe, expect, it } from 'vitest'
import { sanitizeProductEvent } from './events'

const safeMealEvent = {
  event_name: 'meaningful_action_completed',
  locale: 'en',
  product_region: 'intl',
  plan_source: 'momentum',
  surface: 'today',
  action_kind: 'meal',
  outcome: 'completed',
  schema_version: '1.0.0',
}

describe('privacy-safe product events', () => {
  it('accepts the closed categorical contract', () => {
    expect(sanitizeProductEvent(safeMealEvent)).toEqual(safeMealEvent)
  })

  it.each([
    ['email', 'member@example.test'],
    ['user_id', '12121212-1212-4212-8212-121212121212'],
    ['weight_kg', 72.8],
    ['notes', 'private health note'],
    ['plan_id', '12121212-1212-4212-8212-121212121212'],
    ['prompt', 'raw prompt'],
  ])('rejects forbidden field %s', (key, value) => {
    expect(() => sanitizeProductEvent({ ...safeMealEvent, [key]: value })).toThrow()
  })

  it('rejects free-form categorical substitutions', () => {
    expect(() => sanitizeProductEvent({ ...safeMealEvent, action_kind: 'meal:72kg' })).toThrow()
  })
})
