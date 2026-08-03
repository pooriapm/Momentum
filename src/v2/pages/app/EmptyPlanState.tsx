import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { OrbitMark } from '../../ui/OrbitMark'
import { ContentCard } from '../../ui/primitives'

export function EmptyPlanState({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  return (
    <ContentCard className="empty-plan-state">
      <OrbitMark animated size={64} />
      <h2>{locale === 'fa' ? 'هنوز برنامه‌ای فعال نیست' : 'No active plan yet'}</h2>
      <p>{locale === 'fa' ? 'اطلاعات اولیه را کامل کن تا برنامه‌ی غذا و تمرین شخصی‌سازی‌شده ساخته شود.' : 'Complete onboarding to create your personalized nutrition and training plan.'}</p>
      <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/onboarding/basics')}><Sparkles size={18} />{t('landing.primaryCta')}</Link>
    </ContentCard>
  )
}
