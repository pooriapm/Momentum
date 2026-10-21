import { Copy, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AppLocale } from '../../../platform/i18n/catalog'
import {
  discardReceipt,
  loadCardDetails,
  submitCardPayment,
  uploadReceipt,
  type CardDetails,
} from '../../data/payments'
import { formatNumber } from '../../lib/format'
import { Button } from '../../ui/primitives'
import './card-transfer.css'

function groupCard(cardNumber: string, locale: AppLocale) {
  return (cardNumber.match(/\d{4}/g) ?? [cardNumber])
    .map((group) => (locale === 'fa' ? group.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!) : group))
    .join(' ')
}

/**
 * Card-to-card checkout for Iranian website members: copy the card and amount, transfer
 * from any bank app, upload the receipt, and wait for a manual review of up to a day.
 */
export function CardTransferPanel({
  locale,
  userId,
  preview,
  onCancel,
  onSubmitted,
}: {
  locale: AppLocale
  userId: string | undefined
  preview: boolean
  onCancel: () => void
  onSubmitted: () => void
}) {
  const fa = locale === 'fa'
  // The in-app sample shows a placeholder card instead of calling the server.
  const [details, setDetails] = useState<CardDetails | null>(() => preview
    ? { card_number: '6037000000000000', card_holder: fa ? 'نمونه' : 'Sample', amount_minor: 4_900_000, currency: 'IRR' }
    : null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [receipt, setReceipt] = useState<{ path: string; previewUrl: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'card' | 'amount' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (preview) return
    let active = true
    loadCardDetails()
      .then((value) => { if (active) setDetails(value) })
      .catch(() => { if (active) setLoadFailed(true) })
    return () => { active = false }
  }, [preview])

  useEffect(() => () => { if (receipt) URL.revokeObjectURL(receipt.previewUrl) }, [receipt])

  async function copy(kind: 'card' | 'amount', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      /* Clipboard can be blocked; the value stays visible to copy by hand. */
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file || !userId || preview) return
    setError('')
    setUploading(true)
    try {
      const path = await uploadReceipt(userId, file)
      setReceipt({ path, previewUrl: URL.createObjectURL(file) })
    } catch {
      setError(fa ? 'تصویر رسید بارگذاری نشد. یک عکس JPG یا PNG تا ۵ مگابایت انتخاب کن.' : 'The receipt could not be uploaded. Choose a JPG or PNG image up to 5 MB.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removeReceipt() {
    if (!receipt) return
    await discardReceipt(receipt.path).catch(() => undefined)
    setReceipt(null)
  }

  async function submit() {
    if (!receipt || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await submitCardPayment(receipt.path)
      onSubmitted()
    } catch {
      setError(fa ? 'رسید ثبت نشد. دوباره تلاش کن.' : 'The receipt was not submitted. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadFailed) {
    return <div className="inline-notice inline-notice--error" role="alert">{fa ? 'پرداخت کارت به کارت الان در دسترس نیست. بعداً دوباره سر بزن.' : 'Card transfer is not available right now. Please check back later.'}</div>
  }
  if (!details) return <div aria-busy="true" className="card-transfer card-transfer--loading" />

  const amountRial = formatNumber(details.amount_minor, locale)
  return (
    <section aria-label={fa ? 'پرداخت کارت به کارت' : 'Card transfer payment'} className="card-transfer">
      <h3>{fa ? 'اطلاعات پرداخت' : 'Payment details'}</h3>
      <p>{fa
        ? <>مبلغ زیر را به کارت <strong>{details.card_holder}</strong> کارت به کارت کن.</>
        : <>Transfer the amount below to the card of <strong>{details.card_holder}</strong>.</>}</p>
      <div className="card-transfer__card">
        <div className="card-transfer__line">
          <span><small>{fa ? 'شماره کارت' : 'Card number'}</small><strong dir="ltr">{groupCard(details.card_number, locale)}</strong></span>
          <button aria-label={fa ? 'کپی شماره کارت' : 'Copy card number'} onClick={() => void copy('card', details.card_number)} type="button"><Copy size={18} /></button>
        </div>
        <div className="card-transfer__line">
          <span><small>{fa ? 'مبلغ' : 'Amount'}</small><strong>{amountRial} {fa ? 'ریال' : 'IRR'}</strong></span>
          <button aria-label={fa ? 'کپی مبلغ' : 'Copy amount'} onClick={() => void copy('amount', String(details.amount_minor))} type="button"><Copy size={18} /></button>
        </div>
        <div className="card-transfer__line">
          <span><small>{fa ? 'به نام' : 'Card holder'}</small><strong>{details.card_holder}</strong></span>
        </div>
      </div>
      {copied ? <p className="card-transfer__copied" role="status">{fa ? 'کپی شد' : 'Copied'}</p> : null}
      <p>{fa ? 'بعد از پرداخت، عکس رسید را بارگذاری کن. حداکثر تا ۲۴ ساعت بررسی می‌شود و عضویت ۳۰ روزه‌ات فعال یا تمدید می‌شود.' : 'After paying, upload a photo of the receipt. We review it within 24 hours and start or extend your 30-day membership.'}</p>

      {receipt ? (
        <div className="card-transfer__receipt">
          <img alt={fa ? 'رسید بارگذاری‌شده' : 'Uploaded receipt'} src={receipt.previewUrl} />
          <button aria-label={fa ? 'حذف رسید' : 'Remove receipt'} onClick={() => void removeReceipt()} type="button"><Trash2 size={18} /></button>
        </div>
      ) : (
        <label className={`card-transfer__upload${uploading ? ' is-busy' : ''}`}>
          <ImagePlus aria-hidden="true" size={22} />
          <span>{uploading ? (fa ? 'در حال بارگذاری…' : 'Uploading…') : (fa ? 'بارگذاری عکس رسید پرداخت' : 'Upload the payment receipt')}</span>
          <input accept="image/jpeg,image/png,image/webp" disabled={uploading || preview} onChange={(event) => void chooseFile(event.target.files?.[0])} ref={fileInput} type="file" />
        </label>
      )}
      {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
      <div className="card-transfer__actions">
        <Button onClick={onCancel} variant="secondary">{fa ? 'انصراف' : 'Cancel'}</Button>
        <Button disabled={!receipt || preview} loading={submitting} onClick={() => void submit()}>{fa ? 'ثبت رسید پرداخت' : 'Submit receipt'}</Button>
      </div>
    </section>
  )
}
