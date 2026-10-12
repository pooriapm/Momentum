import { ArrowRight, LineChart, Repeat, ShoppingBasket } from 'lucide-react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import type { MemberFeature } from '../../entitlement'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, StatusPill } from '../../ui/primitives'
import '../../entitlement/entitlement.css'

const copy: Record<MemberFeature, { icon: typeof Repeat; fa: [string, string]; en: [string, string] }> = {
  'meal-swaps': {
    icon: Repeat,
    fa: ['جایگزینی وعده با عضویت', 'با عضویت، هر وعده چند گزینه هم‌ارز دارد و هر وقت خواستی عوضش می‌کنی.'],
    en: ['Meal swaps come with membership', 'Members get equivalent options for every meal and can swap any time.'],
  },
  'shopping-list': {
    icon: ShoppingBasket,
    fa: ['فهرست خرید با عضویت', 'با عضویت، مواد لازم وعده‌های هفته جمع می‌شود و آماده خرید است.'],
    en: ['The shopping list comes with membership', 'Members get every ingredient for the week’s meals, gathered and ready to shop.'],
  },
  'progress-trends': {
    icon: LineChart,
    fa: ['روند و مقایسه‌ها با عضویت', 'با عضویت، هفته‌ها کنار هم دیده می‌شوند و برنامه ماه بعد از همین روند ساخته می‌شود. ثبت روزانه و چک‌این‌ها رایگان می‌مانند.'],
    en: ['Trends and comparisons come with membership', 'Members see weeks side by side, and next month’s plan is built from that trend. Daily logging and check-ins stay free.'],
  },
}

/** Upsell card shown in place of a member-only feature. Never used for safety flows. */
export function MemberFeatureLock({ feature, locale, compact = false }: { feature: MemberFeature; locale: AppLocale; compact?: boolean }) {
  const item = copy[feature]
  const [title, body] = item[locale]
  const Icon = item.icon
  const cta = (
    <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/pricing')}>
      <span>{locale === 'fa' ? 'دیدن عضویت' : 'See membership'}</span>
      <ArrowRight aria-hidden="true" className="directional-icon" size={17} />
    </Link>
  )

  if (compact) {
    return (
      <div className="member-lock member-lock--compact" role="status">
        <Icon aria-hidden="true" size={17} />
        <span>{title}</span>
        <Link href={localizedPath(locale, '/pricing')}>{locale === 'fa' ? 'دیدن عضویت' : 'See membership'}</Link>
      </div>
    )
  }

  return (
    <ContentCard className="member-lock">
      <span aria-hidden="true" className="entitlement-gate__icon"><Icon size={24} /></span>
      <StatusPill tone="brand">{locale === 'fa' ? 'عضویت Momentum' : 'Momentum membership'}</StatusPill>
      <h2>{title}</h2>
      <p>{body}</p>
      {cta}
    </ContentCard>
  )
}
