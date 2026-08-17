import { Download, LockKeyhole, ShieldAlert, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import {
  deleteAccount,
  downloadAccountExport,
  exportAccountData,
  loadAccountDeletionStatus,
  loadAccountExportStatus,
} from '../../data/repository'
import type { AccountExportResponse } from '../../data/contracts'
import { localizedPath } from '../../router/route-utils'
import { Input } from '../../ui/FormControls'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'
import { ModalShell } from '../../components/ModalShell'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { EXPORT_TTL_MS, type DeleteStatus, type ExportStatus } from './me-state'
import '../../../styles/me.css'

function exportStatusFromRequest(result: AccountExportResponse | { export_request: AccountExportResponse['export_request'] | null }): ExportStatus {
  const row = result.export_request
  if (!row) return 'idle'
  if (row.status === 'ready' && row.expires_at && Date.parse(row.expires_at) <= Date.now()) return 'expired'
  return row.status
}

function applyExportPayload(
  payload: AccountExportResponse['export'] | null | undefined,
  urlRef: { current: string },
  setDownloadUrl: (url: string) => void,
  setReadyAt: (value: number) => void,
) {
  if (!payload) return false
  if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  urlRef.current = url
  setDownloadUrl(url)
  setReadyAt(Date.parse(payload.generated_at) || Date.now())
  return true
}

export function AccountDataPage({
  locale,
  preview,
  exportState,
  deleteState,
}: {
  locale: AppLocale
  preview: boolean
  exportState?: ExportStatus
  deleteState?: DeleteStatus
}) {
  const [, navigate] = useLocation()
  const online = useOnlineStatus()
  const fa = locale === 'fa'
  const [exportStatus, setExportStatus] = useState<ExportStatus>(exportState ?? 'idle')
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>(deleteState ?? 'idle')
  const [deleteOpen, setDeleteOpen] = useState(deleteState === 'review')
  const [confirmation, setConfirmation] = useState('')
  const [readyAt, setReadyAt] = useState<number | undefined>(undefined)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState(deleteState === 'failed'
    ? (locale === 'fa' ? 'حذف کامل نشد. حساب حذف نشده و برای بررسی امن مانده است. کد DEL-ERR-09' : 'Deletion failed. The account was not deleted and remains safely locked. Reference DEL-ERR-09.')
    : '')
  const urlRef = useRef('')

  useEffect(() => {
    if (preview) return
    let cancelled = false
    void Promise.all([
      loadAccountExportStatus(),
      loadAccountDeletionStatus(),
    ]).then(([exportResult, deletionResult]) => {
      if (cancelled) return
      const nextExport = exportStatusFromRequest(exportResult)
      setExportStatus(nextExport)
      if (exportResult.export_request?.ready_at) {
        setReadyAt(Date.parse(exportResult.export_request.ready_at))
      }
      if (deletionResult.deletion_request?.status === 'pending') setDeleteStatus('pending')
      if (deletionResult.deletion_request?.status === 'failed') setDeleteStatus('failed')
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [preview])

  useEffect(() => {
    if (exportStatus !== 'ready' || readyAt == null) return
    const remaining = Math.max(1, EXPORT_TTL_MS - (Date.now() - readyAt))
    const timer = window.setTimeout(() => setExportStatus('expired'), remaining)
    return () => window.clearTimeout(timer)
  }, [exportStatus, readyAt])

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  async function requestExport() {
    if (preview) {
      setExportStatus('pending')
      window.setTimeout(() => {
        setReadyAt(Date.now())
        setExportStatus('ready')
      }, 10)
      return
    }
    setExportStatus('pending')
    setError('')
    try {
      const result = await exportAccountData()
      const next = exportStatusFromRequest(result)
      if (next === 'ready') applyExportPayload(result.export, urlRef, setDownloadUrl, setReadyAt)
      setExportStatus(next)
    } catch {
      setExportStatus('failed')
      setError(fa ? 'آماده‌سازی خروجی انجام نشد. دوباره تلاش کن. هیچ داده‌ای حذف نشده است.' : 'The export could not be prepared. Try again. No account data was deleted.')
    }
  }

  async function downloadReady() {
    if (downloadUrl) {
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `momentum-account-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      return
    }
    if (preview) return
    try {
      const result = await downloadAccountExport()
      if (!applyExportPayload(result.export, urlRef, setDownloadUrl, setReadyAt) || !urlRef.current) return
      const anchor = document.createElement('a')
      anchor.href = urlRef.current
      anchor.download = `momentum-account-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
    } catch {
      setExportStatus('failed')
      setError(fa ? 'آماده‌سازی خروجی انجام نشد. دوباره تلاش کن. هیچ داده‌ای حذف نشده است.' : 'The export could not be prepared. Try again. No account data was deleted.')
    }
  }

  async function removeAccount() {
    if (confirmation !== 'DELETE') return
    setDeleteStatus('pending')
    setError('')
    try {
      if (!preview) await deleteAccount()
      setDeleteStatus('complete')
      setDeleteOpen(false)
      if (!preview) {
        navigate(localizedPath(locale))
        window.location.reload()
      }
    } catch {
      setDeleteStatus('failed')
      setError(fa ? 'حذف کامل نشد. حساب حذف نشده و برای بررسی امن مانده است. کد DEL-ERR-09' : 'Deletion failed. The account was not deleted and remains safely locked. Reference DEL-ERR-09.')
    }
  }

  if (deleteStatus === 'complete') {
    return (
      <main className="app-page account-data-page screen-enter">
        <ContentCard className="account-state-card">
          <StatusPill tone="success">{fa ? 'حذف کامل شد' : 'Deletion complete'}</StatusPill>
          <h1>{fa ? 'حساب دیگر قابل ورود یا بازیابی نیست.' : 'The account can no longer be accessed or recovered.'}</h1>
          <Link className="orbit-button orbit-button--primary" href={localizedPath(locale)}>{fa ? 'بازگشت به صفحه اصلی' : 'Back to home'}</Link>
        </ContentCard>
      </main>
    )
  }

  return (
    <main className="app-page account-data-page screen-enter">
      <section className="page-heading">
        <div>
          <p className="orbit-eyebrow"><LockKeyhole size={15} />{fa ? 'کنترل داده' : 'Data controls'}</p>
          <h1>{fa ? 'حریم خصوصی و حساب' : 'Privacy & account'}</h1>
          <p>{fa ? 'خروجی قابل‌حمل بگیر یا حساب و داده‌های وابسته را برای همیشه حذف کن.' : 'Download a portable export or permanently remove your account and associated data.'}</p>
        </div>
      </section>
      <div className="account-data-grid">
        <ContentCard>
          <span className="account-data-card__icon"><Download size={23} /></span>
          <div>
            <h2>{fa ? 'دانلود داده‌های حساب' : 'Download account data'}</h2>
            <p>{fa ? 'پروفایل، رضایت‌ها، برنامه‌ها و ثبت‌ها در قالب JSON آماده می‌شوند. لینک دانلود تا ۲۴ ساعت معتبر است.' : 'Profile, consents, plans, and logs are prepared as JSON. The download link stays valid for 24 hours.'}</p>
          </div>
          <Button disabled={!online || exportStatus === 'pending'} loading={exportStatus === 'pending'} onClick={() => void requestExport()}>
            <Download size={17} />{exportStatus === 'pending' ? (fa ? 'در حال آماده‌سازی' : 'Preparing export') : fa ? 'درخواست فایل' : 'Request archive'}
          </Button>
        </ContentCard>
        <ContentCard className="account-data-danger">
          <span className="account-data-card__icon"><Trash2 size={23} /></span>
          <div>
            <h2>{fa ? 'حذف دائمی حساب' : 'Permanently delete account'}</h2>
            <p>{fa ? 'عضویت لغو می‌شود و داده‌ها طبق سیاست نگه‌داری برای حذف دائمی صف می‌شوند. این کار قابل بازگشت نیست.' : 'Membership is cancelled and data is queued for permanent deletion under the retention policy. This cannot be undone.'}</p>
          </div>
          <Button disabled={!online} onClick={() => { setDeleteOpen(true); setDeleteStatus('review') }} variant="danger"><Trash2 size={17} />{fa ? 'حذف حساب' : 'Delete account'}</Button>
        </ContentCard>
      </div>
      <div className="account-export-states">
        {exportStatus === 'pending' ? <ContentCard className="account-state-card"><StatusPill>{fa ? 'در انتظار آماده‌سازی' : 'Pending'}</StatusPill><p>{fa ? 'اعلان پس از آماده‌شدن نمایش داده می‌شود. درخواست تکراری ساخته نمی‌شود.' : 'You will see a notice when it is ready. A duplicate request is not created.'}</p></ContentCard> : null}
        {exportStatus === 'ready' ? <ContentCard className="account-state-card"><StatusPill tone="success">{fa ? 'آماده دریافت' : 'Ready'}</StatusPill><h3>{fa ? 'لینک تا ۲۴ ساعت معتبر است' : 'Link valid for 24 hours'}</h3><Button onClick={downloadReady}><Download size={17} />{fa ? 'دریافت فایل' : 'Download archive'}</Button></ContentCard> : null}
        {exportStatus === 'expired' ? <ContentCard className="account-state-card"><StatusPill tone="neutral">{fa ? 'منقضی شده' : 'Expired'}</StatusPill><p>{fa ? 'لینک قبلی دیگر کار نمی‌کند؛ درخواست تازه داده تکراری ایجاد نمی‌کند.' : 'The old link no longer works; a new request does not duplicate account data.'}</p><Button onClick={() => void requestExport()} variant="secondary">{fa ? 'ساخت لینک تازه' : 'Create a new link'}</Button></ContentCard> : null}
        {exportStatus === 'failed' ? <ContentCard className="account-state-card"><StatusPill tone="neutral">{fa ? 'ناموفق' : 'Failed'}</StatusPill><p>{error}</p><Button onClick={() => void requestExport()} variant="secondary">{fa ? 'تلاش دوباره' : 'Try again'}</Button></ContentCard> : null}
      </div>
      {deleteStatus === 'pending' ? <div className="inline-notice" role="status">{fa ? 'درخواست حذف ثبت شد و ورود جدید مسدود می‌شود.' : 'Deletion is pending and new sign-in will be blocked.'}</div> : null}
      {deleteStatus === 'failed' ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
      {preview ? <div className="inline-notice inline-notice--warning">{fa ? 'در Preview خروجی و حذف شبیه‌سازی می‌شوند و به سرور نمی‌روند.' : 'Export and deletion are simulated in preview and do not reach the server.'}</div> : null}
      {deleteOpen ? <ModalShell className="delete-account-dialog" labelId="delete-account-title" material="content" onClose={() => { setDeleteOpen(false); if (deleteStatus === 'review') setDeleteStatus('idle') }}>
        <header><div><ShieldAlert size={22} /><h2 id="delete-account-title">{fa ? 'حذف حساب برگشت‌پذیر نیست' : 'Account deletion cannot be undone'}</h2></div><button aria-label={fa ? 'بستن' : 'Close'} onClick={() => { setDeleteOpen(false); if (deleteStatus === 'review') setDeleteStatus('idle') }} type="button"><X size={20} /></button></header>
        <p>{fa ? 'عضویت لغو می‌شود. برای تأیید، عبارت انگلیسی DELETE را وارد کن. می‌توانی اول خروجی بگیری.' : 'Membership is cancelled. Type DELETE to confirm. You can export a copy first.'}</p>
        <Input autoComplete="off" label="DELETE" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
        <div className="delete-account-dialog__actions"><Button onClick={() => { setDeleteOpen(false); if (deleteStatus === 'review') setDeleteStatus('idle') }} variant="secondary">{fa ? 'انصراف' : 'Cancel'}</Button><Button disabled={confirmation !== 'DELETE'} loading={deleteStatus === 'pending'} onClick={() => void removeAccount()} variant="danger"><Trash2 size={17} />{fa ? 'حذف دائمی' : 'Delete permanently'}</Button></div>
      </ModalShell> : null}
    </main>
  )
}
