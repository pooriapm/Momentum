import { Sparkles } from 'lucide-react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { OrbitMark } from '../../ui/OrbitMark'
import { ContentCard } from '../../ui/primitives'
import '../../../styles/today.css'

export function EmptyPlanState({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  return (
    <ContentCard className="empty-plan-state" data-inventory="PLAN-07">
      <OrbitMark animated size={64} />
      <h2>{fa ? 'هنوز برنامه‌ای فعال نیست' : 'No active plan'}</h2>
      <p>{fa ? 'راه‌اندازی یا دسترسی را کامل کن تا پس از تأیید، یک برنامه یک‌ماهه ساخته شود. اطلاعاتت ذخیره می‌ماند.' : 'Complete setup or access requirements so one monthly plan can be created after eligibility is confirmed. Your information is saved.'}</p>
      <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/onboarding')}>
        <Sparkles size={18} />{fa ? 'ادامه راه‌اندازی' : 'Continue setup'}
      </Link>
    </ContentCard>
  )
}
