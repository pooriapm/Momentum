import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Copy, ExternalLink, RefreshCw, Search, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import {
  adminErrorStatus,
  grantDays,
  loadAdminOverview,
  loadIsAdmin,
  loadMember,
  loadPendingReceipts,
  loadReviewHistory,
  loadWaitlist,
  REJECTION_REASONS,
  type MemberDetail,
  type PendingReceipt,
  type RejectionReason,
  reviewReceipt,
  searchMembers,
} from '../../data/admin'
import { formatNumber } from '../../lib/format'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import './card-transfer.css'
import './admin.css'

export type AdminTab = 'overview' | 'receipts' | 'members' | 'waitlist'

const TABS: Array<{ key: AdminTab; fa: string; en: string }> = [
  { key: 'overview', fa: 'خلاصه', en: 'Overview' },
  { key: 'receipts', fa: 'رسیدها', en: 'Receipts' },
  { key: 'members', fa: 'اعضا', en: 'Members' },
  { key: 'waitlist', fa: 'فهرست انتظار', en: 'Waitlist' },
]

const REASON_LABELS: Record<RejectionReason, { fa: string; en: string }> = {
  amount_mismatch: { fa: 'مبلغ درست نیست', en: 'Amount does not match' },
  not_received: { fa: 'واریزی به حساب نرسیده', en: 'Transfer not received' },
  unreadable: { fa: 'رسید خوانا نیست', en: 'Receipt is unreadable' },
  duplicate: { fa: 'رسید تکراری است', en: 'Duplicate receipt' },
}

function date(value: string | null | undefined, locale: AppLocale, withTime = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

/** Rials as the bank shows them, with toman for the price people know. */
function rials(amountMinor: number, locale: AppLocale) {
  return locale === 'fa'
    ? `${formatNumber(amountMinor / 10, locale)} تومان (${formatNumber(amountMinor, locale)} ریال)`
    : `${formatNumber(amountMinor / 10, locale)} toman (${formatNumber(amountMinor, locale)} IRR)`
}

function failureLabel(code: string | null, locale: AppLocale) {
  if (!code) return ''
  const reason = code.replace(/^card_/, '') as RejectionReason
  return REASON_LABELS[reason]?.[locale] ?? (locale === 'fa' ? 'رد شده' : 'Rejected')
}

function Problem({ error, locale, what }: { error: unknown; locale: AppLocale; what: { fa: string; en: string } }) {
  const fa = locale === 'fa'
  const status = adminErrorStatus(error)
  return (
    <ContentCard role="alert">
      <p>{status === 403
        ? (fa ? 'این بخش فقط برای مدیر است.' : 'This is for admins only.')
        : `${what[locale]} ${fa ? 'بارگذاری نشد. اتصال را بررسی کن و دوباره تلاش کن.' : 'could not be loaded. Check your connection and try again.'}`}</p>
    </ContentCard>
  )
}

/** The admin panel: what needs attention, receipts, members and the waitlist. */
export function AdminPage({ locale, initialTab = 'overview' }: { locale: AppLocale; initialTab?: AdminTab }) {
  const fa = locale === 'fa'
  const [tab, setTab] = useState<AdminTab>(initialTab)
  const whoami = useQuery({ queryKey: ['admin', 'whoami'], queryFn: loadIsAdmin, staleTime: 10 * 60_000, retry: false })

  return (
    <main className="app-page admin-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow">{fa ? 'مدیریت' : 'Admin'}</p>
          <h1>{fa ? 'پنل مدیریت' : 'Admin panel'}</h1>
          <p>{fa ? 'رسیدها، اعضا و فهرست انتظار. هر تغییر با نام تو ثبت می‌شود.' : 'Receipts, members and the waitlist. Every change is logged under your account.'}</p>
        </div>
        <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/me')}>
          <ArrowLeft className="directional-icon" size={16} />{fa ? 'بازگشت به برنامه' : 'Back to the app'}
        </Link>
      </section>

      {whoami.isPending ? <ContentCard aria-busy="true"><p>{fa ? 'در حال بررسی دسترسی…' : 'Checking access…'}</p></ContentCard> : null}
      {whoami.isError ? <Problem error={whoami.error} locale={locale} what={{ fa: 'دسترسی', en: 'Access' }} /> : null}
      {whoami.data === false ? <ContentCard><p>{fa ? 'این صفحه فقط برای مدیر است.' : 'This page is for admins only.'}</p></ContentCard> : null}

      {whoami.data ? (
        <>
          <div aria-label={fa ? 'بخش‌های مدیریت' : 'Admin sections'} className="admin-tabs" role="tablist">
            {TABS.map((item) => (
              <button
                aria-controls={`admin-panel-${item.key}`}
                aria-selected={tab === item.key}
                className={tab === item.key ? 'is-active' : ''}
                id={`admin-tab-${item.key}`}
                key={item.key}
                onClick={() => setTab(item.key)}
                role="tab"
                type="button"
              >
                {item[locale]}
              </button>
            ))}
          </div>
          <div aria-labelledby={`admin-tab-${tab}`} id={`admin-panel-${tab}`} role="tabpanel">
            {tab === 'overview' ? <OverviewTab locale={locale} onOpen={setTab} /> : null}
            {tab === 'receipts' ? <ReceiptsTab locale={locale} /> : null}
            {tab === 'members' ? <MembersTab locale={locale} /> : null}
            {tab === 'waitlist' ? <WaitlistTab locale={locale} /> : null}
          </div>
        </>
      ) : null}
    </main>
  )
}

function OverviewTab({ locale, onOpen }: { locale: AppLocale; onOpen: (tab: AdminTab) => void }) {
  const fa = locale === 'fa'
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: loadAdminOverview })
  if (overview.isPending) return <ContentCard aria-busy="true"><p>{fa ? 'در حال بارگذاری…' : 'Loading…'}</p></ContentCard>
  if (overview.isError) return <Problem error={overview.error} locale={locale} what={{ fa: 'خلاصه', en: 'The overview' }} />
  const data = overview.data
  const stats: Array<{ label: string; value: string; tab?: AdminTab; attention?: boolean }> = [
    { label: fa ? 'رسید در انتظار بررسی' : 'Receipts to review', value: formatNumber(data.pending_receipts, locale), tab: 'receipts', attention: data.pending_receipts > 0 },
    { label: fa ? 'اعضای پرداختی فعال' : 'Active paying members', value: formatNumber(data.paying_members, locale) },
    { label: fa ? 'پایان عضویت تا ۵ روز آینده' : 'Ending within 5 days', value: formatNumber(data.ending_within_5_days, locale) },
    { label: fa ? 'در دوره هدیه' : 'On the gift period', value: formatNumber(data.gift_members, locale) },
    { label: fa ? 'پرداخت‌های ۳۰ روز اخیر' : 'Payments, last 30 days', value: formatNumber(data.paid_last_30_days, locale) },
    { label: fa ? 'درآمد ۳۰ روز اخیر' : 'Revenue, last 30 days', value: `${formatNumber(data.revenue_last_30_days_irr / 10, locale)} ${fa ? 'تومان' : 'toman'}` },
    { label: fa ? 'همه حساب‌ها' : 'All accounts', value: formatNumber(data.accounts, locale), tab: 'members' },
    { label: fa ? 'فهرست انتظار خارج از ایران' : 'Waitlist outside Iran', value: formatNumber(data.waitlist, locale), tab: 'waitlist' },
  ]
  return (
    <div className="admin-section">
      <div className="admin-stats">
        {stats.map((stat) => {
          const body = <><span>{stat.label}</span><strong>{stat.value}</strong></>
          return stat.tab ? (
            <button className={`admin-stat${stat.attention ? ' is-attention' : ''}`} key={stat.label} onClick={() => onOpen(stat.tab!)} type="button">{body}</button>
          ) : <div className="admin-stat" key={stat.label}>{body}</div>
        })}
      </div>
      <div><Button loading={overview.isFetching} onClick={() => void overview.refetch()} variant="ghost"><RefreshCw size={16} />{fa ? 'تازه‌سازی' : 'Refresh'}</Button></div>
    </div>
  )
}

function ReceiptsTab({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const queryClient = useQueryClient()
  const pending = useQuery({ queryKey: ['admin', 'receipts'], queryFn: loadPendingReceipts })
  const history = useQuery({ queryKey: ['admin', 'history'], queryFn: loadReviewHistory })
  const [rejecting, setRejecting] = useState('')
  const [reason, setReason] = useState<RejectionReason>('amount_mismatch')
  const [message, setMessage] = useState('')
  const review = useMutation({
    mutationFn: (input: { item: PendingReceipt; approve: boolean; reason?: RejectionReason }) =>
      reviewReceipt(input.item.payment_id, input.approve, input.reason),
    onSuccess: (_data, input) => {
      setRejecting('')
      setMessage(input.approve ? (fa ? 'تأیید شد و ۳۰ روز عضویت فعال شد.' : 'Approved. 30 days of membership are active.') : (fa ? 'رسید رد شد و دلیلش به عضو نشان داده می‌شود.' : 'Rejected. The member sees the reason.'))
      queryClient.setQueryData<PendingReceipt[]>(['admin', 'receipts'], (current) => current?.filter((row) => row.payment_id !== input.item.payment_id))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'history'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: () => setMessage(fa ? 'ثبت نشد؛ فهرست را تازه کن و دوباره تلاش کن.' : 'That did not save. Refresh the list and try again.'),
  })

  function approve(item: PendingReceipt) {
    const question = fa
      ? `تأیید پرداخت ${item.email ?? ''} به مبلغ ${rials(item.amount_minor, locale)} و فعال‌کردن ۳۰ روز عضویت؟`
      : `Approve ${rials(item.amount_minor, locale)} from ${item.email ?? 'this member'} and grant 30 days?`
    if (window.confirm(question)) review.mutate({ item, approve: true })
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <h2>{fa ? 'در انتظار بررسی' : 'Waiting for review'}</h2>
        <Button onClick={() => { void pending.refetch(); void history.refetch() }} variant="secondary"><RefreshCw size={16} />{fa ? 'تازه‌سازی' : 'Refresh'}</Button>
      </div>
      <p className="admin-hint">{fa ? 'هر رسید را با واریزی حسابت مقایسه کن (مبلغ، زمان و چهار رقم آخر کارت)، بعد تأیید یا رد کن.' : 'Match each receipt against your bank account (amount, time and the last four card digits), then approve or reject it.'}</p>
      {message ? <div className="inline-notice" role="status">{message}</div> : null}
      {pending.isError ? <Problem error={pending.error} locale={locale} what={{ fa: 'رسیدها', en: 'Receipts' }} /> : null}
      {pending.isPending ? <ContentCard aria-busy="true"><p>{fa ? 'در حال بارگذاری…' : 'Loading…'}</p></ContentCard> : null}
      {pending.data?.length === 0 ? <ContentCard><p>{fa ? 'رسیدی در انتظار بررسی نیست.' : 'No receipts are waiting for review.'}</p></ContentCard> : null}
      <div className="admin-receipts">
        {pending.data?.map((item) => (
          <ContentCard className="admin-receipt" key={item.payment_id}>
            <div className="admin-receipt__head">
              <strong>{item.email ?? (fa ? 'بدون ایمیل' : 'No email')}</strong>
              <StatusPill tone="energy">{fa ? 'در انتظار' : 'Waiting'}</StatusPill>
            </div>
            <p>{rials(item.amount_minor, locale)} · {date(item.submitted_at, locale, true)}</p>
            {item.receipt_url ? (
              <a className="admin-receipt__image" href={item.receipt_url} rel="noreferrer" target="_blank">
                <img alt={fa ? 'رسید پرداخت' : 'Payment receipt'} src={item.receipt_url} />
                <span><ExternalLink size={14} />{fa ? 'باز کردن در اندازه کامل' : 'Open full size'}</span>
              </a>
            ) : <p>{fa ? 'تصویر رسید پیدا نشد.' : 'The receipt image is missing.'}</p>}
            {rejecting === item.payment_id ? (
              <div className="admin-reject">
                <label>
                  <span>{fa ? 'دلیل رد' : 'Reason'}</span>
                  <select onChange={(event) => setReason(event.target.value as RejectionReason)} value={reason}>
                    {REJECTION_REASONS.map((value) => <option key={value} value={value}>{REASON_LABELS[value][locale]}</option>)}
                  </select>
                </label>
                <div className="card-transfer__actions">
                  <Button disabled={review.isPending} onClick={() => setRejecting('')} variant="ghost">{fa ? 'انصراف' : 'Cancel'}</Button>
                  <Button loading={review.isPending} onClick={() => review.mutate({ item, approve: false, reason })} variant="secondary"><X size={16} />{fa ? 'رد رسید' : 'Reject receipt'}</Button>
                </div>
              </div>
            ) : (
              <div className="card-transfer__actions">
                <Button disabled={review.isPending} onClick={() => { setReason('amount_mismatch'); setRejecting(item.payment_id) }} variant="secondary"><X size={16} />{fa ? 'رد' : 'Reject'}</Button>
                <Button disabled={review.isPending} loading={review.isPending && review.variables?.item.payment_id === item.payment_id} onClick={() => approve(item)}><Check size={16} />{fa ? 'تأیید و فعال‌سازی' : 'Approve'}</Button>
              </div>
            )}
          </ContentCard>
        ))}
      </div>

      <h2>{fa ? 'بررسی‌شده‌ها' : 'Reviewed'}</h2>
      {history.isError ? <Problem error={history.error} locale={locale} what={{ fa: 'تاریخچه', en: 'The history' }} /> : null}
      {history.data?.length === 0 ? <p className="admin-hint">{fa ? 'هنوز رسیدی بررسی نشده.' : 'No receipts have been reviewed yet.'}</p> : null}
      {history.data?.length ? (
        <ContentCard className="admin-list-card">
          <ul className="admin-list">
            {history.data.map((item) => (
              <li key={item.payment_id}>
                <span>
                  <strong>{item.email ?? '—'}</strong>
                  <small>{rials(item.amount_minor, locale)} · {date(item.reviewed_at, locale, true)}{item.reviewer_email ? ` · ${item.reviewer_email}` : ''}</small>
                </span>
                <StatusPill tone={item.status === 'paid' ? 'success' : 'neutral'}>
                  {item.status === 'paid' ? (fa ? 'تأیید شد' : 'Approved') : failureLabel(item.failure_code, locale)}
                </StatusPill>
              </li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
    </div>
  )
}

function MembersTab({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState('')
  const results = useQuery({ queryKey: ['admin', 'search', submitted], queryFn: () => searchMembers(submitted), enabled: submitted.length >= 3 })

  function search(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    if (value.length < 3) return
    setSelected('')
    setSubmitted(value)
  }

  return (
    <div className="admin-section">
      <form className="admin-search" onSubmit={search} role="search">
        <label className="sr-only" htmlFor="admin-member-search">{fa ? 'جستجوی عضو' : 'Find a member'}</label>
        <input
          autoComplete="off"
          dir="ltr"
          id="admin-member-search"
          minLength={3}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={fa ? 'ابتدای ایمیل یا شناسه حساب' : 'Start of an email, or an account id'}
          type="search"
          value={query}
        />
        <Button disabled={query.trim().length < 3} type="submit"><Search size={16} />{fa ? 'جستجو' : 'Search'}</Button>
      </form>
      {results.isError ? <Problem error={results.error} locale={locale} what={{ fa: 'جستجو', en: 'The search' }} /> : null}
      {results.data?.length === 0 ? <p className="admin-hint">{fa ? 'حسابی پیدا نشد.' : 'No account found.'}</p> : null}
      {results.data?.length && !selected ? (
        <ContentCard className="admin-list-card">
          <ul className="admin-list">
            {results.data.map((member) => (
              <li key={member.user_id}>
                <button onClick={() => setSelected(member.user_id)} type="button">
                  <span>
                    <strong dir="ltr">{member.email ?? member.user_id}</strong>
                    <small>{member.country_code ?? '—'} · {fa ? 'عضو از' : 'joined'} {date(member.created_at, locale)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
      {selected ? <MemberCard locale={locale} onBack={() => setSelected('')} userId={selected} /> : null}
    </div>
  )
}

function currentPeriodEnd(member: MemberDetail) {
  const now = Date.now()
  const live = member.entitlements.filter((item) => item.status === 'active' && Date.parse(item.period_end) > now)
  return live.map((item) => item.period_end).sort().at(-1) ?? null
}

const SOURCE_LABELS: Record<string, { fa: string; en: string }> = {
  gift: { fa: 'هدیه', en: 'Gift' },
  subscription: { fa: 'پرداخت', en: 'Paid' },
  admin: { fa: 'دستی (مدیر)', en: 'Manual (admin)' },
}

function MemberCard({ locale, onBack, userId }: { locale: AppLocale; onBack: () => void; userId: string }) {
  const fa = locale === 'fa'
  const queryClient = useQueryClient()
  const member = useQuery({ queryKey: ['admin', 'member', userId], queryFn: () => loadMember(userId) })
  const [days, setDays] = useState(30)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const grant = useMutation({
    mutationFn: () => grantDays(userId, days, note.trim()),
    onSuccess: (result) => {
      setNote('')
      setMessage(fa ? `${formatNumber(days, locale)} روز اضافه شد؛ عضویت تا ${date(result.period_end, locale)} است.` : `${days} days added; membership runs until ${date(result.period_end, locale)}.`)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'member', userId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: () => setMessage(fa ? 'روزها اضافه نشد. دوباره تلاش کن.' : 'The days were not added. Try again.'),
  })

  if (member.isPending) return <ContentCard aria-busy="true"><p>{fa ? 'در حال بارگذاری…' : 'Loading…'}</p></ContentCard>
  if (member.isError) return <Problem error={member.error} locale={locale} what={{ fa: 'عضو', en: 'The member' }} />
  const data = member.data
  const end = currentPeriodEnd(data)
  const validGrant = Number.isInteger(days) && days >= 1 && days <= 90 && note.trim().length >= 3 && note.trim().length <= 200

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!validGrant || grant.isPending) return
    const question = fa
      ? `${formatNumber(days, locale)} روز عضویت به ${data.email ?? 'این عضو'} اضافه شود؟`
      : `Add ${days} days of membership to ${data.email ?? 'this member'}?`
    if (window.confirm(question)) grant.mutate()
  }

  return (
    <ContentCard className="admin-member">
      <div className="admin-section__head">
        <div>
          <h2 dir="ltr">{data.email ?? data.user_id}</h2>
          <p className="admin-hint">
            {data.country_code ?? '—'} · {fa ? 'عضو از' : 'joined'} {date(data.created_at, locale)} · {fa ? 'آخرین ورود' : 'last sign-in'} {date(data.last_sign_in_at, locale)}
            {data.membership_interest_at ? ` · ${fa ? 'در فهرست انتظار' : 'on the waitlist'}` : ''}
          </p>
        </div>
        <Button onClick={onBack} variant="ghost">{fa ? 'نتایج جستجو' : 'Search results'}</Button>
      </div>
      <StatusPill tone={end ? 'success' : 'neutral'}>
        {end ? (fa ? `عضویت فعال تا ${date(end, locale)}` : `Member until ${date(end, locale)}`) : (fa ? 'عضویت فعالی ندارد' : 'No active membership')}
      </StatusPill>

      <h3>{fa ? 'دوره‌های عضویت' : 'Membership periods'}</h3>
      {data.entitlements.length ? (
        <ul className="admin-list">
          {data.entitlements.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{SOURCE_LABELS[item.source]?.[locale] ?? item.source}</strong>
                <small>{date(item.period_start, locale)} – {date(item.period_end, locale)}</small>
              </span>
              <small>{item.status === 'active' ? (fa ? 'فعال' : 'active') : item.status}</small>
            </li>
          ))}
        </ul>
      ) : <p className="admin-hint">{fa ? 'هنوز دوره‌ای ندارد.' : 'No periods yet.'}</p>}

      <h3>{fa ? 'پرداخت‌ها' : 'Payments'}</h3>
      {data.payments.length ? (
        <ul className="admin-list">
          {data.payments.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.currency === 'IRR' ? rials(item.amount_minor, locale) : `${formatNumber(item.amount_minor, locale)} ${item.currency}`}</strong>
                <small>{item.provider} · {date(item.created_at, locale, true)}</small>
              </span>
              <small>{item.status === 'paid' ? (fa ? 'پرداخت شد' : 'paid') : item.status === 'pending' ? (fa ? 'در انتظار' : 'pending') : (failureLabel(item.failure_code, locale) || item.status)}</small>
            </li>
          ))}
        </ul>
      ) : <p className="admin-hint">{fa ? 'پرداختی ندارد.' : 'No payments.'}</p>}

      <form className="admin-grant" onSubmit={submit}>
        <h3>{fa ? 'افزودن روز عضویت' : 'Add membership days'}</h3>
        <p className="admin-hint">{fa ? 'برای اصلاح اشتباه یا جبران؛ بعد از پایان دوره فعلی شروع می‌شود و با یادداشت تو ثبت می‌شود.' : 'For corrections or goodwill. It starts after the current period ends and is logged with your note.'}</p>
        <label>
          <span>{fa ? 'تعداد روز (۱ تا ۹۰)' : 'Days (1–90)'}</span>
          <input inputMode="numeric" max={90} min={1} onChange={(event) => setDays(Number(event.target.value))} type="number" value={Number.isFinite(days) ? days : ''} />
        </label>
        <label>
          <span>{fa ? 'یادداشت (چرا؟)' : 'Note (why?)'}</span>
          <input maxLength={200} onChange={(event) => setNote(event.target.value)} type="text" value={note} />
        </label>
        {message ? <div className="inline-notice" role="status">{message}</div> : null}
        <Button disabled={!validGrant} loading={grant.isPending} type="submit">{fa ? 'افزودن روزها' : 'Add days'}</Button>
      </form>
    </ContentCard>
  )
}

function WaitlistTab({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const waitlist = useQuery({ queryKey: ['admin', 'waitlist'], queryFn: loadWaitlist })
  const [copied, setCopied] = useState(false)
  if (waitlist.isPending) return <ContentCard aria-busy="true"><p>{fa ? 'در حال بارگذاری…' : 'Loading…'}</p></ContentCard>
  if (waitlist.isError) return <Problem error={waitlist.error} locale={locale} what={{ fa: 'فهرست انتظار', en: 'The waitlist' }} />
  const emails = waitlist.data.map((item) => item.email).filter((email): email is string => Boolean(email))

  async function copy() {
    try {
      await navigator.clipboard.writeText(emails.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section__head">
        <p className="admin-hint">{fa
          ? `${formatNumber(waitlist.data.length, locale)} نفر خارج از ایران خواسته‌اند وقتی عضویت باز شد خبرشان کنیم.`
          : `${waitlist.data.length} people outside Iran asked to hear when membership opens.`}</p>
        <Button disabled={!emails.length} onClick={() => void copy()} variant="secondary"><Copy size={16} />{copied ? (fa ? 'کپی شد' : 'Copied') : (fa ? 'کپی ایمیل‌ها' : 'Copy emails')}</Button>
      </div>
      {waitlist.data.length ? (
        <ContentCard className="admin-list-card">
          <ul className="admin-list">
            {waitlist.data.map((item, index) => (
              <li key={`${item.email ?? 'x'}-${index}`}>
                <span><strong dir="ltr">{item.email ?? '—'}</strong><small>{item.country_code ?? '—'}</small></span>
                <small>{date(item.registered_at, locale)}</small>
              </li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
    </div>
  )
}
