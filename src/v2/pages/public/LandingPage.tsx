import { ArrowRight, ArrowUp, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { formatNumber } from '../../lib/format'
import { localizedPath } from '../../router/route-utils'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { GlassChrome } from '../../ui/primitives'
import { OrbitMark } from '../../ui/OrbitMark'
import './landing.css'

const copy = {
  fa: {
    eyebrow: 'Momentum',
    title: 'Momentum از همین ماه شروع می‌شود.',
    accent: 'ماه بعد، ادامه همان حرکت است.',
    subtitle: 'غذا و تمرین با هم می‌آیند، برای یک دوره سی‌روزه. هر روز می‌دانی وعده بعدی چیست و تمرین همان روز چطور چیده شده. وقتی دوره تمام شد، برنامه تازه از بازخورد همین ماه ساخته می‌شود؛ از یک صفحه سفید نه.',
    start: 'شروع این ماه',
    sample: 'دیدن نمونه',
    story: 'ماه در سه بخش',
    beats: [
      {
        title: 'ماه را با زندگی خودت می‌چینیم',
        body: 'اول هدف‌ات را می‌گویی، غذاهایی که دوست داری، چیزهایی که نباید بخوری، و روزهایی که برای تمرین وقت داری. Momentum از همین‌ها یک برنامه سی‌روزه درمی‌آورد: وعده‌ها، تمرین‌ها و خرید، در یک جا. لازم نیست رژیم را از یک برنامه بگیری و ورزش را از یک برنامه دیگر.',
        image: '/landing/meal.webp',
        alt: 'بشقاب مرغ زعفرانی با برنج و سالاد شیرازی',
      },
      {
        title: 'وسط ماه، هر روز از نو تصمیم نمی‌گیری',
        body: 'امروز را که باز می‌کنی، وعده بعدی مشخص است و تمرین همان روز نوشته شده. اگر یک وعده یا یک جلسه را جا بیندازی، بقیه ماه خط نمی‌خورد. Momentum یعنی حرکت بماند: روز بعدی هنوز سر جایش است، حتی وقتی دیروز دقیقاً مطابق طرح پیش نرفت.',
        image: '/landing/training.jpg',
        alt: 'تمرین قدرتی با دمبل، در نور پنجره خانه',
      },
      {
        title: 'آخر دوره، از صفر شروع نمی‌کنی',
        body: 'هر دوره سی روز است و از روز آماده‌شدن برنامه حساب می‌شود، نه از اول ماه. وقتی تمام شد، برنامه بعدی فرم خالی نیست. از همان چیزی ساخته می‌شود که این ماه انجام دادی، عوض کردی، یا هنوز برایت محدودیت است.',
        image: '/landing/continue.jpg',
        alt: 'ادامه راه در نور صبح',
      },
    ],
    notes: [
      ['غذا و تمرین، یک برنامه', 'روزت بین یک برنامه غذایی و یک برنامه ورزشی نصف نمی‌شود. هر دو در همان ماه و با همان هدف چیده می‌شوند.'],
      ['سی روز، از روز آماده‌شدن', 'دوره منتظر اول ماه تقویمی نمی‌ماند. از وقتی برنامه حاضر شد شروع می‌شود و تا پایان همان نسخه می‌ماند.'],
      ['جزئیات سلامت، مال حساب تو', 'برای تبلیغ فروخته نمی‌شود. نمونه داخل برنامه داده نمایشی است و سابقه سلامت تو را ذخیره نمی‌کند.'],
    ],
    safety: 'Momentum پزشک یا متخصص تغذیه نیست و جای اورژانس را هم نمی‌گیرد. این برنامه برای سلامت عمومی بزرگسالان است. اگر حال‌ات خوب نیست، به درمانگر یا اورژانس محل زندگی‌ات مراجعه کن.',
    safetyLink: 'مرز ایمنی',
    finalTitle: 'این ماه را شروع کن.',
    finalBody: 'Momentum غذا و تمرین را کنار هم می‌گذارد و ماه بعد را از همین دوره می‌سازد.',
    top: 'بازگشت به بالا',
  },
  en: {
    eyebrow: 'Momentum',
    title: 'Momentum starts with this month.',
    accent: 'Next month continues that same motion.',
    subtitle: 'Food and training arrive together, for a thirty-day period. Each day you already know the next meal and how that day’s session is built. When the period ends, the new plan comes from how this month actually went, not from a blank page.',
    start: 'Start this month',
    sample: 'See a sample',
    story: 'The month, in three parts',
    beats: [
      {
        title: 'The month is built around your life',
        body: 'You say what you’re aiming for, the food you like, what you can’t eat, and the days you can train. Momentum turns that into one thirty-day plan: meals, workouts, and the shopping list, in the same place. You don’t collect a diet from one app and a workout from another.',
        image: '/landing/meal.webp',
        alt: 'Saffron chicken with rice and Shirazi salad',
      },
      {
        title: 'Mid-month, you don’t redecide the day',
        body: 'Open today and the next meal is already there, with that day’s session written out. Miss a meal or a workout and the rest of the month doesn’t get crossed out. Momentum means the motion stays: tomorrow is still there, even when yesterday didn’t go to plan.',
        image: '/landing/training.jpg',
        alt: 'A strength session with a dumbbell, in window light at home',
      },
      {
        title: 'At the end, you don’t start from zero',
        body: 'Each period is thirty days, counted from the day the plan is ready, not from the first of the calendar month. When it ends, the next plan isn’t an empty form. It’s built from what you did this month, what you changed, and the limits that are still yours.',
        image: '/landing/continue.jpg',
        alt: 'Walking on into the morning light',
      },
    ],
    notes: [
      ['Food and training, one plan', 'The day isn’t split between a diet app and a workout app. Both are laid out in the same month, for the same goal.'],
      ['Thirty days, from the day it’s ready', 'The period doesn’t wait for the first of the calendar month. It starts when the plan is ready and stays that version until it ends.'],
      ['Your health details stay yours', 'They aren’t sold for ads. The in-app sample is demonstration data and doesn’t store your health history.'],
    ],
    safety: 'Momentum is not a doctor or a dietitian, and it is not an emergency service. The plan is for adult general wellness. If you feel unwell, contact a clinician or local emergency services.',
    safetyLink: 'Safety boundary',
    finalTitle: 'Start this month.',
    finalBody: 'Momentum puts food and training side by side, and builds next month from this period.',
    top: 'Back to top',
  },
} as const

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function LandingPage({ locale }: { locale: AppLocale }) {
  const text = copy[locale]
  const railRef = useRef<HTMLSpanElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const [beat, setBeat] = useState(0)
  const [meterOn, setMeterOn] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (railRef.current) railRef.current.style.transform = `scaleY(${progress})`
      setShowTop((current) => {
        const next = window.scrollY > 520
        return current === next ? current : next
      })
      const section = storyRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const on = rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.28
      setMeterOn((current) => current === on ? current : on)
      let nextBeat = 0
      section.querySelectorAll<HTMLElement>('.land-frame').forEach((panel, index) => {
        if (panel.getBoundingClientRect().top < window.innerHeight * 0.55) nextBeat = index
      })
      setBeat((current) => current === nextBeat ? current : nextBeat)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="public-page land">
      <PublicHeader locale={locale} />
      <div aria-hidden="true" className="land-rail"><span ref={railRef} /></div>
      <div aria-hidden="true" className={`land-meter${meterOn ? ' is-on' : ''}`}>
        <i style={{ transform: `scaleY(${beat / Math.max(text.beats.length - 1, 1)})` }} />
        <ol>
          {text.beats.map((item, index) => (
            <li className={index === beat ? 'is-active' : index < beat ? 'is-done' : ''} key={item.image}>
              {formatNumber(index + 1, locale, { minimumIntegerDigits: 2, useGrouping: false })}
            </li>
          ))}
        </ol>
      </div>
      <main>
        <section className="land-hero">
          <div aria-hidden="true" className="land-orb land-orb--a" />
          <div aria-hidden="true" className="land-orb land-orb--b" />
          <div aria-hidden="true" className="land-orb land-orb--c" />
          <GlassChrome className="land-mark">
            <OrbitMark animated size={86} />
          </GlassChrome>
          <p className="land-kicker">{text.eyebrow}</p>
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
        </section>

        <section aria-label={text.story} className="land-reel" ref={storyRef}>
          {text.beats.map((item, index) => (
            <article className={`land-frame land-frame--${index}`} key={item.image}>
              <div className="land-frame__copy">
                <p className="land-frame__index">{formatNumber(index + 1, locale, { minimumIntegerDigits: 2, useGrouping: false })}</p>
                <h2>{item.title}</h2>
                <p className="land-frame__body">{item.body}</p>
              </div>
              <figure className="land-frame__photo">
                <img alt={item.alt} decoding="async" loading={index === 0 ? 'eager' : 'lazy'} src={item.image} />
              </figure>
            </article>
          ))}
        </section>

        <section className="land-notes">
          {text.notes.map(([title, line], index) => (
            <GlassChrome className="land-note" key={title} style={{ animationDelay: `${index * 90}ms` }}>
              <h2>{title}</h2>
              <p>{line}</p>
            </GlassChrome>
          ))}
        </section>

        <GlassChrome className="land-safety">
          <ShieldCheck size={18} />
          <p>{text.safety}</p>
          <Link href={localizedPath(locale, '/safety')}>{text.safetyLink} <ArrowRight className="directional-icon" size={16} /></Link>
        </GlassChrome>

        <section className="land-close">
          <GlassChrome className="land-close__panel">
            <OrbitMark size={54} />
            <h2>{text.finalTitle}</h2>
            <p>{text.finalBody}</p>
            <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-up')}>
              <span>{text.start}</span>
              <ArrowRight aria-hidden="true" className="directional-icon" size={18} />
            </Link>
          </GlassChrome>
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
