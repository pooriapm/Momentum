import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Check,
  CircleUserRound,
  Dumbbell,
  HeartPulse,
  House,
  LineChart,
  Salad,
  ScanLine,
  ShieldCheck,
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
import './landing-faq.css'

export function LandingPage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const features = [
    [Salad, t('landing.featurePlan'), t('landing.featurePlanCopy')],
    [CalendarRange, locale === 'fa' ? 'دو راه برای شروع' : 'Two ways to start', locale === 'fa' ? 'برنامه را رایگان از ابزار دلخواهت وارد کن، یا ساخت و به‌روزرسانی هر دوره را به Momentum بسپار.' : 'Import a plan from a tool you choose for free, or let Momentum create and update every cycle.'],
    [BarChart3, t('landing.featureProgress'), t('landing.featureProgressCopy')],
    [ScanLine, t('landing.featureBody'), t('landing.featureBodyCopy')],
  ] as const

  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main className="screen-enter">
        <section className="landing-hero">
          <div className="landing-aura landing-aura--one" />
          <div className="landing-aura landing-aura--two" />
          <div className="landing-hero__copy">
            <Eyebrow>{t('landing.eyebrow')}</Eyebrow>
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
            <Eyebrow>{locale === 'fa' ? 'حلقه ماهانه' : 'Monthly loop'}</Eyebrow>
            <h2>{t('landing.systemTitle')}</h2>
            <p>{t('landing.systemCopy')}</p>
          </div>
          <div className="feature-grid">
            {features.map(([Icon, title, copy], index) => (
              <ContentCard className={`feature-card content-card--flush`} key={title}>
                <span className={`feature-card__icon feature-card__icon--${index + 1}`}><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </ContentCard>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="landing-section process-section">
          <div className="landing-section__heading">
            <Eyebrow>{locale === 'fa' ? 'از زمینه تا اقدام' : 'From context to action'}</Eyebrow>
            <h2>{t('landing.stepsTitle')}</h2>
          </div>
          <ol className="process-grid">
            {[t('landing.stepOne'), t('landing.stepTwo'), t('landing.stepThree')].map((step, index) => (
              <li key={step}>
                <span>{formatNumber(index + 1, locale, { minimumIntegerDigits: 2 })}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal as="section" className="landing-section safety-banner">
          <div className="safety-banner__mark"><HeartPulse size={26} /></div>
          <div>
            <Eyebrow>{locale === 'fa' ? 'اول ایمنی' : 'Safety first'}</Eyebrow>
            <h2>{t('landing.safetyTitle')}</h2>
            <p>{t('landing.safetyCopy')}</p>
          </div>
          <Link href={localizedPath(locale, '/safety')}>{t('common.learnMore')} <ArrowRight className="directional-icon" size={17} /></Link>
        </Reveal>

        <Reveal as="section" className="landing-section landing-faq">
          <div className="landing-section__heading">
            <Eyebrow>{locale === 'fa' ? 'پرسش‌های رایج' : 'FAQ'}</Eyebrow>
            <h2>{locale === 'fa' ? 'پیش از شروع بدان' : 'Know before you start'}</h2>
          </div>
          <div className="landing-faq__list">
            {(locale === 'fa' ? [
              ['مسیر رایگان و عضویت چه فرقی دارند؟', 'واردکردن، نگهداری و پیگیری برنامه‌ای که خودت تهیه کرده‌ای رایگان است. عضویت، ساخت و مدیریت برنامه توسط Momentum را پوشش می‌دهد.'],
              ['برنامه هر چند وقت یک‌بار ساخته می‌شود؟', 'هر دوره پس از آماده‌شدن و واردکردن موفق برنامه شروع می‌شود، دقیقاً ۳۰ روز ادامه دارد و حداکثر یک ساخت کامل برنامه تمرین و تغذیه دارد.'],
              ['آیا برنامه اول حتماً هدیه است؟', 'هدیه فقط در صورت موجودبودن بودجه و رزرو موفق ارائه می‌شود. پرداخت در نسخه آلفای فعلی فعال نیست.'],
              ['با اطلاعات سلامت و گزارش بدن چه می‌شود؟', 'فقط وقتی ساخت مدیریت‌شده را شروع می‌کنی، اطلاعات حداقلی لازم برای برنامه‌ریزی به ارائه‌دهنده فرستاده می‌شود. گزارش بدن اختیاری است و فایل آن خودکار تحلیل نمی‌شود. در مسیر رایگان، پرامپت فقط پس از تأیید تو به ابزار بیرونی منتقل می‌شود.'],
            ] : [
              ['How do the free path and membership differ?', 'Importing, storing, and tracking a plan you obtain yourself is free. Membership covers plan creation and cycle management by Momentum.'],
              ['How often is a plan created?', 'Each period begins after a plan is ready and successfully imported, lasts exactly 30 days, and allows at most one complete workout and nutrition plan creation.'],
              ['Is the first plan always gifted?', 'A gift is offered only when campaign budget is available and reservation succeeds. Payments are not live in the current alpha.'],
              ['How are health data and body reports handled?', 'Minimized planning context is sent to a provider only when you start managed generation. A body report is optional, and its file is not analyzed automatically. On the free path, the prompt is transferred to an external tool only after you confirm.'],
            ]).map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="landing-final">
          <OrbitMark animated size={72} />
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
    <div role="region" aria-label={locale === 'fa' ? 'پیش‌نمایش محصول Momentum' : 'Momentum product preview'} className="product-preview">
      <GlassChrome className="product-preview__chrome">
        <span><OrbitMark size={30} /></span>
        <span className="product-preview__date">{locale === 'fa' ? 'پیش‌نمایش · امروز' : 'Sample day · Today'}</span>
        <span className="product-preview__avatar">{locale === 'fa' ? 'آ' : 'A'}</span>
      </GlassChrome>
      <div className="product-preview__body">
        <StatusPill tone="energy">{t('landing.nextAction')}</StatusPill>
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
