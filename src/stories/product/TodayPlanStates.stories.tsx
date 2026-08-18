import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Dumbbell,
  Flame,
  LoaderCircle,
  RefreshCw,
  Salad,
  ShoppingBasket,
  Utensils,
  WifiOff,
} from 'lucide-react'
import { momentumEvidence } from './coverage'
import {
  localeFromStory,
  ProductFrame,
  SpecBadge,
  SpecButton,
  SpecCallout,
  SpecCard,
  SpecHeader,
  SpecList,
  SpecMetric,
  SpecProgress,
  SpecTabs,
  tx,
  type SpecLocale,
} from './ProductSpec'

type TodayState = 'preparing' | 'offline' | 'stale' | 'completed' | 'safety' | 'load-error'
type PlanView = 'week' | 'nutrition' | 'training' | 'grocery' | 'calendar'
type TodayCoreState = 'active' | 'rest' | 'no-plan' | 'partial'
type PlanOperationalState = 'version' | 'empty' | 'loading' | 'offline' | 'error' | 'history'

function TodayCore({ locale, state }: { locale: SpecLocale; state: TodayCoreState }) {
  const data = {
    active: { tone: 'brand' as const, eyebrow: tx(locale, 'روز ۱۲ از دوره', 'Day 12 of period'), title: tx(locale, 'امروز یک تمرین قدرتی داری', 'A strength session is next'), body: tx(locale, '۶ حرکت · ۳ دور · حدود ۴۵ دقیقه · خانه', '6 exercises · 3 rounds · about 45 minutes · home'), action: tx(locale, 'شروع تمرین', 'Start workout') },
    rest: { tone: 'energy' as const, eyebrow: tx(locale, 'روز بازیابی', 'Recovery day'), title: tx(locale, 'امروز برای سازگاری و استراحت است', 'Today is for recovery and adaptation'), body: tx(locale, 'یک پیاده‌روی آرام و ۸ دقیقه حرکت نرم پیشنهاد شده؛ انجام‌ندادن آن شکست محسوب نمی‌شود.', 'A gentle walk and 8 minutes of mobility are suggested; skipping them is not treated as failure.'), action: tx(locale, 'دیدن بازیابی پیشنهادی', 'View recovery suggestion') },
    'no-plan': { tone: 'neutral' as const, eyebrow: tx(locale, 'هنوز برنامه‌ای نیست', 'No active plan'), title: tx(locale, 'راه‌اندازی را کامل کن', 'Complete setup to get started'), body: tx(locale, 'اطلاعاتت ذخیره می‌شود و پس از تعیین دسترسی، یک درخواست برنامه کامل ارسال خواهد شد.', 'Your information is saved; after eligibility is confirmed, one complete plan request can be submitted.'), action: tx(locale, 'ادامه راه‌اندازی', 'Continue setup') },
    partial: { tone: 'success' as const, eyebrow: tx(locale, 'روز در جریان', 'Day in progress'), title: tx(locale, 'تمرین کامل شد؛ دو وعده باقی مانده', 'Workout complete; two meals remain'), body: tx(locale, 'قدم بعدی ناهار ساعت ۱۳:۰۰ است. می‌توانی ثبت تمرین را بازبینی یا برگردانی.', 'Lunch at 13:00 is next. You can review or undo the workout log.'), action: tx(locale, 'دیدن وعده بعدی', 'View next meal') },
  }[state]
  return <ProductFrame locale={locale} title={tx(locale, 'امروز', 'Today')}><SpecHeader eyebrow={data.eyebrow} title={data.title} body={data.body} /><div className="mo-spec__grid"><SpecCard className="is-wide" tone={data.tone}><SpecBadge tone={data.tone}>{state === 'partial' ? tx(locale, '۳ از ۵ مورد کامل', '3 of 5 complete') : state === 'rest' ? tx(locale, 'بدون فشار', 'No pressure') : tx(locale, 'قدم بعدی', 'Next action')}</SpecBadge><h2>{state === 'active' ? tx(locale, 'قدرت تمام‌بدن', 'Full-body strength') : state === 'partial' ? tx(locale, 'ناهار: مرغ و برنج قهوه‌ای', 'Lunch: chicken & brown rice') : data.title}</h2><SpecProgress label={tx(locale, 'پیشرفت امروز', 'Today’s progress')} value={state === 'partial' ? 60 : state === 'active' ? 12 : state === 'rest' ? 20 : 0} /><div className="mo-spec__actions"><SpecButton>{data.action}</SpecButton>{state === 'partial' ? <SpecButton kind="secondary">{tx(locale, 'بازبینی ثبت تمرین', 'Review workout log')}</SpecButton> : null}{state === 'active' ? <SpecButton kind="ghost">{tx(locale, 'بررسی روزانه · اختیاری', 'Daily check-in · optional')}</SpecButton> : null}</div></SpecCard><SpecCard><SpecBadge tone="energy">{tx(locale, 'دوره فعال', 'Active period')}</SpecBadge><h2>{tx(locale, 'تا ۲۲ شهریور', 'Through Sep 13')}</h2><p>{tx(locale, 'درخواست این دوره: استفاده شده', 'Period request: used')}</p></SpecCard></div></ProductFrame>
}

function TodayPreparingView({ locale }: { locale: SpecLocale }) {
  const lines = locale === 'fa'
    ? ['در حال خواندن هدف و برنامه تمرینی‌ات…', 'در حال چیدن تمرین‌های یک ماه…', 'در حال چیدن وعده‌های غذایی…', 'در حال بررسی ایمنی غذا و حرکت…', 'تقریباً آماده است…']
    : ['Reading your goal and training setup…', 'Laying out one month of workouts…', 'Laying out the meals for the month…', 'Checking food and movement safety…', 'Almost ready…']
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % lines.length), 2800)
    return () => window.clearInterval(timer)
  }, [lines.length])
  return (
    <ProductFrame locale={locale} title={tx(locale, 'امروز', 'Today')}>
      <div className="mo-spec__generate-wait">
        <span className="mo-spec__state-icon mo-spec__state-icon--brand"><LoaderCircle className="orbit-spin" /></span>
        <p className="mo-spec__eyebrow">{tx(locale, 'یک برنامه برای یک ماه · در حال ساخت', 'One plan for one month · creating')}</p>
        <h1>{tx(locale, 'لطفاً منتظر بمانید. برنامه شخصی‌سازی‌شده شما در حال تولید است.', 'Please wait. Your personalized plan is being created.')}</h1>
        <p className="mo-spec__generate-wait-rotating" aria-live="polite">{lines[index]}</p>
        <SpecProgress label={tx(locale, 'آماده‌سازی برنامه یک‌ماهه', 'Preparing the one-month plan')} value={54} />
        <p>{tx(locale, 'می‌توانی این صفحه را ببندی. اگر بعد از ۳ دقیقه آماده نشد، خطا می‌بینی و می‌توانی دوباره درخواست بدهی.', 'You can leave. If it is not ready after 3 minutes, you will see an error and can request again.')}</p>
      </div>
    </ProductFrame>
  )
}

function TodayStatus({ locale, state }: { locale: SpecLocale; state: Exclude<TodayState, 'preparing'> }) {
  const data = {
    offline: {
      icon: <WifiOff />, tone: 'neutral' as const,
      eyebrow: tx(locale, 'نسخه ذخیره‌شده', 'Saved copy'),
      title: tx(locale, 'برنامه امروز در دسترس است', 'Today’s saved plan is available'),
      body: tx(locale, 'می‌توانی برنامه را ببینی؛ ثبت فعالیت تا برگشت اتصال در همین دستگاه نگه داشته می‌شود.', 'You can view your plan; new activity stays on this device until your connection returns.'),
      note: <SpecCallout icon={<WifiOff />} title={tx(locale, 'آفلاین هستی', 'You’re offline')} tone="neutral">{tx(locale, 'آخرین همگام‌سازی: امروز، ۰۸:۴۲', 'Last synced today at 08:42')}</SpecCallout>,
      action: tx(locale, 'دیدن برنامه ذخیره‌شده', 'View saved plan'),
    },
    stale: {
      icon: <CalendarClock />, tone: 'warning' as const,
      eyebrow: tx(locale, 'داده قدیمی', 'Update needed'),
      title: tx(locale, 'این نسخه ممکن است تازه نباشد', 'This copy may be out of date'),
      body: tx(locale, 'برنامه روی دستگاه مربوط به ۲ روز پیش است. قبل از ثبت تمرین، اتصال را بررسی کن.', 'The on-device plan is two days old. Reconnect before logging a workout.'),
      note: <SpecCallout icon={<AlertTriangle />} title={tx(locale, 'ثبت تمرین موقتاً غیرفعال است', 'Workout logging is temporarily disabled')} tone="warning" />,
      action: tx(locale, 'به‌روزرسانی برنامه', 'Refresh plan'),
    },
    completed: {
      icon: <CheckCircle2 />, tone: 'success' as const,
      eyebrow: tx(locale, 'روز کامل', 'Day complete'),
      title: tx(locale, 'آفرین، برنامه امروز کامل شد', 'You completed today’s plan'),
      body: tx(locale, 'تمرین و وعده‌های برنامه‌ریزی‌شده ثبت شدند. فردا یک روز بازیابی سبک داری.', 'Your workout and planned meals are logged. Tomorrow is a light recovery day.'),
      note: <div className="mo-spec__grid"><SpecMetric detail={tx(locale, 'تمرین قدرتی', 'Strength session')} label={tx(locale, 'فعالیت', 'Activity')} tone="success" value={tx(locale, '۴۸ دقیقه', '48 min')} /><SpecMetric detail={tx(locale, 'از ۴ وعده', 'of 4 meals')} label={tx(locale, 'تغذیه', 'Nutrition')} tone="energy" value={tx(locale, '۴ / ۴', '4 / 4')} /></div>,
      action: tx(locale, 'بازکردن ثبت‌های امروز', 'Open today’s logs'),
    },
    safety: {
      icon: <AlertOctagon />, tone: 'danger' as const,
      eyebrow: tx(locale, 'ایمنی اولویت دارد', 'Safety first'),
      title: tx(locale, 'تمرین امروز متوقف شده', 'Today’s workout is paused'),
      body: tx(locale, 'علامتی که ثبت کردی نیاز به توقف دارد. تمرین را ادامه نده و در صورت شدید یا ناگهانی‌بودن علامت، کمک فوری پزشکی بگیر.', 'The symptom you reported requires stopping. Do not continue; seek urgent medical help if it is severe or sudden.'),
      note: <SpecCallout icon={<AlertOctagon />} title={tx(locale, 'Momentum جایگزین مراقبت پزشکی نیست', 'Momentum does not replace medical care')} tone="danger">{tx(locale, 'اگر در خطر فوری هستی با خدمات اضطراری محل زندگی تماس بگیر.', 'If you may be in immediate danger, contact local emergency services.')}</SpecCallout>,
      action: tx(locale, 'دیدن راهنمای ایمنی', 'View safety guidance'),
    },
    'load-error': {
      icon: <AlertTriangle />, tone: 'danger' as const,
      eyebrow: tx(locale, 'خطای قابل بازیابی', 'Recoverable error'),
      title: tx(locale, 'برنامه امروز دریافت نشد', 'Today’s plan could not be loaded'),
      body: tx(locale, 'نسخه فعال روی دستگاه حذف یا جایگزین نشده است. می‌توانی برنامه ذخیره‌شده را بخوانی و بعداً برای تازه‌سازی دوباره تلاش کنی.', 'The active on-device plan was not deleted or replaced. You can read the saved plan and retry the refresh later.'),
      note: <SpecCallout title={tx(locale, 'نسخه ذخیره‌شده امن است · همگام‌سازی ۰۸:۴۲', 'Saved plan is safe · synced at 08:42')} tone="neutral">{tx(locale, 'کد پیگیری: TODAY-42A', 'Reference: TODAY-42A')}</SpecCallout>,
      action: tx(locale, 'تلاش دوباره', 'Try again'),
    },
  }
  const item = data[state]
  return (
    <ProductFrame locale={locale} title={tx(locale, 'امروز', 'Today')}>
      <SpecHeader eyebrow={item.eyebrow} title={item.title} body={item.body} />
      <div className="mo-spec__grid">
        <SpecCard className="is-wide"><span className={`mo-spec__state-icon mo-spec__state-icon--${item.tone}`}>{item.icon}</span><div className="mo-spec__stack" style={{ marginBlockStart: '1rem' }}>{item.note}</div><div className="mo-spec__actions"><SpecButton>{state === 'load-error' ? <RefreshCw /> : null}{item.action}</SpecButton>{state === 'completed' ? <><SpecButton kind="secondary">{tx(locale, 'برگرداندن آخرین ثبت', 'Undo last log')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'جزئیات ویرایش ثبت‌ها', 'Review and edit logs')}</SpecButton></> : null}{state === 'load-error' ? <SpecButton kind="secondary">{tx(locale, 'دیدن برنامه ذخیره‌شده', 'View saved plan')}</SpecButton> : null}{state === 'safety' ? <SpecButton kind="secondary">{tx(locale, 'ثبت وضعیت و خروج', 'Save and exit')}</SpecButton> : null}</div></SpecCard>
        <SpecCard><SpecBadge tone="energy">{tx(locale, 'برنامه فعلی', 'Current plan')}</SpecBadge><h2>{tx(locale, 'قدرت و تعادل', 'Strength & balance')}</h2><p>{tx(locale, 'دوره تا ۲۲ شهریور ۱۴۰۵', 'Period through Sep 13, 2026')}</p><SpecProgress label={tx(locale, 'پیشرفت دوره', 'Period progress')} value={64} /></SpecCard>
      </div>
    </ProductFrame>
  )
}

function PlanScreen({ locale, view }: { locale: SpecLocale; view: PlanView }) {
  const tabs = [tx(locale, 'هفته', 'Week'), tx(locale, 'تغذیه', 'Nutrition'), tx(locale, 'تمرین', 'Training'), tx(locale, 'خرید', 'Grocery'), tx(locale, 'تقویم', 'Calendar')]
  const selected = tabs[['week', 'nutrition', 'training', 'grocery', 'calendar'].indexOf(view)]
  const weekdays = locale === 'fa' ? ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  return (
    <ProductFrame active="plan" locale={locale} title={tx(locale, 'برنامه', 'Plan')}>
      <SpecHeader aside={<SpecBadge tone="brand">{tx(locale, 'دوره ۱ · روز ۱۲', 'Period 1 · Day 12')}</SpecBadge>} body={tx(locale, 'برنامه یک‌ماهه از زمان آماده‌شدن آغاز شده و تا پایان دوره قابل مشاهده است.', 'Your one-month plan began when it became ready and remains visible through the end of the period.')} eyebrow={tx(locale, 'قدرت و تعادل', 'Strength & balance')} title={tx(locale, 'برنامه من', 'My plan')} />
      <SpecTabs items={tabs} selected={selected} />
      <div style={{ marginBlockStart: '1rem' }}>
        {view === 'week' ? <WeekView locale={locale} weekdays={weekdays} /> : null}
        {view === 'nutrition' ? <NutritionView locale={locale} /> : null}
        {view === 'training' ? <TrainingView locale={locale} /> : null}
        {view === 'grocery' ? <GroceryView locale={locale} /> : null}
        {view === 'calendar' ? <CalendarView locale={locale} weekdays={weekdays} /> : null}
      </div>
    </ProductFrame>
  )
}

function WeekView({ locale, weekdays }: { locale: SpecLocale; weekdays: string[] }) {
  return <div className="mo-spec__stack"><div className="mo-spec__week">{weekdays.map((day, index) => <article className={`mo-spec__day ${index === 2 ? 'is-active' : ''}`} key={day}><strong>{day}</strong><small>{index === 2 ? tx(locale, 'امروز', 'Today') : index % 2 ? tx(locale, 'بازیابی', 'Recovery') : tx(locale, 'تمرین', 'Workout')}</small></article>)}</div><div className="mo-spec__grid"><SpecCard className="is-wide"><SpecBadge tone="brand"><Dumbbell size={14} /> {tx(locale, 'تمرین امروز', 'Today’s workout')}</SpecBadge><h2>{tx(locale, 'قدرت تمام‌بدن', 'Full-body strength')}</h2><p>{tx(locale, '۶ حرکت · ۳ دور · حدود ۴۵ دقیقه', '6 exercises · 3 rounds · about 45 min')}</p><SpecButton>{tx(locale, 'دیدن تمرین', 'View workout')}</SpecButton></SpecCard><SpecCard><SpecBadge tone="energy"><Utensils size={14} /> {tx(locale, '۴ وعده', '4 meals')}</SpecBadge><h2>{tx(locale, 'پروتئین و فیبر کافی', 'Protein & fibre')}</h2><p>{tx(locale, 'وعده‌ها بر اساس برنامه امروز', 'Meals for today’s schedule')}</p></SpecCard></div></div>
}

function NutritionView({ locale }: { locale: SpecLocale }) {
  return <div className="mo-spec__stack"><SpecCard tone="energy"><SpecBadge tone="energy">{tx(locale, 'یک ماه تقویمی از زمان آماده‌شدن', 'One calendar month from plan ready time')}</SpecBadge><h2>{tx(locale, 'الگوی ماهانه تغذیه', 'Monthly nutrition pattern')}</h2><p>{tx(locale, 'این دوره از لحظه آماده‌شدن تا همان تاریخ در ماه بعد ادامه دارد؛ چهار هفته اصلی و روزهای باقیمانده تقویمی همگی پوشش داده می‌شوند. هر وعده چند گزینه هم‌ارزش دارد تا برنامه بدون بازتولید قابل اجرا بماند.', 'This period runs from the moment the plan is ready to the matching date in the next month; all four core weeks and any remaining calendar days are covered. Every meal includes equivalent options so the plan remains practical without regeneration.')}</p><SpecList rows={[{ icon: <Check />, tone: 'success', label: tx(locale, 'هفته ۱ · آشنایی با مقدارها', 'Week 1 · Learn portions'), detail: tx(locale, 'گزینه اصلی + ۲ جایگزین برای هر وعده', 'Primary option + 2 alternatives per meal') }, { icon: <Check />, tone: 'success', label: tx(locale, 'هفته ۲ و ۳ · تنوع کنترل‌شده', 'Weeks 2–3 · Guided variety'), detail: tx(locale, 'چرخش پروتئین و سبزیجات با همان هدف روزانه', 'Protein and produce rotation with the same daily target') }, { icon: <Check />, tone: 'success', label: tx(locale, 'هفته ۴ و روزهای تقویمی باقیمانده', 'Week 4 and remaining calendar days'), detail: tx(locale, 'گزینه‌های آشنا تا پایان دقیق دوره', 'Familiar options through the exact period end') }]} /></SpecCard><SpecList rows={[
    { icon: <Salad />, tone: 'energy', label: tx(locale, 'صبحانه · ۰۸:۰۰', 'Breakfast · 08:00'), detail: tx(locale, 'ماست یونانی، جو دوسر، توت و گردو', 'Greek yogurt, oats, berries, and walnuts'), value: tx(locale, '۴۲۰ کیلوکالری', '420 kcal') },
    { icon: <Utensils />, tone: 'energy', label: tx(locale, 'ناهار · ۱۳:۰۰', 'Lunch · 13:00'), detail: tx(locale, 'مرغ گریل، برنج قهوه‌ای و سالاد', 'Grilled chicken, brown rice, and salad'), value: tx(locale, '۶۲۰ کیلوکالری', '620 kcal') },
    { icon: <Flame />, tone: 'energy', label: tx(locale, 'میان‌وعده · ۱۶:۳۰', 'Snack · 16:30'), detail: tx(locale, 'سیب و کره بادام‌زمینی جایگزین‌شده', 'Apple with an allergy-safe spread'), value: tx(locale, '۲۱۰ کیلوکالری', '210 kcal') },
    { icon: <Utensils />, tone: 'energy', label: tx(locale, 'شام · ۲۰:۰۰', 'Dinner · 20:00'), detail: tx(locale, 'ماهی تنوری، سیب‌زمینی و سبزیجات', 'Baked fish, potatoes, and vegetables'), value: tx(locale, '۵۸۰ کیلوکالری', '580 kcal') },
  ]} /></div>
}

function TrainingView({ locale }: { locale: SpecLocale }) {
  return <div className="mo-spec__stack"><SpecCard><SpecBadge tone="brand">{tx(locale, 'یک ماه تقویمی از زمان آماده‌شدن', 'One calendar month from plan ready time')}</SpecBadge><h2>{tx(locale, '۱۳ روز تمرین در این دوره تقویمی', '13 workout days this calendar-month period')}</h2><SpecList rows={[{ icon: <Dumbbell />, tone: 'brand', label: tx(locale, 'هفته ۱ · شنبه، دوشنبه، چهارشنبه', 'Week 1 · Sat, Mon, Wed'), detail: tx(locale, 'آشنایی با حرکت‌ها · شدت متوسط', 'Technique familiarisation · moderate intensity') }, { icon: <Dumbbell />, tone: 'brand', label: tx(locale, 'هفته ۲ · شنبه، دوشنبه، چهارشنبه', 'Week 2 · Sat, Mon, Wed'), detail: tx(locale, 'افزایش تدریجی تکرارها', 'Gradual repetition increase') }, { icon: <Dumbbell />, tone: 'brand', label: tx(locale, 'هفته ۳ · شنبه، دوشنبه، چهارشنبه', 'Week 3 · Sat, Mon, Wed'), detail: tx(locale, 'ست اصلی کامل', 'Full working sets') }, { icon: <Dumbbell />, tone: 'brand', label: tx(locale, 'هفته ۴ · شنبه، دوشنبه، چهارشنبه', 'Week 4 · Sat, Mon, Wed'), detail: tx(locale, 'حجم سبک‌تر و جمع‌بندی', 'Reduced volume and consolidation') }, { icon: <CalendarDays />, tone: 'brand', label: tx(locale, 'روزهای تقویمی باقی‌مانده · شنبه', 'Remaining calendar days · Saturday'), detail: tx(locale, 'جلسه ۱۳ تا پایان دقیق دوره ۲۳ مرداد تا ۲۲ شهریور پوشش داده می‌شود.', 'Session 13 covers the exact Aug 14–Sep 13 period end.') }]} /></SpecCard><div className="mo-spec__grid">{[
    [tx(locale, 'گرم‌کردن', 'Warm-up'), tx(locale, '۸ دقیقه', '8 min'), tx(locale, 'حرکت نرم و آماده‌سازی مفاصل', 'Mobility and joint preparation')],
    [tx(locale, 'بخش اصلی', 'Main set'), tx(locale, '۳۰ دقیقه', '30 min'), tx(locale, 'اسکات، پرس، روئینگ و هیپ‌هینج', 'Squat, press, row, and hinge')],
    [tx(locale, 'سردکردن', 'Cool-down'), tx(locale, '۷ دقیقه', '7 min'), tx(locale, 'تنفس و کشش ملایم', 'Breathing and gentle stretches')],
  ].map(([title, duration, body], index) => <SpecCard key={title} tone={index === 1 ? 'brand' : undefined}><SpecBadge tone={index === 1 ? 'brand' : 'neutral'}>{duration}</SpecBadge><h2>{title}</h2><p>{body}</p><SpecButton kind={index === 1 ? 'primary' : 'secondary'}>{tx(locale, 'جزئیات حرکت‌ها', 'Exercise details')}</SpecButton></SpecCard>)}</div></div>
}

function GroceryView({ locale }: { locale: SpecLocale }) {
  return <div className="mo-spec__grid"><SpecCard className="is-wide"><SpecCallout icon={<ShoppingBasket />} title={tx(locale, 'فهرست این هفته', 'This week’s list')} tone="energy">{tx(locale, 'مقدارها برای یک نفر و ۷ روز محاسبه شده‌اند. تیک‌ها در حالت آفلاین روی دستگاه ذخیره و پس از اتصال بدون ایجاد مورد تکراری همگام می‌شوند.', 'Quantities cover one person for 7 days. Offline checkmarks are stored on this device and sync without duplicates after reconnection.')}</SpecCallout><SpecList rows={[
    { icon: <Check />, tone: 'success', label: tx(locale, 'ماست یونانی', 'Greek yogurt'), detail: tx(locale, '۲ ظرف ۵۰۰ گرمی', '2 × 500 g'), value: tx(locale, 'خریده شد', 'Bought') },
    { icon: <Circle />, label: tx(locale, 'سینه مرغ', 'Chicken breast'), detail: tx(locale, '۱٫۲ کیلوگرم', '1.2 kg') },
    { icon: <Circle />, label: tx(locale, 'سبزیجات فصل', 'Seasonal vegetables'), detail: tx(locale, 'حدود ۲٫۵ کیلوگرم', 'About 2.5 kg') },
    { icon: <Circle />, label: tx(locale, 'برنج قهوه‌ای', 'Brown rice'), detail: tx(locale, '۷۵۰ گرم', '750 g') },
  ]} /></SpecCard><SpecCard><SpecBadge tone="neutral"><WifiOff size={14} /> {tx(locale, 'آماده استفاده آفلاین', 'Available offline')}</SpecBadge><h2>{tx(locale, 'مرتب‌سازی فروشگاه', 'Shop order')}</h2><p>{tx(locale, 'میوه و سبزیجات → پروتئین → لبنیات → خشکبار', 'Produce → protein → dairy → pantry')}</p><SpecButton kind="secondary">{tx(locale, 'اشتراک فهرست', 'Share list')}</SpecButton></SpecCard></div>
}

function CalendarView({ locale, weekdays }: { locale: SpecLocale; weekdays: string[] }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  return <SpecCard><div className="mo-spec__heading" style={{ marginBlockEnd: '1rem' }}><div><h2>{tx(locale, 'مرداد ۱۴۰۵', 'August 2026')}</h2><p>{tx(locale, 'دوره جاری از ۲۳ مرداد آغاز شده و در ۲۲ شهریور پایان می‌یابد.', 'The current period starts Aug 14 and ends Sep 13.')}</p></div><SpecBadge tone="brand">{tx(locale, 'نمای ماه', 'Month view')}</SpecBadge></div><div className="mo-spec__calendar">{weekdays.map((day) => <strong key={day} style={{ textAlign: 'center', fontSize: '.7rem' }}>{day}</strong>)}{days.map((day) => <span className={day < 12 ? 'is-complete' : [12, 14, 16, 19, 21, 23, 26, 28].includes(day) ? 'is-workout' : ''} key={day}>{locale === 'fa' ? new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(day) : day}</span>)}</div></SpecCard>
}

function PlanOperational({ locale, state }: { locale: SpecLocale; state: PlanOperationalState }) {
  const routeTitle = tx(locale, 'برنامه', 'Plan')
  if (state === 'loading') return <ProductFrame active="plan" locale={locale} title={routeTitle}><SpecHeader eyebrow={tx(locale, 'در حال بارگذاری', 'Loading')} title={tx(locale, 'برنامه در حال آماده‌شدن برای نمایش است', 'Loading your plan')} /><div aria-busy="true" aria-label={tx(locale, 'در حال بارگذاری برنامه', 'Loading plan')} className="mo-spec__stack"><SpecCard><div className="mo-spec__skeleton mo-spec__skeleton--tabs" /><div className="mo-spec__week">{Array.from({ length: 7 }, (_, item) => <span className="mo-spec__day mo-spec__skeleton mo-spec__skeleton--day" key={item} />)}</div></SpecCard><div className="mo-spec__grid"><SpecCard className="is-wide"><div className="mo-spec__skeleton mo-spec__skeleton--badge" /><div className="mo-spec__skeleton mo-spec__skeleton--title" /><div className="mo-spec__skeleton mo-spec__skeleton--line" /><div className="mo-spec__skeleton mo-spec__skeleton--button" /></SpecCard><SpecCard><div className="mo-spec__skeleton mo-spec__skeleton--badge" /><div className="mo-spec__skeleton mo-spec__skeleton--title" /><div className="mo-spec__skeleton mo-spec__skeleton--line" /></SpecCard></div><span className="mo-spec__save"><LoaderCircle className="orbit-spin" />{tx(locale, 'هندسه دقیق نمای هفته حفظ شده است', 'The final Week-view geometry is preserved')}</span></div></ProductFrame>
  if (state === 'empty' || state === 'offline' || state === 'error') {
    const data = {
      empty: { tone: 'neutral' as const, icon: <CalendarClock />, title: tx(locale, 'برنامه فعالی نداری', 'No active plan'), body: tx(locale, 'راه‌اندازی یا دسترسی را کامل کن تا یک برنامه برای دوره ساخته شود.', 'Complete setup or access requirements to create a plan for the period.'), action: tx(locale, 'دیدن وضعیت برنامه', 'View plan status') },
      offline: { tone: 'neutral' as const, icon: <WifiOff />, title: tx(locale, 'نسخه ذخیره‌شده برنامه', 'Saved plan copy'), body: tx(locale, 'نسخه مربوط به امروز ساعت ۰۸:۴۲ است و تا برگشت اتصال فقط‌خواندنی می‌ماند.', 'This copy was synced today at 08:42 and remains read-only until connection returns.'), action: tx(locale, 'دیدن نسخه ذخیره‌شده', 'View saved copy') },
      error: { tone: 'danger' as const, icon: <AlertTriangle />, title: tx(locale, 'نسخه تازه دریافت نشد', 'The latest plan could not be loaded'), body: tx(locale, 'آخرین نسخه ذخیره‌شده سالم است. می‌توانی آن را ببینی یا دوباره برای به‌روزرسانی تلاش کنی.', 'Your last saved version is safe. View it or retry the update.'), action: tx(locale, 'تلاش دوباره', 'Try again') },
    }[state]
    return <ProductFrame active="plan" locale={locale} title={routeTitle}><SpecHeader eyebrow={tx(locale, 'وضعیت برنامه', 'Plan status')} title={data.title} body={data.body} /><SpecCard className="mo-spec__state-card"><span className={`mo-spec__state-icon mo-spec__state-icon--${data.tone}`}>{data.icon}</span>{state === 'error' ? <SpecCallout icon={<CheckCircle2 />} title={tx(locale, 'نسخه ذخیره‌شده همچنان در دسترس است', 'Your cached version remains available')} tone="success">{tx(locale, 'آخرین همگام‌سازی: امروز ۰۸:۴۲ · فقط‌خواندنی', 'Last synced today at 08:42 · read-only')}</SpecCallout> : null}<div className="mo-spec__actions"><SpecButton>{state === 'error' ? <RefreshCw /> : null}{data.action}</SpecButton>{state === 'error' ? <SpecButton kind="secondary">{tx(locale, 'بازکردن نسخه ذخیره‌شده', 'Open cached plan')}</SpecButton> : null}</div></SpecCard></ProductFrame>
  }
  if (state === 'history') return <ProductFrame active="plan" locale={locale} title={routeTitle}><SpecHeader eyebrow={tx(locale, 'نسخه‌های تغییرناپذیر', 'Immutable versions')} title={tx(locale, 'تفاوت دوره جاری با قبلی', 'What changed from the prior period')} body={tx(locale, 'هر نسخه به چرخه و بازه اثر خودش متصل است و پس از فعال‌شدن ویرایش نمی‌شود.', 'Every version is tied to its source cycle and effective interval and is not edited after activation.')} /><div className="mo-spec__grid"><SpecCard className="is-wide"><SpecList rows={[{ icon: <Check />, tone: 'success', label: tx(locale, 'تمرین‌ها از ۲ به ۳ روز افزایش یافت', 'Training increased from 2 to 3 days'), detail: tx(locale, 'بر اساس پایبندی و زمان اعلام‌شده دوره قبل', 'Based on prior adherence and confirmed availability') }, { icon: <Check />, tone: 'success', label: tx(locale, 'زمان هر جلسه ۶۰ دقیقه شد', 'Session duration changed to 60 minutes'), detail: tx(locale, 'تغییر صریح کاربر پیش از درخواست', 'Explicit user change before the request') }, { icon: <Check />, tone: 'success', label: tx(locale, 'گزینه‌های ناهار بیشتر شد', 'More lunch options'), detail: tx(locale, 'بدون تغییر در حساسیت‌ها', 'Allergy constraints unchanged') }]} /></SpecCard><SpecCard><SpecBadge tone="brand">v2 · {tx(locale, 'فعال', 'Active')}</SpecBadge><h2>{tx(locale, '۲۳ مرداد تا ۲۲ شهریور', 'Aug 14 – Sep 13')}</h2><p>{tx(locale, 'منبع: چرخه دوم تأییدشده', 'Source: confirmed second cycle')}</p></SpecCard></div></ProductFrame>
  return <ProductFrame active="plan" locale={locale} title={routeTitle}><SpecHeader eyebrow={tx(locale, 'نسخه فعال', 'Active version')} title={tx(locale, 'قدرت و تعادل · نسخه ۲', 'Strength & balance · Version 2')} body={tx(locale, 'منبع: چرخه دوم · مؤثر از ۲۳ مرداد تا ۲۲ شهریور ۱۴۰۵ · آماده در ۲۳ مرداد ساعت ۰۸:۴۲', 'Source: cycle 2 · effective Aug 14–Sep 13, 2026 · ready Aug 14 at 08:42')} /><div className="mo-spec__grid"><SpecCard className="is-wide"><SpecCallout icon={<CheckCircle2 />} title={tx(locale, 'این نسخه فعال و فقط‌خواندنی است', 'This version is active and read-only')} tone="success">{tx(locale, 'تغییرهای دوره بعد جداگانه ثبت می‌شوند و این نسخه را بازنویسی نمی‌کنند.', 'Next-period changes are stored separately and do not overwrite this version.')}</SpecCallout><SpecList rows={[{ icon: <Check />, tone: 'success', label: tx(locale, 'تمرین: ۳ روز در هفته', 'Training: 3 days per week'), detail: tx(locale, 'قبلاً ۲ روز · بر اساس زمان تأییدشده', 'Previously 2 days · based on confirmed availability') }, { icon: <Check />, tone: 'success', label: tx(locale, 'مدت جلسه: ۶۰ دقیقه', 'Session duration: 60 minutes'), detail: tx(locale, 'قبلاً ۴۵ دقیقه · تغییر صریح کاربر', 'Previously 45 minutes · explicit user change') }, { icon: <Check />, tone: 'success', label: tx(locale, 'ناهار: دو گزینه بیشتر', 'Lunch: 2 additional options'), detail: tx(locale, 'حساسیت‌ها و هدف انرژی بدون تغییر', 'Allergies and energy target unchanged') }]} /></SpecCard><SpecCard><h2>{tx(locale, 'ردیابی نسخه', 'Version trace')}</h2><p>{tx(locale, 'نسخه ۲ · چرخه ۲ · آماده در ۰۸:۴۲', 'Version 2 · cycle 2 · ready at 08:42')}</p><SpecButton kind="secondary">{tx(locale, 'مقایسه با نسخه قبلی', 'Compare with previous version')}</SpecButton></SpecCard></div></ProductFrame>
}

function renderToday(state: TodayState) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => {
    const locale = localeFromStory(context.globals.locale)
    return state === 'preparing' ? <TodayPreparingView locale={locale} /> : <TodayStatus locale={locale} state={state} />
  }
}

function renderTodayCore(state: TodayCoreState) { return (_: unknown, context: { globals: Record<string, unknown> }) => <TodayCore locale={localeFromStory(context.globals.locale)} state={state} /> }

function renderPlan(view: PlanView) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <PlanScreen locale={localeFromStory(context.globals.locale)} view={view} />
}

function renderPlanOperational(state: PlanOperationalState) { return (_: unknown, context: { globals: Record<string, unknown> }) => <PlanOperational locale={localeFromStory(context.globals.locale)} state={state} /> }

const meta = {
  title: 'Screens/Complete product/Today and plan',
  parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Complete Today state matrix plus the five canonical plan views. Fixtures are local and deterministic.' } } },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const TodayActive: Story = { parameters: momentumEvidence(['TODAY-01'], '/[locale]/app/today'), render: renderTodayCore('active') }
export const TodayRestDay: Story = { parameters: momentumEvidence(['TODAY-02'], '/[locale]/app/today'), render: renderTodayCore('rest') }
export const TodayNoPlan: Story = { parameters: momentumEvidence(['TODAY-03'], '/[locale]/app/today'), render: renderTodayCore('no-plan') }
export const TodayPreparing: Story = { parameters: momentumEvidence(['TODAY-04'], '/[locale]/app/today'), render: renderToday('preparing') }
export const TodayCompleted: Story = { parameters: momentumEvidence(['TODAY-05'], '/[locale]/app/today'), render: renderToday('completed') }
export const TodayPartiallyCompleted: Story = { parameters: momentumEvidence(['TODAY-06'], '/[locale]/app/today'), render: renderTodayCore('partial') }
export const TodayOfflineCached: Story = { parameters: momentumEvidence(['TODAY-07'], '/[locale]/app/today'), render: renderToday('offline') }
export const TodayStaleData: Story = { parameters: momentumEvidence(['TODAY-08'], '/[locale]/app/today'), render: renderToday('stale') }
export const TodayLoadError: Story = { parameters: momentumEvidence(['TODAY-09'], '/[locale]/app/today'), render: renderToday('load-error') }
export const TodaySafetyPause: Story = { parameters: momentumEvidence(['TODAY-10'], '/[locale]/app/today'), render: renderToday('safety') }
export const TodayPreparingMobile: Story = { parameters: { ...momentumEvidence(['TODAY-04'], '/[locale]/app/today'), viewport: { defaultViewport: 'mobile1' } }, render: renderToday('preparing') }
export const PlanWeek: Story = { parameters: momentumEvidence(['PLAN-01'], '/[locale]/app/plan'), render: renderPlan('week') }
export const PlanNutrition: Story = { parameters: momentumEvidence(['PLAN-02'], '/[locale]/app/plan'), render: renderPlan('nutrition') }
export const PlanTraining: Story = { parameters: momentumEvidence(['PLAN-03'], '/[locale]/app/plan'), render: renderPlan('training') }
export const PlanGrocery: Story = { parameters: momentumEvidence(['PLAN-04'], '/[locale]/app/plan', 'in-page'), render: renderPlan('grocery') }
export const PlanCalendar: Story = { parameters: momentumEvidence(['PLAN-05'], '/[locale]/app/plan', 'in-page'), render: renderPlan('calendar') }
export const PlanVersionAndSource: Story = { parameters: momentumEvidence(['PLAN-06'], '/[locale]/app/plan'), render: renderPlanOperational('version') }
export const PlanEmpty: Story = { parameters: momentumEvidence(['PLAN-07'], '/[locale]/app/plan'), render: renderPlanOperational('empty') }
export const PlanLoading: Story = { parameters: momentumEvidence(['PLAN-08'], '/[locale]/app/plan'), render: renderPlanOperational('loading') }
export const PlanOfflineCached: Story = { parameters: momentumEvidence(['PLAN-09'], '/[locale]/app/plan'), render: renderPlanOperational('offline') }
export const PlanLoadError: Story = { parameters: momentumEvidence(['PLAN-10'], '/[locale]/app/plan'), render: renderPlanOperational('error') }
export const PlanHistoryAndDiff: Story = { parameters: momentumEvidence(['PLAN-14'], '/[locale]/app/plan', 'in-page'), render: renderPlanOperational('history') }
export const PlanWeekMobile: Story = { parameters: { ...momentumEvidence(['PLAN-01'], '/[locale]/app/plan'), viewport: { defaultViewport: 'mobile1' } }, render: renderPlan('week') }
