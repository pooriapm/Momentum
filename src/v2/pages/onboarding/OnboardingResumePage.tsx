import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Redirect } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { deleteOnboardingDraft, loadOnboardingDraft } from '../../onboarding/repository'
import { earliestIncompleteStep, hasMeaningfulDraft } from '../../onboarding/onboarding-state'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard, PageSkeleton } from '../../ui/primitives'
import { BrandLockup } from '../../ui/OrbitMark'
import { useTranslation } from 'react-i18next'
import './onboarding.css'

export function OnboardingResumePage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const { user, status } = useAuth()
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const draft = useQuery({
    queryKey: ['onboarding-draft', user?.id],
    queryFn: () => loadOnboardingDraft(user!.id),
    enabled: Boolean(user),
  })
  const fa = locale === 'fa'
  const values = draft.data?.values ?? {}
  const resumeStep = earliestIncompleteStep(values, locale)
  const hasProgress = hasMeaningfulDraft(values)

  async function restart() {
    if (!user) return
    setRestarting(true)
    try {
      await deleteOnboardingDraft(user.id)
      setRestarted(true)
    } finally {
      setRestarting(false)
    }
  }

  if (status === 'loading' || draft.isLoading) return <PageSkeleton />
  if (!user) return <Redirect replace to={localizedPath(locale, '/auth/sign-in')} />
  if (draft.isError) {
    return (
      <main className="guard-page screen-enter">
        <ContentCard>
          <h1>{fa ? 'ادامه آنبوردینگ در دسترس نیست' : 'Onboarding is temporarily unavailable'}</h1>
          <p>{fa ? 'اطلاعات ذخیره‌شده خوانده نشد. دوباره تلاش کن؛ فرم خالی جایگزین داده‌ها نمی‌شود.' : 'Saved answers could not be loaded. Retry; an empty form will not replace them.'}</p>
          <Button onClick={() => void draft.refetch()}>{fa ? 'تلاش دوباره' : 'Retry'}</Button>
          <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale)}>{fa ? 'بازگشت' : 'Back'}</Link>
        </ContentCard>
      </main>
    )
  }
  if (restarted || !hasProgress) {
    return <Redirect replace to={localizedPath(locale, '/onboarding/basics')} />
  }

  return (
    <main className="onboarding-page screen-enter">
      <header className="onboarding-header glass-chrome">
        <Link href={localizedPath(locale)}><BrandLockup compact /></Link>
      </header>
      <ContentCard className="onboarding-card onboarding-resume">
        <p className="orbit-eyebrow"><RefreshCw size={15} />{t('onboarding.setupEyebrow')}</p>
        <h1>{t('onboarding.resumeTitle')}</h1>
        <p>{t('onboarding.resumeCopy')}</p>
        <ul className="onboarding-resume__trust">
          <li><Save size={16} />{fa ? 'هر مرحله ذخیره می‌شود' : 'Each step is saved'}</li>
          <li><ShieldCheck size={16} />{t('onboarding.noMedicalClaim')}</li>
        </ul>
        <div className="onboarding-actions">
          <Button loading={restarting} onClick={() => void restart()} variant="ghost">{t('onboarding.restart')}</Button>
          <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, `/onboarding/${resumeStep}`)}>{t('onboarding.continueSetup')}</Link>
        </div>
      </ContentCard>
    </main>
  )
}
