import {
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  LineChart,
  Repeat,
  ShieldCheck,
  ShoppingBasket,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { formatNumber } from '../../lib/format'
import { localizedPath } from '../../router/route-utils'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { GlassChrome } from '../../ui/primitives'
import { OrbitMark } from '../../ui/OrbitMark'
import { Reveal } from '../../ui/Reveal'
import './landing.css'

const copy = {
  fa: {
    badge: 'غذا و تمرین · برنامه ۳۰ روزه',
    title: 'یک ماه غذا و تمرین،',
    accent: 'چیده‌شده برای خودت.',
    subtitle: 'هدف‌ات، غذاهایی که دوست داری و روزهایی که وقت تمرین داری را بگو. Momentum یک برنامه سی‌روزه با همه وعده‌ها و تمرین‌ها می‌سازد، و ماه بعد را از همین ماه ادامه می‌دهد.',
    start: 'برنامه‌ام را بساز',
    sample: 'دیدن نمونه',
    trust: ['غذا و تمرین در یک برنامه', 'فارسی و انگلیسی', 'داده سلامت برای تبلیغ فروخته نمی‌شود'],
    preview: {
      label: 'نمونه صفحه امروز در Momentum',
      day: 'روز ۱۲ از ۳۰',
      greeting: 'صبح بخیر، آوا',
      target: 'هدف امروز',
      kcal: 'کالری',
      protein: 'پروتئین',
      nextMeal: 'وعده بعدی · ناهار',
      meal: 'مرغ زعفرانی، برنج و سالاد شیرازی',
      mealMeta: '۶۲۰ کالری · ۴۸ گرم پروتئین',
      training: 'تمرین امروز',
      workout: 'قدرتی پایین‌تنه',
      workoutMeta: '۶ حرکت · ۴۸ دقیقه',
      startWorkout: 'شروع تمرین',
      streak: 'هفته ۳ · ۸۴٪ پایبندی',
    },
    howEyebrow: 'چطور کار می‌کند',
    howTitle: 'سه قدم تا یک ماه منظم',
    steps: [
      {
        title: 'از زندگی‌ات بگو',
        body: 'هدف، غذاهای مورد علاقه، چیزهایی که نمی‌خوری و روزهایی که برای تمرین وقت داری.',
        image: '/landing/meal.webp',
        alt: 'بشقاب مرغ زعفرانی با برنج و سالاد شیرازی',
      },
      {
        title: 'برنامه سی‌روزه‌ات را بگیر',
        body: 'همه وعده‌ها، همه تمرین‌ها و فهرست خرید، برای کل ماه و در یک جا.',
        image: '/landing/training.jpg',
        alt: 'تمرین قدرتی با دمبل، در نور پنجره خانه',
      },
      {
        title: 'هر روز دنبالش کن',
        body: 'امروز را باز کن و وعده و تمرین بعدی را ببین. یک روز جا ماند؟ بقیه ماه سر جایش است.',
        image: '/landing/continue.jpg',
        alt: 'ادامه راه در نور صبح',
      },
    ],
    featuresEyebrow: 'داخل برنامه',
    featuresTitle: 'هر چیزی که برای این ماه لازم داری',
    features: [
      ['امروز', 'وعده بعدی و تمرین همان روز، بدون اینکه هر روز از نو تصمیم بگیری.'],
      ['تقویم ماه', 'روزهای تمرین و استراحت، برنامه غذایی و تمرینی، همه در یک تقویم.'],
      ['ثبت تمرین', 'ست، وزنه، تکرار، شدت و استراحت را همان موقع تمرین ثبت کن.'],
      ['فهرست خرید', 'مواد لازم برای وعده‌های ماه، آماده برای خرید.'],
      ['روند پیشرفت', 'وزن، پایبندی، ریکاوری و گزارش هفتگی، هفته به هفته.'],
      ['ماه بعد', 'وقتی دوره تمام شد، برنامه بعدی از همین ماه ساخته می‌شود؛ نه از صفر.'],
    ],
    faqEyebrow: 'پرسش‌های رایج',
    faqTitle: 'پیش از شروع بدان',
    faq: [
      ['هزینه‌اش چقدر است؟', 'آوردن برنامه‌ای که جای دیگری ساخته‌ای و پیگیری روزانه‌اش رایگان است. عضویت Momentum برنامه هر ماه را برایت می‌سازد و جایگزینی وعده، فهرست خرید و روند پیشرفت را اضافه می‌کند. پرداخت در نسخه آلفای فعلی فعال نیست.'],
      ['دوره سی‌روزه از کی شروع می‌شود؟', 'از روزی که برنامه‌ات آماده شد، نه از اول ماه تقویمی. دوره دقیقاً سی روز ادامه دارد.'],
      ['اگر یک وعده یا تمرین را جا بیندازم چه می‌شود؟', 'چیزی خط نمی‌خورد. بقیه ماه سر جایش می‌ماند و آنچه واقعاً اتفاق افتاد در برنامه ماه بعد لحاظ می‌شود.'],
      ['می‌توانم زبان را عوض کنم؟', 'بله. Momentum فارسی و انگلیسی است و هر وقت بخواهی از بالای صفحه زبان را عوض می‌کنی. کشور تو دسترسی را محدود نمی‌کند.'],
      ['با اطلاعات سلامتم چه می‌شود؟', 'در حساب خودت می‌ماند و برای تبلیغ فروخته نمی‌شود. فقط حداقل اطلاعات لازم برای برنامه‌ریزی، آن هم وقتی ساخت برنامه را شروع می‌کنی، فرستاده می‌شود.'],
    ],
    pricingLink: 'دیدن قیمت‌ها',
    safety: 'Momentum پزشک یا متخصص تغذیه نیست و جای اورژانس را نمی‌گیرد. این برنامه برای سلامت عمومی بزرگسالان است.',
    safetyLink: 'مرز ایمنی',
    finalTitle: 'این ماه را با یک برنامه شروع کن.',
    finalBody: 'چند سؤال درباره خودت، و برنامه غذا و تمرین سی‌روزه‌ات آماده می‌شود.',
    top: 'بازگشت به بالا',
  },
  en: {
    badge: 'Food + training · 30-day plan',
    title: 'A month of meals and workouts,',
    accent: 'planned around you.',
    subtitle: 'Tell Momentum your goal, the food you like, and the days you can train. You get a thirty-day plan with every meal and every session, and next month picks up from this one.',
    start: 'Build my plan',
    sample: 'See a sample',
    trust: ['Meals and workouts in one plan', 'Persian and English', 'Health data never sold for ads'],
    preview: {
      label: 'Sample of the Momentum Today screen',
      day: 'Day 12 of 30',
      greeting: 'Good morning, Ava',
      target: 'Today’s target',
      kcal: 'kcal',
      protein: 'protein',
      nextMeal: 'Next meal · Lunch',
      meal: 'Saffron chicken, rice & Shirazi salad',
      mealMeta: '620 kcal · 48 g protein',
      training: 'Today’s training',
      workout: 'Lower-body strength',
      workoutMeta: '6 exercises · 48 min',
      startWorkout: 'Start workout',
      streak: 'Week 3 · 84% consistency',
    },
    howEyebrow: 'How it works',
    howTitle: 'Three steps to a steady month',
    steps: [
      {
        title: 'Tell us about your life',
        body: 'Your goal, the food you like, what you can’t eat, and the days you have time to train.',
        image: '/landing/meal.webp',
        alt: 'Saffron chicken with rice and Shirazi salad',
      },
      {
        title: 'Get your thirty-day plan',
        body: 'Every meal, every workout, and the shopping list for the whole month, in one place.',
        image: '/landing/training.jpg',
        alt: 'A strength session with a dumbbell, in window light at home',
      },
      {
        title: 'Follow it day by day',
        body: 'Open Today for the next meal and session. Missed a day? The rest of the month is still there.',
        image: '/landing/continue.jpg',
        alt: 'Walking on into the morning light',
      },
    ],
    featuresEyebrow: 'Inside the plan',
    featuresTitle: 'Everything this month needs',
    features: [
      ['Today', 'The next meal and that day’s session, so you don’t redecide the day.'],
      ['Month calendar', 'Training and rest days, nutrition and workouts, on one calendar.'],
      ['Workout logging', 'Log sets, weight, reps, effort, and rest while you train.'],
      ['Shopping list', 'What the month’s meals need, ready to shop.'],
      ['Progress', 'Weight, consistency, recovery, and a weekly report, week by week.'],
      ['Next month', 'When the period ends, the next plan builds on this one, not a blank page.'],
    ],
    faqEyebrow: 'FAQ',
    faqTitle: 'Know before you start',
    faq: [
      ['What does it cost?', 'Bringing a plan you made elsewhere and following it day by day is free. Momentum membership builds your plan every month and adds meal swaps, the shopping list, and progress trends. Payments are not live in the current alpha.'],
      ['When does the thirty-day period start?', 'On the day your plan is ready, not on the first of the calendar month. It lasts exactly thirty days.'],
      ['What if I miss a meal or a workout?', 'Nothing gets crossed out. The rest of the month stays in place, and what actually happened shapes next month’s plan.'],
      ['Can I switch language?', 'Yes. Momentum works in Persian and English, and you can switch at any time from the top of the page. Your country never blocks access.'],
      ['What happens to my health details?', 'They stay in your account and are never sold for ads. Only the minimum planning details are sent, and only when you start building a plan.'],
    ],
    pricingLink: 'See pricing',
    safety: 'Momentum is not a doctor or a dietitian, and it is not an emergency service. The plan is for adult general wellness.',
    safetyLink: 'Safety boundary',
    finalTitle: 'Start this month with a plan.',
    finalBody: 'A few questions about you, and your thirty-day food and training plan is ready.',
    top: 'Back to top',
  },
} as const

const featureIcons: readonly LucideIcon[] = [Sun, CalendarDays, Dumbbell, ShoppingBasket, LineChart, Repeat]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function TodayPreview({ locale }: { locale: AppLocale }) {
  const text = copy[locale].preview
  const number = (value: number) => formatNumber(value, locale)
  return (
    <div aria-label={text.label} className="land-device" role="img">
      <GlassChrome className="land-device__chip land-device__chip--day">
        <CalendarDays aria-hidden="true" size={15} />
        <span>{text.day}</span>
      </GlassChrome>
      <div aria-hidden="true" className="land-device__screen">
        <div className="land-device__top">
          <OrbitMark size={26} />
          <span className="land-device__avatar">{locale === 'fa' ? 'آ' : 'A'}</span>
        </div>
        <p className="land-device__greeting">{text.greeting}</p>
        <div className="land-device__card land-device__targets">
          <div>
            <small>{text.target}</small>
            <strong>{number(2180)} <span>{text.kcal}</span></strong>
          </div>
          <div>
            <small>{text.protein}</small>
            <strong>{number(148)}{locale === 'fa' ? ' گرم' : 'g'}</strong>
          </div>
          <div className="land-device__bar"><i /></div>
        </div>
        <div className="land-device__card">
          <small>{text.nextMeal}</small>
          <div className="land-device__row">
            <img alt="" decoding="async" src="/landing/meal.webp" />
            <div>
              <strong>{text.meal}</strong>
              <span>{text.mealMeta}</span>
            </div>
          </div>
        </div>
        <div className="land-device__card land-device__card--train">
          <small>{text.training}</small>
          <div className="land-device__row">
            <span className="land-device__icon"><Dumbbell size={18} /></span>
            <div>
              <strong>{text.workout}</strong>
              <span>{text.workoutMeta}</span>
            </div>
          </div>
          <span className="land-device__cta">{text.startWorkout}</span>
        </div>
      </div>
      <GlassChrome className="land-device__chip land-device__chip--streak">
        <Check aria-hidden="true" size={15} />
        <span>{text.streak}</span>
      </GlassChrome>
    </div>
  )
}

export function LandingPage({ locale }: { locale: AppLocale }) {
  const text = copy[locale]
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => setShowTop(window.scrollY > 640)
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const stepNumber = (index: number) => formatNumber(index + 1, locale)

  return (
    <div className="public-page land">
      <PublicHeader locale={locale} />
      <main>
        <section className="land-hero">
          <div aria-hidden="true" className="land-hero__glow" />
          <div className="land-hero__copy">
            <p className="land-badge">{text.badge}</p>
            <h1>{text.title} <em>{text.accent}</em></h1>
            <p className="land-lead">{text.subtitle}</p>
            <div className="land-actions">
              <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
                <span>{text.start}</span>
                <ArrowRight aria-hidden="true" className="directional-icon" size={18} />
              </Link>
              <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>
                <span>{text.sample}</span>
              </Link>
            </div>
            <ul className="land-trust">
              {text.trust.map((item) => (
                <li key={item}><Check aria-hidden="true" size={15} />{item}</li>
              ))}
            </ul>
          </div>
          <TodayPreview locale={locale} />
        </section>

        <section aria-labelledby="land-how" className="land-section">
          <header className="land-section__head">
            <p className="land-eyebrow">{text.howEyebrow}</p>
            <h2 id="land-how">{text.howTitle}</h2>
          </header>
          <ol className="land-steps">
            {text.steps.map((step, index) => (
              <Reveal as="li" className="land-step" delay={index * 80} key={step.image}>
                <figure className="land-step__photo">
                  <img alt={step.alt} decoding="async" loading="lazy" src={step.image} />
                  <span className="land-step__num">{stepNumber(index)}</span>
                </figure>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section aria-labelledby="land-features" className="land-section">
          <header className="land-section__head">
            <p className="land-eyebrow">{text.featuresEyebrow}</p>
            <h2 id="land-features">{text.featuresTitle}</h2>
          </header>
          <ul className="land-features">
            {text.features.map(([title, body], index) => {
              const Icon = featureIcons[index] ?? Check
              return (
                <Reveal as="li" className="land-feature" delay={(index % 3) * 70} key={title}>
                  <span aria-hidden="true" className={`land-feature__icon land-feature__icon--${index % 3}`}>
                    <Icon size={20} />
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </Reveal>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="land-faq" className="land-section land-faq">
          <header className="land-section__head">
            <p className="land-eyebrow">{text.faqEyebrow}</p>
            <h2 id="land-faq">{text.faqTitle}</h2>
          </header>
          <div className="land-faq__list">
            {text.faq.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  <span>{question}</span>
                  <ChevronDown aria-hidden="true" size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          <p className="land-faq__more">
            <Link href={localizedPath(locale, '/pricing')}>{text.pricingLink} <ArrowRight aria-hidden="true" className="directional-icon" size={16} /></Link>
          </p>
        </section>

        <section className="land-close">
          <GlassChrome className="land-close__panel">
            <OrbitMark size={54} />
            <h2>{text.finalTitle}</h2>
            <p>{text.finalBody}</p>
            <div className="land-actions">
              <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
                <span>{text.start}</span>
                <ArrowRight aria-hidden="true" className="directional-icon" size={18} />
              </Link>
              <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today?preview=1')}>
                <span>{text.sample}</span>
              </Link>
            </div>
          </GlassChrome>
          <p className="land-safety">
            <ShieldCheck aria-hidden="true" size={17} />
            {text.safety}
            <Link href={localizedPath(locale, '/safety')}>{text.safetyLink}</Link>
          </p>
        </section>
      </main>
      <PublicFooter locale={locale} />
      <button
        aria-label={text.top}
        className={`land-top glass-chrome${showTop ? ' is-visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
        type="button"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  )
}
