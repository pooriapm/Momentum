import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarRange,
  Check,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  HeartPulse,
  House,
  LineChart,
  Salad,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { demoPlan } from '../../data/demo'
import { localize } from '../../data/types'
import { formatNumber } from '../../lib/format'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, Eyebrow, GlassChrome, StatusPill } from '../../ui/primitives'
import { LazyImage } from '../../ui/LazyImage'
import { OrbitMark } from '../../ui/OrbitMark'
import { Reveal } from '../../ui/Reveal'

export function LandingPage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const features = [
    [Salad, t('landing.featurePlan'), t('landing.featurePlanCopy')],
    [CalendarRange, locale === 'fa' ? 'برنامه ماهانه' : 'Monthly plan', locale === 'fa' ? 'هر دوره با اطلاعات اولیه و نتیجه ماه قبل به‌روزرسانی می‌شود.' : 'Each period uses your baseline and the prior month’s outcomes.'],
    [BarChart3, t('landing.featureProgress'), t('landing.featureProgressCopy')],
    [ScanLine, t('landing.featureBody'), t('landing.featureBodyCopy')],
  ] as const

  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main>
        <section className="landing-hero">
          <div className="landing-aura landing-aura--one" />
          <div className="landing-aura landing-aura--two" />
          <div className="landing-hero__copy">
            <Eyebrow><Sparkles size={15} />{t('landing.eyebrow')}</Eyebrow>
            <h1>{locale === 'fa' ? <>هر روز، <bdi dir="ltr">Momentum</bdi> می‌داند</> : t('landing.titleLead')} <em>{t('landing.titleAccent')}</em></h1>
            <p>{t('landing.subtitle')}</p>
            <div className="landing-hero__actions">
              <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
                <span>{t('landing.primaryCta')}</span>
                <ArrowRight aria-hidden="true" className="directional-icon" size={18} />
              </Link>
              <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>
                <span>{t('landing.secondaryCta')}</span>
              </Link>
            </div>
            <p className="landing-hero__trust"><ShieldCheck size={17} />{t('landing.trust')}</p>
          </div>
          <ProductPreview locale={locale} />
        </section>

        <Reveal as="section" className="landing-section landing-system">
          <div className="landing-section__heading">
            <Eyebrow><Activity size={15} />Momentum Loop</Eyebrow>
            <h2>{t('landing.systemTitle')}</h2>
            <p>{t('landing.systemCopy')}</p>
          </div>
          <div className="feature-grid">
            {features.map(([Icon, title, copy], index) => (
              <ContentCard className="feature-card" key={title}>
                <span className={`feature-card__icon feature-card__icon--${index + 1}`}><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <ChevronRight aria-hidden="true" className="feature-card__arrow directional-icon" size={18} />
              </ContentCard>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="landing-section process-section">
          <div className="landing-section__heading">
            <Eyebrow><Sparkles size={15} />Personal by design</Eyebrow>
            <h2>{t('landing.stepsTitle')}</h2>
          </div>
          <ol className="process-grid">
            {[t('landing.stepOne'), t('landing.stepTwo'), t('landing.stepThree')].map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal as="section" className="landing-section safety-banner">
          <div className="safety-banner__mark"><HeartPulse size={29} /></div>
          <div>
            <Eyebrow>Safety architecture</Eyebrow>
            <h2>{t('landing.safetyTitle')}</h2>
            <p>{t('landing.safetyCopy')}</p>
          </div>
          <Link href={localizedPath(locale, '/safety')}>{t('common.learnMore')} <ChevronRight className="directional-icon" size={17} /></Link>
        </Reveal>

        <Reveal as="section" className="landing-final">
          <OrbitMark animated size={78} />
          <h2>{t('landing.finalTitle')}</h2>
          <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
            <span>{t('landing.primaryCta')}</span>
            <ArrowRight className="directional-icon" size={18} />
          </Link>
        </Reveal>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

function ProductPreview({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const lunchSlot = demoPlan.meals.find((meal) => meal.id === 'lunch') ?? demoPlan.meals[1]
  const lunch = lunchSlot.options[0]
  const workout = demoPlan.workout
  if (!lunch || !workout) return null

  return (
    <div aria-label={locale === 'fa' ? 'پیش‌نمایش محصول Momentum' : 'Momentum product preview'} className="product-preview">
      <GlassChrome className="product-preview__chrome">
        <span><OrbitMark size={30} /></span>
        <span className="product-preview__date">{locale === 'fa' ? 'امروز · ۰۸:۴۲' : 'Today · 08:42'}</span>
        <span className="product-preview__avatar">{locale === 'fa' ? 'آ' : 'A'}</span>
      </GlassChrome>
      <div className="product-preview__body">
        <StatusPill tone="brand"><Sparkles size={13} />{t('landing.nextAction')}</StatusPill>
        <h2>{t('landing.todayTitle')}</h2>
        <p>{t('landing.todayCopy')}</p>
        <ContentCard className="preview-meal-card">
          <LazyImage
            alt=""
            className="preview-meal-card__photo"
            fallbackSrc="/preview/saffron-chicken-lunch.svg"
            height={640}
            priority
            sizes="(max-width: 58rem) 86vw, 22rem"
            src="/preview/saffron-chicken-lunch.webp"
            srcSet="/preview/saffron-chicken-lunch-480.webp 480w, /preview/saffron-chicken-lunch-800.webp 800w, /preview/saffron-chicken-lunch.webp 960w"
            width={960}
          />
          <div className="preview-meal-card__body">
            <div className="preview-meal-card__heading">
              <span>
                <small>{localize(lunchSlot.label, locale)} · {lunchSlot.time}</small>
                <strong>{localize(lunch.name, locale)}</strong>
              </span>
              <span className="preview-meal-card__check"><Check size={17} /></span>
            </div>
            <p>{localize(lunch.description, locale)}</p>
            <div className="preview-meal-card__macros">
              <em>{formatNumber(lunch.nutrition.calories, locale)} kcal</em>
              <em>{formatNumber(lunch.nutrition.protein, locale)}g {t('app.protein')}</em>
              <em>{formatNumber(lunch.cookingMinutes, locale)} {locale === 'fa' ? 'دقیقه' : 'min'}</em>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="preview-workout-card">
          <span className="preview-workout-card__icon"><Dumbbell size={18} /></span>
          <div>
            <small>{t('app.training')}</small>
            <strong>{localize(workout.name, locale)}</strong>
            <p>{localize(workout.exerciseItems[0], locale)}</p>
          </div>
          <span className="preview-workout-card__meta">{formatNumber(workout.durationMinutes, locale)}′</span>
        </ContentCard>
        <div className="preview-metrics">
          <span><strong>{formatNumber(demoPlan.progress.readiness, locale)}%</strong><small>{t('app.readiness')}</small></span>
          <span><strong>{formatNumber(demoPlan.progress.weeklyAdherence, locale)}%</strong><small>{t('app.adherence')}</small></span>
          <span><strong>{formatNumber(demoPlan.progress.currentWeight, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><small>{locale === 'fa' ? 'کیلوگرم' : 'kg'}</small></span>
        </div>
        <ContentCard className="preview-monthly-plan-card">
          <span><CalendarRange size={20} /></span>
          <p>
            <strong>{locale === 'fa' ? 'برنامه ماه جاری' : 'Current monthly plan'}</strong>
            {localize(demoPlan.monthlyPlanBrief, locale)}
          </p>
        </ContentCard>
      </div>
      <GlassChrome aria-hidden="true" className="product-preview__nav">
        <span className="is-active"><House size={18} /></span>
        <span><Salad size={18} /></span>
        <span><LineChart size={18} /></span>
        <span><CircleUserRound size={18} /></span>
      </GlassChrome>
    </div>
  )
}
