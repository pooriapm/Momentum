import { describe, expect, it } from 'vitest'
import { lastPurchaseFor, planWindow, roundUp, shoppingLines, weekWindow, type ShoppingPurchase } from './shopping'
import type { MealSlot, MomentumPlanDayView, MomentumPlanView } from './types'

const START = '2026-10-01'

function iso(offset: number) {
  return new Date(Date.parse(`${START}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
}

function meal(): MealSlot {
  return {
    id: 'lunch',
    selectedOptionId: 'b',
    options: [
      { id: 'a', name: { fa: 'الف', en: 'A' }, ingredients: [{ id: 'rice', name: { fa: 'برنج', en: 'Rice' }, amount: 500, unit: 'g' }] },
      {
        id: 'b',
        name: { fa: 'ب', en: 'B' },
        ingredients: [
          { id: 'chicken', name: { fa: 'مرغ', en: 'Chicken' }, amount: 150, unit: 'g' },
          { name: { fa: 'تخم‌مرغ', en: 'Egg' }, amount: 1.5, unit: 'piece' },
          { name: { fa: 'روغن', en: 'Oil' }, amount: 0.33, unit: 'tbsp' },
        ],
      },
    ],
  } as unknown as MealSlot
}

function plan(): MomentumPlanView {
  const days = Array.from({ length: 30 }, (_, index) => ({ localDate: iso(index), meals: [meal()] }) as unknown as MomentumPlanDayView)
  return { days, version: { validTo: iso(29) } } as unknown as MomentumPlanView
}

function purchase(itemKey: string, unit: string, amount: number, scope: 'week' | 'plan', localDate: string, id: string = crypto.randomUUID()): ShoppingPurchase {
  return { id, item_key: itemKey, unit, amount, scope, local_date: localDate }
}

describe('shopping ledger', () => {
  it('needs the chosen meal option for the next seven days', () => {
    const today = iso(0)
    const lines = shoppingLines(plan(), today, weekWindow(plan(), today, []), [])
    const byKey = Object.fromEntries(lines.map((line) => [line.key, line]))
    expect(byKey['ingredient:rice|g']).toBeUndefined()
    expect(byKey['ingredient:chicken|g'].toBuy).toBe(1050)
    expect(byKey['name:Egg|piece'].toBuy).toBe(11)
    expect(byKey['name:Oil|tbsp'].toBuy).toBe(2.4)
  })

  it('lowers the whole-plan amount by what a weekly purchase bought', () => {
    const today = iso(0)
    const bought = [purchase('ingredient:chicken', 'g', 1050, 'week', today)]
    const week = shoppingLines(plan(), today, weekWindow(plan(), today, bought), bought).find((line) => line.itemKey === 'ingredient:chicken')!
    expect(week.covered).toBe(true)
    expect(week.coveredUntil).toBe(iso(6))
    const whole = shoppingLines(plan(), today, planWindow(plan(), today), bought).find((line) => line.itemKey === 'ingredient:chicken')!
    expect(whole.toBuy).toBe(150 * 30 - 1050)
  })

  it('brings the amounts back when the next week starts', () => {
    const bought = [purchase('ingredient:chicken', 'g', 1050, 'week', iso(0))]
    const today = iso(7)
    const range = weekWindow(plan(), today, bought)
    expect(range.start).toBe(today)
    const line = shoppingLines(plan(), today, range, bought).find((item) => item.itemKey === 'ingredient:chicken')!
    expect(line.toBuy).toBe(1050)
  })

  it('keeps the week anchored to a running weekly purchase and stops at the plan end', () => {
    const bought = [purchase('ingredient:chicken', 'g', 1050, 'week', iso(2))]
    expect(weekWindow(plan(), iso(5), bought)).toMatchObject({ start: iso(2), end: iso(8), days: 4 })
    expect(weekWindow(plan(), iso(27), [])).toMatchObject({ end: iso(29), days: 3 })
  })

  it('unticks the newest purchase of a line', () => {
    const today = iso(0)
    const bought = [
      purchase('ingredient:chicken', 'g', 500, 'week', iso(0), 'old'),
      purchase('ingredient:chicken', 'g', 600, 'week', iso(1), 'new'),
    ]
    const line = shoppingLines(plan(), today, weekWindow(plan(), today, bought), bought).find((item) => item.itemKey === 'ingredient:chicken')!
    expect(lastPurchaseFor(line, bought)?.id).toBe('new')
  })

  it('rounds countable things and weights up, small measures to one decimal', () => {
    expect(roundUp(10.2, 'piece')).toBe(11)
    expect(roundUp(100.01, 'g')).toBe(101)
    expect(roundUp(0.31, 'tbsp')).toBe(0.4)
    expect(roundUp(0, 'g')).toBe(0)
  })
})
