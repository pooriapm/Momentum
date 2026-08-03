import { Check, Download, Share2, Smartphone } from 'lucide-react'
import { useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { Button, ContentCard, StatusPill } from '../ui/primitives'
import { clearInstallPrompt, useInstallPromptState } from '../../platform/pwa/install-prompt'

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function InstallExperienceCard({ locale }: { locale: AppLocale }) {
  const { installed, prompt: installPrompt } = useInstallPromptState()
  const [installing, setInstalling] = useState(false)
  const isIos = isIosDevice()

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

  return (
    <ContentCard className="install-experience-card">
      <span className="install-experience-card__icon"><Smartphone size={23} /></span>
      <div>
        <div className="install-experience-card__heading">
          <h3>{locale === 'fa' ? 'Momentum را روی گوشی نصب کن' : 'Install Momentum on your phone'}</h3>
          <StatusPill tone="neutral">PWA</StatusPill>
        </div>
        {isIos ? (
          <p>
            {locale === 'fa' ? 'در Safari روی ' : 'In Safari, tap '}
            <span><Share2 size={15} />{locale === 'fa' ? 'اشتراک‌گذاری' : 'Share'}</span>
            {locale === 'fa' ? ' بزن و «Add to Home Screen» را انتخاب کن.' : ', then choose “Add to Home Screen”.'}
          </p>
        ) : installPrompt ? (
          <p>{locale === 'fa' ? 'بدون فروشگاه و با یک لمس نصب می‌شود؛ نسخه‌های جدید هم خودکار پیشنهاد می‌شوند.' : 'Install in one tap without an app store. New versions are offered automatically.'}</p>
        ) : (
          <p>{locale === 'fa' ? 'از منوی مرورگر «Install app» یا «Add to Home Screen» را انتخاب کن.' : 'Choose “Install app” or “Add to Home Screen” from your browser menu.'}</p>
        )}
      </div>
      {installPrompt ? <Button loading={installing} onClick={() => void install()}><Download size={17} />{locale === 'fa' ? 'نصب' : 'Install'}</Button> : <span className="install-experience-card__ready"><Check size={16} />{locale === 'fa' ? 'آماده نصب' : 'Ready'}</span>}
    </ContentCard>
  )
}
