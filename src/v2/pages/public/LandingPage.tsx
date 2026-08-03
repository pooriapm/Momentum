import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Salad,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { ContentCard, Eyebrow, GlassChrome, StatusPill } from '../../ui/primitives'
import { OrbitMark } from '../../ui/OrbitMark'

export function LandingPage({ locale }: { locale: AppLocale }) {
  const { t } = useTranslation()
  const features = [
    [Salad, t('landing.featurePlan'), t('landing.featurePlanCopy')],
    [BrainCircuit, t('landing.featureCoach'), t('landing.featureCoachCopy')],
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
          <ProductPreview />
        </section>

        <section className="landing-section landing-system">
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
        </section>

        <section className="landing-section process-section">
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
        </section>

        <section className="landing-section safety-banner">
          <div className="safety-banner__mark"><HeartPulse size={29} /></div>
          <div>
            <Eyebrow>Safety architecture</Eyebrow>
            <h2>{t('landing.safetyTitle')}</h2>
            <p>{t('landing.safetyCopy')}</p>
          </div>
          <Link href={localizedPath(locale, '/safety')}>{t('common.learnMore')} <ChevronRight className="directional-icon" size={17} /></Link>
        </section>

        <section className="landing-final">
          <OrbitMark animated size={78} />
          <h2>{t('landing.finalTitle')}</h2>
          <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
            <span>{t('landing.primaryCta')}</span><ArrowRight className="directional-icon" size={18} />
          </Link>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

function ProductPreview() {
  const { t } = useTranslation()
  return (
    <div aria-label="Momentum product preview" className="product-preview">
      <GlassChrome className="product-preview__chrome">
        <span><OrbitMark size={30} /></span>
        <span className="product-preview__date">Today · 08:42</span>
        <span className="product-preview__avatar">A</span>
      </GlassChrome>
      <div className="product-preview__body">
        <StatusPill tone="brand"><Sparkles size={13} />{t('landing.nextAction')}</StatusPill>
        <h2>{t('landing.todayTitle')}</h2>
        <p>{t('landing.todayCopy')}</p>
        <ContentCard className="preview-meal-card">
          <span className="preview-meal-card__media"><Salad size={28} /></span>
          <span className="preview-meal-card__copy">
            <small>{t('landing.lunch')}</small>
            <strong>{t('landing.lunchName')}</strong>
            <em>{t('landing.protein')}</em>
          </span>
          <span className="preview-meal-card__check"><Check size={17} /></span>
        </ContentCard>
        <div className="preview-metrics">
          <span><strong>82%</strong><small>{t('app.readiness')}</small></span>
          <span><strong>4/5</strong><small>{t('app.adherence')}</small></span>
          <span><strong>45′</strong><small>{t('app.training')}</small></span>
        </div>
        <GlassChrome className="preview-coach-card">
          <span><BrainCircuit size={20} /></span>
          <p><strong>{t('landing.coachInsight')}</strong>{t('landing.coachCopy')}</p>
        </GlassChrome>
      </div>
      <GlassChrome className="product-preview__nav">
        <span className="is-active"><Activity size={19} /></span>
        <span><Salad size={19} /></span>
        <span><BrainCircuit size={19} /></span>
        <span><BarChart3 size={19} /></span>
        <span><Dumbbell size={19} /></span>
      </GlassChrome>
    </div>
  )
}
