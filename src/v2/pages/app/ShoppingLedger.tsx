import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { formatNumber } from '../../lib/format'
import {
  lastPurchaseFor,
  loadShoppingPurchases,
  planWindow,
  PURCHASABLE_UNITS,
  recordShoppingPurchase,
  shoppingLines,
  type ShoppingLine,
  type ShoppingPurchase,
  type ShoppingScope,
  undoShoppingPurchase,
  weekWindow,
} from '../../data/shopping'
import { localize, type MomentumPlanView } from '../../data/types'
import { Button, ContentCard } from '../../ui/primitives'

const SHOPPING_PURCHASES_QUERY = ['shopping-purchases'] as const

const UNIT_LABELS: Record<string, { fa: string; en: string }> = {
  g: { fa: 'گرم', en: 'g' },
  ml: { fa: 'میلی‌لیتر', en: 'ml' },
  piece: { fa: 'عدد', en: 'pcs' },
  tbsp: { fa: 'قاشق غذاخوری', en: 'tbsp' },
  tsp: { fa: 'قاشق چای‌خوری', en: 'tsp' },
  cup: { fa: 'پیمانه', en: 'cup' },
  slice: { fa: 'برش', en: 'slices' },
  serving: { fa: 'سهم', en: 'servings' },
}

function unitLabel(unit: string, locale: AppLocale) {
  return UNIT_LABELS[unit]?.[locale] ?? unit
}

function shortDate(iso: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`))
}

function amountText(line: ShoppingLine, locale: AppLocale) {
  return `${formatNumber(line.toBuy, locale)} ${unitLabel(line.unit, locale)}`
}

function shoppingShareText(lines: ShoppingLine[], locale: AppLocale) {
  return lines
    .filter((line) => !line.covered)
    .map((line) => `• ${localize(line.label, locale)} — ${amountText(line, locale)}`)
    .join('\n')
}

/**
 * The plan's shopping list as an inventory: ticking a line records that its amount was
 * bought, and the server keeps the purchases so every device shows the same stock.
 */
export function ShoppingLedger({
  locale,
  plan,
  preview,
  today,
}: {
  locale: AppLocale
  plan: MomentumPlanView
  preview: boolean
  today: string
}) {
  const fa = locale === 'fa'
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<ShoppingScope>('week')
  const [previewPurchases, setPreviewPurchases] = useState<ShoppingPurchase[]>([])
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const purchasesQuery = useQuery({
    queryKey: SHOPPING_PURCHASES_QUERY,
    queryFn: loadShoppingPurchases,
    enabled: !preview,
    staleTime: 60_000,
  })
  const purchases = preview ? previewPurchases : purchasesQuery.data ?? []
  const range = scope === 'week' ? weekWindow(plan, today, purchases) : planWindow(plan, today)
  const lines = shoppingLines(plan, today, range, purchases)
  const loading = !preview && purchasesQuery.isPending
  const loadFailed = !preview && purchasesQuery.isError

  function setPurchases(update: (current: ShoppingPurchase[]) => ShoppingPurchase[]) {
    if (preview) setPreviewPurchases(update)
    else queryClient.setQueryData<ShoppingPurchase[]>(SHOPPING_PURCHASES_QUERY, (current) => update(current ?? []))
  }

  async function toggle(line: ShoppingLine) {
    if (busyKey || loading || loadFailed) return
    setError('')
    setBusyKey(line.key)
    try {
      if (line.covered) {
        const last = lastPurchaseFor(line, purchases)
        if (!last) return
        if (!preview) await undoShoppingPurchase(last.id)
        setPurchases((current) => current.filter((purchase) => purchase.id !== last.id))
      } else {
        const input = { itemKey: line.itemKey, unit: line.unit, amount: line.toBuy, scope, localDate: today }
        const purchase = preview
          ? { id: crypto.randomUUID(), item_key: input.itemKey, unit: input.unit, amount: input.amount, scope, local_date: today }
          : await recordShoppingPurchase(input)
        setPurchases((current) => [...current, purchase])
      }
    } catch {
      setError(fa ? 'خرید ذخیره نشد؛ اتصال را بررسی کن و دوباره تلاش کن.' : 'The purchase was not saved. Check your connection and try again.')
    } finally {
      setBusyKey('')
    }
  }

  async function share() {
    const text = shoppingShareText(lines, locale)
    try {
      if (navigator.share) await navigator.share({ text })
      else if (navigator.clipboard) await navigator.clipboard.writeText(text)
    } catch {
      /* user cancelled share */
    }
  }

  const remaining = lines.filter((line) => !line.covered).length

  return (
    <div className="plan-grocery shopping-ledger" data-inventory="PLAN-04">
      <ContentCard className="plan-grocery__list">
        <div className="shopping-ledger__head">
          <div aria-label={fa ? 'بازه خرید' : 'Shopping window'} className="shopping-ledger__scope" role="group">
            <button aria-pressed={scope === 'week'} onClick={() => setScope('week')} type="button">{fa ? 'این هفته' : 'This week'}</button>
            <button aria-pressed={scope === 'plan'} onClick={() => setScope('plan')} type="button">{fa ? 'کل برنامه' : 'Whole plan'}</button>
          </div>
          <p>{fa
            ? `${formatNumber(range.days, locale)} روز، تا ${shortDate(range.end, locale)} · ${formatNumber(remaining, locale)} قلم مانده`
            : `${range.days} days, until ${shortDate(range.end, locale)} · ${remaining} left to buy`}</p>
        </div>
        {loadFailed ? (
          <div className="inline-notice" role="alert">
            {fa ? 'خریدهای قبلی بارگیری نشد.' : 'Your earlier purchases could not be loaded.'}
            <Button onClick={() => void purchasesQuery.refetch()} variant="secondary">{fa ? 'دوباره' : 'Retry'}</Button>
          </div>
        ) : null}
        {error ? <div className="inline-notice" role="alert">{error}</div> : null}
        <ul aria-busy={loading} className="shopping-ledger__list">
          {lines.map((line) => {
            const tickable = line.covered ? Boolean(lastPurchaseFor(line, purchases)) : PURCHASABLE_UNITS.has(line.unit)
            return (
              <li className={line.covered ? 'is-checked' : ''} key={line.key}>
                <button
                  aria-pressed={line.covered}
                  disabled={!tickable || loading || loadFailed || busyKey === line.key}
                  onClick={() => void toggle(line)}
                  type="button"
                >
                  <span aria-hidden="true" className="plan-check">{line.covered ? <Check size={13} strokeWidth={3} /> : null}</span>
                  <strong>{localize(line.label, locale)}</strong>
                  <small>{line.covered
                    ? (line.coveredUntil
                      ? (fa ? `کافی تا ${shortDate(line.coveredUntil, locale)}` : `Enough until ${shortDate(line.coveredUntil, locale)}`)
                      : (fa ? 'کافی است' : 'Enough'))
                    : amountText(line, locale)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </ContentCard>
      <ContentCard className="plan-grocery-share">
        <div>
          <h2>{fa ? 'اشتراک‌گذاری فهرست خرید' : 'Share the shopping list'}</h2>
          <p>{fa
            ? 'آنچه هنوز باید بخری را برای کسی بفرست. مقدارها برای یک نفر است. خریدهای تیک‌خورده در حسابت ذخیره می‌شوند تا روی همه دستگاه‌ها یکی باشند.'
            : 'Send what is still left to buy. Quantities cover one person. Ticked purchases are saved to your account so every device shows the same stock.'}</p>
        </div>
        <Button onClick={() => void share()}>{fa ? 'اشتراک‌گذاری فهرست' : 'Share list'}</Button>
      </ContentCard>
    </div>
  )
}
