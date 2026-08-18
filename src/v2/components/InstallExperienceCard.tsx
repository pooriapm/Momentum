import { Download, Share2, Smartphone } from 'lucide-react'
import { useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { clearInstallPrompt, useInstallPromptState } from '../../platform/pwa/install-prompt'

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function InstallExperienceCard({ locale }: { locale: AppLocale }) {
  const { installed, prompt: installPrompt } = useInstallPromptState()
  const [installing, setInstalling] = useState(false)
  const isIos = isIosDevice()
  const fa = locale === 'fa'

  if (installed) return null

  async function install() {
    if (!installPrompt) return
    setInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      clearInstallPrompt(choice.outcome === 'accepted')
    } finally {
      setInstalling(false)
    }
  }

  const hint = isIos
    ? (fa ? 'Safari، دکمه اشتراک‌گذاری، سپس Add to Home Screen' : 'Safari → Share → Add to Home Screen')
    : installPrompt
      ? (fa ? 'به صفحهٔ اصلی گوشی اضافه می‌شود' : 'Add it to your home screen')
      : (fa ? 'از منوی مرورگر Install app را بزن' : 'Choose Install app in the browser menu')

  if (installPrompt) {
    return (
      <button className="me-row" disabled={installing} onClick={() => void install()} type="button">
        <span className="me-row__icon"><Smartphone size={18} /></span>
        <span className="me-row__copy">
          <span className="me-row__label">{fa ? 'نصب برنامه' : 'Install app'}</span>
          <small>{hint}</small>
        </span>
        <span className="me-row__meta">{installing ? (fa ? '…' : '…') : <><Download size={15} />{fa ? 'نصب' : 'Install'}</>}</span>
      </button>
    )
  }

  return (
    <div className="me-row me-row--static">
      <span className="me-row__icon"><Smartphone size={18} /></span>
      <span className="me-row__copy">
        <span className="me-row__label">{fa ? 'نصب برنامه' : 'Install app'}</span>
        <small>{isIos ? <><Share2 size={13} /> {hint}</> : hint}</small>
      </span>
    </div>
  )
}
