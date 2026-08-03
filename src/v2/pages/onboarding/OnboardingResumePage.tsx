import { useQuery } from '@tanstack/react-query'
import { Link, Redirect } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { loadOnboardingDraft } from '../../onboarding/repository'
import { localizedPath } from '../../router/route-utils'
import { Button, ContentCard, PageSkeleton } from '../../ui/primitives'

export function OnboardingResumePage({ locale }: { locale: AppLocale }) {
  const { user, status } = useAuth()
  const draft = useQuery({
    queryKey: ['onboarding-draft', user?.id],
    queryFn: () => loadOnboardingDraft(user!.id),
    enabled: Boolean(user),
  })
  const fa = locale === 'fa'

  if (status === 'loading' || draft.isLoading) return <PageSkeleton />
  if (!user) return <Redirect replace to={localizedPath(locale, '/auth/sign-in')} />
  if (draft.isError) {
    return (
      <main className="guard-page">
        <ContentCard>
          <h1>{fa ? 'ادامه آنبوردینگ در دسترس نیست' : 'Onboarding is temporarily unavailable'}</h1>
          <p>{fa ? 'اطلاعات ذخیره‌شده خوانده نشد. دوباره تلاش کن؛ فرم خالی جایگزین داده‌ها نمی‌شود.' : 'Saved answers could not be loaded. Retry; an empty form will not replace them.'}</p>
          <Button onClick={() => void draft.refetch()}>{fa ? 'تلاش دوباره' : 'Retry'}</Button>
          <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale)}>{fa ? 'بازگشت' : 'Back'}</Link>
        </ContentCard>
      </main>
    )
  }
  return <Redirect replace to={localizedPath(locale, `/onboarding/${draft.data?.currentStep ?? 'basics'}`)} />
}
