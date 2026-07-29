import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  LoaderCircle,
} from 'lucide-react'

const TEMPLATE_URL = '/templates/momentum-weekly-plan-prompt.md'
const TEMPLATE_FILE_NAME = 'momentum-weekly-plan-prompt.md'
const DOWNLOAD_TIMEOUT_MS = 45_000

type DownloadState = 'idle' | 'downloading' | 'success' | 'error'

interface TemplateDownloadButtonProps {
  buttonClassName: string
  children: ReactNode
  className?: string
  iconSize?: number
}

export function TemplateDownloadButton({
  buttonClassName,
  children,
  className,
  iconSize = 20,
}: TemplateDownloadButtonProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const downloadTemplate = async () => {
    if (downloadState === 'downloading') return

    setDownloadState('downloading')
    setErrorMessage('')

    const controller = new AbortController()
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      DOWNLOAD_TIMEOUT_MS,
    )

    try {
      const response = await fetch(TEMPLATE_URL, {
        cache: 'no-store',
        signal: controller.signal,
      })

      if (!response.ok) {
        setErrorMessage(
          response.status === 404
            ? 'فایل تمپلیت پیدا نشد. کمی بعد دوباره تلاش کنید.'
            : 'سرور نتوانست فایل تمپلیت را ارسال کند. دوباره تلاش کنید.',
        )
        setDownloadState('error')
        return
      }

      const templateBlob = await response.blob()
      if (templateBlob.size === 0) {
        throw new Error('Empty template response')
      }

      const objectUrl = URL.createObjectURL(templateBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = TEMPLATE_FILE_NAME
      downloadLink.style.display = 'none'
      document.body.append(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
      setDownloadState('success')
    } catch (error) {
      const timedOut =
        error instanceof DOMException && error.name === 'AbortError'

      setErrorMessage(
        timedOut
          ? 'دریافت فایل بیش از حد طول کشید. اتصال اینترنت را بررسی و دوباره تلاش کنید.'
          : 'دانلود انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.',
      )
      setDownloadState('error')
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const statusMessage =
    downloadState === 'downloading'
      ? 'در حال دریافت تمپلیت؛ لطفاً منتظر بمانید…'
      : downloadState === 'success'
        ? 'دانلود تمپلیت با موفقیت شروع شد.'
        : downloadState === 'error'
          ? errorMessage
          : ''

  const StatusIcon =
    downloadState === 'downloading'
      ? LoaderCircle
      : downloadState === 'success'
        ? CheckCircle2
        : downloadState === 'error'
          ? AlertTriangle
          : Download

  return (
    <div className={className}>
      <button
        aria-busy={downloadState === 'downloading'}
        className={buttonClassName}
        disabled={downloadState === 'downloading'}
        onClick={() => void downloadTemplate()}
        type="button"
      >
        {children}
        <StatusIcon
          aria-hidden="true"
          className={`shrink-0 ${
            downloadState === 'downloading'
              ? 'animate-spin'
              : downloadState === 'success'
                ? 'text-[var(--color-accent)]'
                : downloadState === 'error'
                  ? 'text-[var(--color-danger)]'
                  : ''
          }`}
          size={iconSize}
        />
      </button>
      <div className="min-h-6 pt-2">
        {statusMessage && (
          <p
            className={`flex items-center gap-1.5 text-[10px] font-bold leading-4 ${
              downloadState === 'error'
                ? 'text-[var(--color-danger)]'
                : downloadState === 'success'
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)]'
            }`}
            role={downloadState === 'error' ? 'alert' : 'status'}
          >
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  )
}
