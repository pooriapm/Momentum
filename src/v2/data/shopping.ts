import { z } from 'zod'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import type { LocalizedText, MomentumPlanView } from './types'

/**
 * Shopping as an inventory, not a checklist (same rules as the Android app). For every
 * ingredient the plan gives a daily need; the server keeps what was bought. From those two:
 *
 *   used(d)  = need from the plan start through day d (past days count as eaten, per plan)
 *   stock    = bought − used(yesterday), never below zero
 *   toBuy(w) = need(today … end of window w) − stock, never below zero
 *
 * A weekly purchase lowers the plan-wide amount, a plan-wide purchase covers the week, and
 * when a new week starts the amounts reappear by themselves.
 */

export type ShoppingScope = 'week' | 'plan'

const purchaseSchema = z.object({
  id: z.string().uuid(),
  item_key: z.string(),
  unit: z.string(),
  amount: z.number(),
  scope: z.enum(['week', 'plan']),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type ShoppingPurchase = z.infer<typeof purchaseSchema>

/** Units the server accepts for purchases; other units stay visible but cannot be ticked. */
export const PURCHASABLE_UNITS = new Set(['g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving'])

async function invokeAccountData(body: Record<string, unknown>, idempotent = false) {
  assertOnline()
  const { data, error } = await requireSupabase().functions.invoke('account-data', {
    body,
    ...(idempotent ? { headers: { 'Idempotency-Key': crypto.randomUUID() } } : {}),
  })
  if (error) throw error
  return data as Record<string, unknown>
}

export async function loadShoppingPurchases(): Promise<ShoppingPurchase[]> {
  const data = await invokeAccountData({ action: 'shopping-purchases' })
  return z.array(purchaseSchema).parse(data.purchases ?? [])
}

export async function recordShoppingPurchase(input: {
  itemKey: string
  unit: string
  amount: number
  scope: ShoppingScope
  localDate: string
}): Promise<ShoppingPurchase> {
  const data = await invokeAccountData({
    action: 'record-shopping-purchase',
    item_key: input.itemKey,
    unit: input.unit,
    amount: input.amount,
    scope: input.scope,
    local_date: input.localDate,
  }, true)
  return purchaseSchema.parse(data.purchase)
}

export async function undoShoppingPurchase(purchaseId: string) {
  await invokeAccountData({ action: 'undo-shopping-purchase', purchase_id: purchaseId }, true)
}

// Ledger.

export interface ShoppingLine {
  key: string
  itemKey: string
  name: string
  label: LocalizedText
  unit: string
  needInWindow: number
  toBuy: number
  coveredUntil: string | null
  covered: boolean
}

export interface ShoppingWindow { start: string; end: string; days: number }

const WEEK_DAYS = 7
const DAY_MS = 86_400_000

function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

function dayCount(from: string, to: string) {
  return Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1)
}

function planEnd(plan: MomentumPlanView) {
  return plan.version?.validTo ?? [...(plan.days ?? [])].map((day) => day.localDate).filter(Boolean).sort().at(-1) ?? ''
}

/** The 7-day shopping week starts with the first weekly purchase still running, otherwise today. */
export function weekWindow(plan: MomentumPlanView, today: string, purchases: ShoppingPurchase[]): ShoppingWindow {
  const anchor = purchases
    .filter((purchase) => purchase.scope === 'week')
    .map((purchase) => purchase.local_date)
    .filter((date) => date <= today && addDays(date, WEEK_DAYS - 1) >= today)
    .sort()[0]
  const start = anchor ?? today
  const lastDay = planEnd(plan)
  const weekEnd = addDays(start, WEEK_DAYS - 1)
  const end = lastDay && lastDay < weekEnd ? lastDay : weekEnd
  return { start, end, days: dayCount(today, end) }
}

export function planWindow(plan: MomentumPlanView, today: string): ShoppingWindow {
  const end = planEnd(plan) || today
  return { start: today, end, days: dayCount(today, end) }
}

export function itemKeyOf(name: string, ingredientId?: string) {
  return ingredientId?.trim() ? `ingredient:${ingredientId.trim()}` : `name:${name.trim()}`
}

/** Whole units for countable things, whole grams/ml, otherwise one decimal. */
export function roundUp(amount: number, unit: string): number {
  if (amount <= 0.0005) return 0
  if (['piece', 'slice', 'serving', 'cup', 'g', 'ml'].includes(unit)) return Math.ceil(amount - 1e-9)
  return Math.ceil(amount * 10 - 1e-9) / 10
}

export function shoppingLines(
  plan: MomentumPlanView,
  today: string,
  window: ShoppingWindow,
  purchases: ShoppingPurchase[],
): ShoppingLine[] {
  const info = new Map<string, { itemKey: string; name: string; label: LocalizedText; unit: string }>()
  const needs = new Map<string, Map<string, number>>()
  for (const day of plan.days ?? []) {
    if (!day.localDate) continue
    for (const meal of day.meals) {
      const choice = meal.options.find((option) => option.id === meal.selectedOptionId) ?? meal.options[0]
      for (const ingredient of choice?.ingredients ?? []) {
        const unit = ingredient.unit.toLowerCase()
        const name = ingredient.name.en.trim()
        const itemKey = itemKeyOf(name, ingredient.id)
        const key = `${itemKey}|${unit}`
        if (!info.has(key)) info.set(key, { itemKey, name, label: ingredient.name, unit })
        const perDay = needs.get(key) ?? new Map<string, number>()
        perDay.set(day.localDate, (perDay.get(day.localDate) ?? 0) + ingredient.amount)
        needs.set(key, perDay)
      }
    }
  }

  const bought = new Map<string, number>()
  for (const purchase of purchases) {
    const key = `${purchase.item_key}|${purchase.unit.toLowerCase()}`
    bought.set(key, (bought.get(key) ?? 0) + purchase.amount)
  }
  const dates = (plan.days ?? []).map((day) => day.localDate).filter((date): date is string => Boolean(date)).sort()

  const lines: ShoppingLine[] = []
  for (const [key, item] of info) {
    const perDay = needs.get(key) ?? new Map<string, number>()
    let usedBeforeToday = 0
    let needInWindow = 0
    for (const [date, amount] of perDay) {
      if (date < today) usedBeforeToday += amount
      else if (date <= window.end) needInWindow += amount
    }
    if (needInWindow <= 0) continue
    const stock = Math.max(0, (bought.get(key) ?? 0) - usedBeforeToday)
    const toBuy = roundUp(needInWindow - stock, item.unit)
    let left = stock
    let coveredUntil: string | null = null
    for (const date of dates.filter((value) => value >= today)) {
      const use = perDay.get(date) ?? 0
      if (use > left + 1e-9) break
      left -= use
      coveredUntil = date
    }
    lines.push({ key, ...item, needInWindow, toBuy, coveredUntil, covered: toBuy <= 0 })
  }
  return lines.sort((left, right) => Number(left.covered) - Number(right.covered) || left.name.localeCompare(right.name))
}

/** The purchase removed when a line is unticked: the newest one for that item. */
export function lastPurchaseFor(line: ShoppingLine, purchases: ShoppingPurchase[]) {
  return purchases
    .filter((purchase) => `${purchase.item_key}|${purchase.unit.toLowerCase()}` === line.key)
    .sort((left, right) => right.local_date.localeCompare(left.local_date))[0]
}
