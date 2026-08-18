import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { Check, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { LocalizedStory } from '../../../../.storybook/LocalizedStory'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { ContentCard, StatusPill } from '../../ui/primitives'
import { LandingPage } from './LandingPage'
import { LegalPage } from './LegalPage'
import { SafetyPage } from './SafetyPage'
import './public-pages.stories.css'

function localeFromGlobal(value: unknown): AppLocale {
  return value === 'en' ? 'en' : 'fa'
}

function Screen({ children, locale }: { children: ReactNode; locale: AppLocale }) {
  return (
    <div className="mo-screen-story">
      <LocalizedStory locale={locale}>{children}</LocalizedStory>
    </div>
  )
}

function CanonicalPricing({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const membershipFeatures = fa
    ? ['یک برنامه ترکیبی تمرین و تغذیه در هر دوره', 'شروع دوره از زمان آماده‌شدن برنامه', 'ورود خودکار پس از اعتبارسنجی', 'استفاده از نتیجه دوره قبل برای برنامه بعد']
    : ['One combined workout and nutrition plan per period', 'Period starts when the plan is ready', 'Automatic import after validation', 'Prior-period outcomes inform the next plan']
  const giftFeatures = fa
    ? ['برنامه اول را بدون هزینه شروع می‌کنی', 'روش پرداخت ثبت می‌شود؛ کارت تا دوره بعد شارژ نمی‌شود']
    : ['Start the first plan at no charge', 'A payment method is saved; the card is not charged until the next period']

  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main className="simple-public-page pricing-page">
        <div className="simple-public-page__heading">
          <span className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'یک اشتراک، یک مسیر روشن' : 'One subscription, one clear path'}</span>
          <h1>{fa ? 'برنامه ماهانه Momentum' : 'Momentum monthly plan'}</h1>
          <p>{fa ? 'در هر دوره یک برنامه کامل تمرین و تغذیه دریافت می‌کنی و نتیجه پس از بررسی خودکار وارد حسابت می‌شود.' : 'Each period includes one complete workout and nutrition plan, automatically imported after validation.'}</p>
        </div>
        <div className="pricing-grid pricing-grid--canonical">
          <ContentCard className="pricing-card pricing-card--featured">
            <header className="pricing-card__header">
              <StatusPill tone="brand">{fa ? 'اشتراک Momentum' : 'Momentum membership'}</StatusPill>
              <span className="pricing-card__icon-wrap"><ShieldCheck size={22} /></span>
              <h2>{fa ? 'ماهانه' : 'Monthly'}</h2>
              <p>{fa ? 'یک برنامه کامل برای کل دوره' : 'One complete plan for the full period'}</p>
            </header>
            <ul>{membershipFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            <button className="orbit-button orbit-button--primary" type="button">{fa ? 'شروع عضویت' : 'Start membership'}</button>
          </ContentCard>
          <ContentCard className="pricing-card pricing-card--gift">
            <header className="pricing-card__header">
              <StatusPill tone="energy">{fa ? 'شروع بدون هزینه' : 'Start at no charge'}</StatusPill>
              <span className="pricing-card__icon-wrap"><Gift size={22} /></span>
              <h2>{fa ? 'هدیه برنامه اول' : 'First-plan gift'}</h2>
              <p>{fa ? 'اگر در دسترس باشد، برنامه اول را مهمان Momentum شروع می‌کنی.' : 'When available, Momentum covers your first plan.'}</p>
            </header>
            <ul>{giftFeatures.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>
            <button className="orbit-button orbit-button--secondary" type="button">{fa ? 'استفاده از هدیه' : 'Use the gift'}</button>
          </ContentCard>
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}

const meta = {
  title: 'Screens/Public',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production public pages rendered with the shared Light/Dark and FA/EN toolbars. Pricing uses an isolated product fixture and never calls the network.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Landing: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LandingPage locale={locale} /></Screen>
  },
}

export const Safety: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><SafetyPage locale={locale} /></Screen>
  },
}

export const Privacy: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LegalPage kind="privacy" locale={locale} /></Screen>
  },
}

export const Terms: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><LegalPage kind="terms" locale={locale} /></Screen>
  },
}

export const Pricing: Story = {
  render: (_args, context) => {
    const locale = localeFromGlobal(context.globals.locale)
    return <Screen locale={locale}><CanonicalPricing locale={locale} /></Screen>
  },
}
