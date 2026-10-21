import { Check, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { loadPendingReceipts, reviewReceipt, type PendingReceipt } from '../../data/payments'
import { formatNumber } from '../../lib/format'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import './card-transfer.css'

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error'

/** Manual review of card-to-card receipts. The server only answers for ADMIN_USER_IDS. */
export function AdminPaymentsPage({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const [state, setState] = useState<LoadState>('loading')
  const [items, setItems] = useState<PendingReceipt[]>([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  const fetchReceipts = useCallback(async () => {
    try {
      setItems(await loadPendingReceipts())
      setState('ready')
    } catch (error) {
      const status = (error as { context?: { status?: number } })?.context?.status
      setState(status === 403 ? 'forbidden' : 'error')
    }
  }, [])

  // The first load starts in the 'loading' state; only later refreshes reset it.
  useEffect(() => {
    let active = true
    loadPendingReceipts()
      .then((value) => { if (active) { setItems(value); setState('ready') } })
      .catch((error: unknown) => {
        if (!active) return
        const status = (error as { context?: { status?: number } })?.context?.status
        setState(status === 403 ? 'forbidden' : 'error')
      })
    return () => { active = false }
  }, [])

  function load() {
    setState('loading')
    void fetchReceipts()
  }

  async function review(item: PendingReceipt, approve: boolean) {
    const question = approve
      ? (fa ? `تأیید پرداخت ${item.email ?? ''} و فعال‌کردن ۳۰ روز عضویت؟` : `Approve ${item.email ?? 'this payment'} and grant 30 days?`)
      : (fa ? `رد رسید ${item.email ?? ''}؟` : `Reject the receipt from ${item.email ?? 'this member'}?`)
    if (!window.confirm(question)) return
    setBusy(item.payment_id)
    setMessage('')
    try {
      await reviewReceipt(item.payment_id, approve)
      setItems((current) => current.filter((row) => row.payment_id !== item.payment_id))
      setMessage(approve ? (fa ? 'تأیید شد و عضویت فعال شد.' : 'Approved. The membership is active.') : (fa ? 'رسید رد شد.' : 'Receipt rejected.'))
    } catch {
      setMessage(fa ? 'ثبت نشد؛ صفحه را تازه کن و دوباره تلاش کن.' : 'That did not save. Refresh and try again.')
    } finally {
      setBusy('')
    }
  }

  return (
    <main className="app-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow">{fa ? 'مدیریت' : 'Admin'}</p>
          <h1>{fa ? 'رسیدهای کارت به کارت' : 'Card transfer receipts'}</h1>
          <p>{fa ? 'هر رسید را با واریزی حسابت مقایسه کن، بعد تأیید یا رد کن.' : 'Match each receipt against your bank account, then approve or reject it.'}</p>
        </div>
        <Button onClick={load} variant="secondary"><RefreshCw size={16} />{fa ? 'تازه‌سازی' : 'Refresh'}</Button>
      </section>
      {message ? <div className="inline-notice" role="status">{message}</div> : null}
      {state === 'forbidden' ? <ContentCard><p>{fa ? 'این صفحه فقط برای مدیر است.' : 'This page is for admins only.'}</p></ContentCard> : null}
      {state === 'error' ? <ContentCard><p>{fa ? 'رسیدها بارگذاری نشدند.' : 'Receipts could not be loaded.'}</p></ContentCard> : null}
      {state === 'ready' && items.length === 0 ? <ContentCard><p>{fa ? 'رسیدی در انتظار بررسی نیست.' : 'No receipts are waiting for review.'}</p></ContentCard> : null}
      <div className="admin-receipts">
        {items.map((item) => (
          <ContentCard className="admin-receipt" key={item.payment_id}>
            <div className="admin-receipt__head">
              <strong>{item.email ?? (fa ? 'بدون ایمیل' : 'No email')}</strong>
              <StatusPill tone="energy">{fa ? 'در انتظار بررسی' : 'Waiting for review'}</StatusPill>
            </div>
            <p>{formatNumber(item.amount_minor, locale)} {fa ? 'ریال' : 'IRR'} · {new Date(item.submitted_at).toLocaleString(fa ? 'fa-IR' : 'en-GB')}</p>
            {item.receipt_url ? (
              <a className="admin-receipt__image" href={item.receipt_url} rel="noreferrer" target="_blank">
                <img alt={fa ? 'رسید پرداخت' : 'Payment receipt'} src={item.receipt_url} />
                <span><ExternalLink size={14} />{fa ? 'باز کردن در اندازه کامل' : 'Open full size'}</span>
              </a>
            ) : <p>{fa ? 'تصویر رسید پیدا نشد.' : 'The receipt image is missing.'}</p>}
            <div className="card-transfer__actions">
              <Button disabled={Boolean(busy)} onClick={() => void review(item, false)} variant="secondary"><X size={16} />{fa ? 'رد' : 'Reject'}</Button>
              <Button disabled={Boolean(busy)} loading={busy === item.payment_id} onClick={() => void review(item, true)}><Check size={16} />{fa ? 'تأیید و فعال‌سازی' : 'Approve'}</Button>
            </div>
          </ContentCard>
        ))}
      </div>
    </main>
  )
}
