import { Sparkles } from 'lucide-react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { EmptyState } from '../../ui/feedback'
import { OrbitMark } from '../../ui/OrbitMark'
import '../../../styles/today.css'

export function EmptyPlanState({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  return (
    <EmptyState
      action={(
        <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/onboarding')}>
          <Sparkles size={18} />{fa ? 'ادامه راه‌اندازی' : 'Continue setup'}
        </Link>
      )}
      className="empty-plan-state"
      data-inventory="PLAN-07"
      icon={<OrbitMark animated size={64} />}
      title={fa ? 'هنوز برنامه‌ای فعال نیست' : 'No active plan'}
    >
      {fa ? 'راه‌اندازی یا دسترسی را کامل کن تا پس از تأیید، یک برنامه دقیق ۳۰روزه ساخته شود. اطلاعاتت ذخیره می‌ماند.' : 'Complete setup or access requirements so one exact 30-day plan can be created after eligibility is confirmed. Your information is saved.'}
    </EmptyState>
  )
}
