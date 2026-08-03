import { Download, LockKeyhole, ShieldAlert, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { deleteAccount, exportAccountData } from '../../data/repository'
import { localizedPath } from '../../router/route-utils'
import { Input } from '../../ui/FormControls'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import { ModalShell } from '../../components/ModalShell'
import { useOnlineStatus } from '../../../platform/pwa/network'

export function AccountDataPage({ locale, preview }: { locale: AppLocale; preview: boolean }) {
  const [, navigate] = useLocation()
  const online = useOnlineStatus()
  const fa = locale === 'fa'
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function downloadExport() {
    if (preview) return
    setExporting(true)
    setError('')
    setMessage('')
    try {
      const payload = await exportAccountData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `momentum-account-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      setMessage(fa ? 'خروجی حساب دانلود شد.' : 'Your account export was downloaded.')
    } catch {
      setError(fa ? 'آماده‌سازی خروجی انجام نشد. دوباره تلاش کن.' : 'The export could not be prepared. Try again.')
    } finally {
      setExporting(false)
    }
  }

  async function removeAccount() {
    if (confirmation !== 'DELETE') return
    setDeleting(true)
    setError('')
    try {
      await deleteAccount()
      navigate(localizedPath(locale))
      window.location.reload()
    } catch {
      setError(fa ? 'حذف حساب انجام نشد. برای امنیت، یک‌بار خارج و دوباره وارد شو و سپس تلاش کن.' : 'Account deletion failed. For security, sign in again and retry.')
      setDeleting(false)
    }
  }

  return (
    <main className="app-page account-data-page screen-enter">
      <section className="page-heading"><div><p className="orbit-eyebrow"><LockKeyhole size={15} />{fa ? 'کنترل داده' : 'Data controls'}</p><h1>{fa ? 'حریم خصوصی و حساب' : 'Privacy & account'}</h1><p>{fa ? 'خروجی قابل‌حمل بگیر یا حساب و داده‌های وابسته را برای همیشه حذف کن.' : 'Download a portable export or permanently remove your account and associated data.'}</p></div><StatusPill tone="success">Private</StatusPill></section>
      <div className="account-data-grid">
        <ContentCard>
          <span className="account-data-card__icon"><Download size={23} /></span>
          <div><h2>{fa ? 'دانلود داده‌های حساب' : 'Download account data'}</h2><p>{fa ? 'پروفایل، رضایت‌ها، برنامه‌ها و ثبت‌ها در قالب JSON دانلود می‌شوند. برای فایل‌های خصوصی، لینک دانلود ده‌دقیقه‌ای داخل خروجی قرار می‌گیرد.' : 'Profile, consents, plans, and logs are exported as JSON. Private files are represented by download links that remain valid for ten minutes.'}</p></div>
          <Button disabled={preview || !online} loading={exporting} onClick={() => void downloadExport()}><Download size={17} />{fa ? 'ساخت خروجی' : 'Create export'}</Button>
        </ContentCard>
        <ContentCard className="account-data-danger">
          <span className="account-data-card__icon"><Trash2 size={23} /></span>
          <div><h2>{fa ? 'حذف دائمی حساب' : 'Permanently delete account'}</h2><p>{fa ? 'این کار حساب، برنامه‌ها، ثبت‌های روزانه و فایل‌های خصوصی را حذف می‌کند و قابل بازگشت نیست.' : 'This removes your account, plans, daily logs, and private files. It cannot be undone.'}</p></div>
          <Button disabled={preview || !online} onClick={() => setDeleteOpen(true)} variant="danger"><Trash2 size={17} />{fa ? 'حذف حساب' : 'Delete account'}</Button>
        </ContentCard>
      </div>
      {preview ? <div className="inline-notice inline-notice--warning">{fa ? 'کنترل‌های حساب در Preview غیرفعال‌اند.' : 'Account controls are disabled in preview.'}</div> : null}
      {message ? <div className="inline-notice inline-notice--success" role="status">{message}</div> : null}
      {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
      {deleteOpen ? <ModalShell className="delete-account-dialog" labelId="delete-account-title" onClose={() => setDeleteOpen(false)}>
        <header><div><ShieldAlert size={22} /><h2 id="delete-account-title">{fa ? 'حذف حساب برگشت‌پذیر نیست' : 'Account deletion cannot be undone'}</h2></div><button aria-label={fa ? 'بستن' : 'Close'} onClick={() => setDeleteOpen(false)} type="button"><X size={20} /></button></header>
        <p>{fa ? 'برای تأیید، عبارت انگلیسی DELETE را وارد کن. به‌دلیل حساسیت این عملیات ممکن است لازم باشد دوباره وارد حساب شوی.' : 'Type DELETE to confirm. Because this is sensitive, you may be asked to sign in again.'}</p>
        <Input autoComplete="off" label="DELETE" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
        <div className="delete-account-dialog__actions"><Button onClick={() => setDeleteOpen(false)} variant="secondary">{fa ? 'انصراف' : 'Cancel'}</Button><Button disabled={confirmation !== 'DELETE'} loading={deleting} onClick={() => void removeAccount()} variant="danger"><Trash2 size={17} />{fa ? 'حذف دائمی' : 'Delete permanently'}</Button></div>
      </ModalShell> : null}
    </main>
  )
}
