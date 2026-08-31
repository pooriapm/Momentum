import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  Gift,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { momentumEvidence, momentumSupportingVariant } from './coverage'
import {
  localeFromStory,
  ProductFrame,
  SpecBadge,
  SpecButton,
  SpecCallout,
  SpecCard,
  SpecField,
  SpecHeader,
  SpecProgress,
  Timeline,
  tx,
  type SpecLocale,
  type SpecTone,
} from './ProductSpec'

type LifecycleState =
  | 'eligibility' | 'gift-available' | 'gift-reserving' | 'gift-reserved' | 'gift-exhausted' | 'checkout' | 'subscription-active' | 'payment-pending' | 'payment-verifying'
  | 'generation-ready' | 'queued' | 'generating' | 'validating' | 'importing' | 'timed-out' | 'needs-input' | 'provider-failed' | 'validation-failed' | 'import-failed' | 'imported'
  | 'renewal-notice' | 'renewal-changes' | 'renewal-unchanged' | 'expired' | 'region' | 'safety'

type LifecycleCopy = { eyebrow: string; title: string; body: string; tone: SpecTone; icon: ReactNode }

const usedRequestStates = new Set<LifecycleState>(['import-failed', 'imported'])

function lifecycleCopy(locale: SpecLocale, state: LifecycleState): LifecycleCopy {
  const values: Record<LifecycleState, LifecycleCopy> = {
    eligibility: { eyebrow: tx(locale, 'بررسی دسترسی', 'Access check'), title: tx(locale, 'در حال بررسی عضویت و امکان برنامه', 'Checking membership and plan access'), body: tx(locale, 'وضعیت عضویت، بودجه هدیه و مرز ایمنی از منبع معتبر بررسی می‌شوند. کشور فقط مسیر پرداخت را تعیین می‌کند.', 'Membership, gift budget, and safety boundary are checked from authoritative sources. Country only routes payment.'), tone: 'info', icon: <LoaderCircle className="orbit-spin" /> },
    'gift-available': { eyebrow: tx(locale, 'هدیه برنامه اول', 'First-plan gift'), title: tx(locale, 'برنامه اول مهمان Momentum', 'Your first plan is on Momentum'), body: tx(locale, 'بودجه هدیه فعال است. برنامه اول بدون کارت شروع می‌شود و عضویت از چرخه دوم لازم است.', 'The gift budget is available. The first plan starts with no card; membership is required from cycle two.'), tone: 'energy', icon: <Gift /> },
    'gift-reserving': { eyebrow: tx(locale, 'رزرو هدیه', 'Gift reservation'), title: tx(locale, 'در حال رزرو اتمیک هدیه', 'Reserving your gift'), body: tx(locale, 'تا نتیجه قطعی، دکمه تکراری غیرفعال است و هیچ درخواست ساخت برنامه‌ای آغاز نمی‌شود.', 'Duplicate action is blocked and generation does not begin until reservation is final.'), tone: 'energy', icon: <LoaderCircle className="orbit-spin" /> },
    'gift-reserved': { eyebrow: tx(locale, 'هدیه رزرو شد', 'Gift reserved'), title: tx(locale, 'یک برنامه کامل در این رزرو قرار دارد', 'This reservation covers one complete plan'), body: tx(locale, 'رزرو شامل یک درخواست ترکیبی تمرین و تغذیه است و تا تأیید نهایی برنامه مصرف نمی‌شود.', 'The reservation covers one combined workout and nutrition request and is consumed only after final confirmation.'), tone: 'success', icon: <BadgeCheck /> },
    'gift-exhausted': { eyebrow: tx(locale, 'وضعیت هدیه', 'Gift status'), title: tx(locale, 'بودجه هدیه فعلاً تمام شده', 'The gift budget is currently exhausted'), body: tx(locale, 'هدیه برنامه اول تضمینی یا دائمی نیست. برای ساخت برنامه، عضویت فعال لازم است.', 'The first-plan gift is not permanent or guaranteed. An active membership is required to create a plan.'), tone: 'neutral', icon: <Gift /> },
    checkout: { eyebrow: tx(locale, 'عضویت Momentum', 'Momentum membership'), title: tx(locale, 'برای دوره دوم عضو شو', 'Subscribe for cycle two'), body: tx(locale, 'هدیه برنامه اول بدون روش پرداخت شروع می‌شود. برای ساخت برنامه دوره دوم، روش پرداخت متناسب با کشور را ثبت کن و عضویت Momentum را فعال کن.', 'The first-plan gift starts without a payment method. Add the country-routed payment method and activate Momentum membership for cycle two.'), tone: 'brand', icon: <WalletCards /> },
    'subscription-active': { eyebrow: tx(locale, 'عضویت فعال', 'Active membership'), title: tx(locale, 'Momentum فعال است', 'Momentum is active'), body: tx(locale, 'مرز دوره بعد و وضعیت درخواست فعلی همیشه قابل مشاهده است. فقط یک اشتراک وجود دارد.', 'The next eligibility boundary and current request status remain visible. There is one membership only.'), tone: 'success', icon: <WalletCards /> },
    'payment-pending': { eyebrow: tx(locale, 'وضعیت پرداخت', 'Payment status'), title: tx(locale, 'پرداخت در مهلت بازیابی است', 'Payment is in a recovery window'), body: tx(locale, 'تا تعیین وضعیت عضویت، ساخت دوره بعد شروع نمی‌شود و برنامه‌های قبلی قابل مشاهده می‌مانند.', 'The next plan cannot start until membership resolves; past plans remain readable.'), tone: 'warning', icon: <CreditCard /> },
    'payment-verifying': { eyebrow: tx(locale, 'تأیید پرداخت', 'Payment verification'), title: tx(locale, 'در حال تأیید عضویت', 'Verifying your membership'), body: tx(locale, 'تا دریافت نتیجه قطعی، درخواست ساخت برنامه ارسال نمی‌شود و پرداخت دوم ایجاد نخواهد شد.', 'No plan request is submitted and no second payment is created until confirmation is final.'), tone: 'info', icon: <LoaderCircle className="orbit-spin" /> },
    'generation-ready': { eyebrow: tx(locale, 'یک درخواست در هر دوره', 'One request per period'), title: tx(locale, 'اطلاعاتت برای ساخت برنامه آماده است', 'Your information is ready'), body: tx(locale, 'با تأیید، یک درخواست همه اطلاعات لازم را برای ساخت برنامه کامل تمرین و تغذیه ارسال می‌کند.', 'Confirming sends one request with all required information for a complete workout and nutrition plan.'), tone: 'brand', icon: <Sparkles /> },
    queued: { eyebrow: tx(locale, 'در صف آماده‌سازی', 'Queued'), title: tx(locale, 'درخواست ثبت شده و آماده شروع است', 'Your request is queued and ready to start'), body: tx(locale, 'می‌توانی صفحه را ببندی و بعداً برگردی؛ درخواست دوم ایجاد نمی‌شود.', 'You can leave and return later; no duplicate request is created.'), tone: 'info', icon: <Clock3 /> },
    generating: { eyebrow: tx(locale, 'در صف ساخت', 'Queued generation'), title: tx(locale, 'برنامه در حال ساخت و بررسی است', 'Your plan is being created and checked'), body: tx(locale, 'همین کار در صف است. اگر شکست بخورد بعد از کمی تأخیر دوباره تلاش می‌شود. تا ورود موفق، سهم دوره مصرف نشده است.', 'The same job stays in the queue. If it fails, it retries after a delay. The period allowance is not used until import succeeds.'), tone: 'brand', icon: <LoaderCircle className="orbit-spin" /> },
    validating: { eyebrow: tx(locale, 'بررسی نتیجه', 'Validation'), title: tx(locale, 'ساختار و ایمنی برنامه در حال بررسی است', 'Checking plan structure and safety'), body: tx(locale, 'خروجی همین کار برای کامل‌بودن و ایمنی بررسی می‌شود. هنوز وارد حساب نشده است.', 'This job’s output is checked for completeness and safety. It is not in the account yet.'), tone: 'info', icon: <ShieldCheck /> },
    importing: { eyebrow: tx(locale, 'ورود اتمیک', 'Atomic import'), title: tx(locale, 'در حال قراردادن برنامه در حسابت', 'Importing the plan into your account'), body: tx(locale, 'برنامه قبلی تا پایان ورود سالم و فعال می‌ماند. دوره جدید وقتی برنامه آماده شد شروع می‌شود.', 'The previous plan stays safe and active until import succeeds. The new period starts when the plan is ready.'), tone: 'brand', icon: <RefreshCw className="orbit-spin" /> },
    'needs-input': { eyebrow: tx(locale, 'اطلاعات تکمیلی', 'More information needed'), title: tx(locale, 'پیش از دوره پولی یک مورد را اصلاح کن', 'Fix one item before the paid cycle'), body: tx(locale, 'روش پرداخت چرخه پولی ثبت نشده است. ایمیل، روش پرداخت و کشور صورتحساب فیلدهای جدا هستند. هنوز هیچ درخواست ماهانه‌ای مصرف نشده است.', 'The paid-cycle payment method is missing. Email, payment method, and billing country are distinct named fields. No monthly request has been consumed.'), tone: 'warning', icon: <AlertTriangle /> },
    'provider-failed': { eyebrow: tx(locale, 'ساخت برنامه ناموفق', 'Generation failed'), title: tx(locale, 'برنامه هنوز آماده نشد', 'The plan is not ready yet'), body: tx(locale, 'درخواست در صف دوباره تلاش می‌شود. می‌توانی همین حالا دوباره بفرستی. اگر برنامه قبلی داری سالم می‌ماند.', 'The queue will retry. You can request again now. Any previous plan stays safe.'), tone: 'danger', icon: <XCircle /> },
    'timed-out': { eyebrow: tx(locale, 'زمان انتظار تمام شد', 'Waiting timed out'), title: tx(locale, 'ساخت برنامه بیشتر از ۳ دقیقه طول کشید', 'Creating the plan took longer than 3 minutes'), body: tx(locale, 'گیر نکرده‌ای. می‌توانی دوباره درخواست بدهی. اگر همان کار هنوز در صف است، درخواست دوم ساخته نمی‌شود.', 'You are not stuck. Request again. If the same job is still queued, a second request is not created.'), tone: 'warning', icon: <Clock3 /> },
    'validation-failed': { eyebrow: tx(locale, 'اعتبارسنجی ناموفق', 'Validation failed'), title: tx(locale, 'نتیجه برای ورود ایمن نبود', 'The result was not safe to import'), body: tx(locale, 'خروجی وارد نشد. صف بعد از تأخیر دوباره تلاش می‌کند. می‌توانی درخواست را تکرار کنی. اگر برنامه قبلی داری سالم می‌ماند.', 'Nothing was imported. The queue retries after a delay. You can request again. Any previous plan stays safe.'), tone: 'danger', icon: <AlertOctagon /> },
    'import-failed': { eyebrow: tx(locale, 'ورود ناموفق', 'Import failed'), title: tx(locale, 'برنامه معتبر است اما وارد حساب نشد', 'The valid plan was not imported'), body: tx(locale, 'نتیجه معتبر محفوظ است. تلاش دوباره فقط ورود به حساب را تکرار می‌کند و درخواست جدیدی از سرویس تولید نمی‌فرستد.', 'The validated result is preserved. Retrying repeats only the import and does not call the generation provider again.'), tone: 'warning', icon: <AlertTriangle /> },
    imported: { eyebrow: tx(locale, 'ورود موفق', 'Import complete'), title: tx(locale, 'برنامه ۳۰روزه آماده است', 'Your 30-day plan is ready'), body: tx(locale, 'دوره ۳۰روزه از زمان آماده‌شدن برنامه آغاز شد. تاریخ پایان و وضعیت درخواست همیشه در حساب قابل مشاهده‌اند.', 'The 30-day period starts when the plan is ready. Its end date and request status stay visible in your account.'), tone: 'success', icon: <BadgeCheck /> },
    'renewal-notice': { eyebrow: tx(locale, 'پایان دوره نزدیک است', 'Period ending soon'), title: tx(locale, 'برای برنامه بعد آماده شو', 'Get ready for your next plan'), body: tx(locale, 'پس از پایان دوره و تأیید عضویت، می‌توانی تغییرها را ثبت کنی یا با اطلاعات قبلی ادامه بدهی.', 'After the period ends and membership is confirmed, describe changes or continue with your confirmed information.'), tone: 'info', icon: <CalendarClock /> },
    'renewal-changes': { eyebrow: tx(locale, 'درخواست دوره بعد', 'Next-period request'), title: tx(locale, 'چه چیزی تغییر کرده؟', 'What has changed?'), body: tx(locale, 'فقط تغییرهای مهم در هدف، سلامت، زمان، غذا یا امکانات را بنویس. اطلاعات تأییدشده دوره قبل همراه آن ارسال می‌شود.', 'Describe meaningful goal, health, schedule, food, or equipment changes. Confirmed prior-period information is included.'), tone: 'brand', icon: <Sparkles /> },
    'renewal-unchanged': { eyebrow: tx(locale, 'ادامه با اطلاعات قبلی', 'Continue unchanged'), title: tx(locale, 'همه اطلاعات هنوز درست‌اند', 'Your information is still accurate'), body: tx(locale, 'نتیجه و پایبندی دوره قبل همراه اطلاعات اصلی برای ساخت برنامه بعد استفاده می‌شوند.', 'Prior-period outcomes and adherence are combined with your confirmed profile for the next plan.'), tone: 'success', icon: <Check /> },
    expired: { eyebrow: tx(locale, 'عضویت غیرفعال', 'Membership inactive'), title: tx(locale, 'تمدید انجام نشد', 'Your membership did not renew'), body: tx(locale, 'برنامه‌های قبلی قابل مشاهده‌اند، اما ساخت برنامه دوره جدید تا فعال‌شدن عضویت متوقف است.', 'Past plans remain visible, but a new plan cannot be created until membership is active.'), tone: 'warning', icon: <CreditCard /> },
    region: { eyebrow: tx(locale, 'مسیر پرداخت', 'Payment route'), title: tx(locale, 'کشور پرداخت ایران است', 'Payment country is Iran'), body: tx(locale, 'پرداخت با درگاه ایرانی و تومان انجام می‌شود. زبان مستقل و قابل تغییر است؛ ساخت برنامه و هدیه محدود نمی‌شوند.', 'Payment uses the Iranian gateway and toman. Language is independent and editable; generation and gifts are not restricted.'), tone: 'brand', icon: <Globe2 /> },
    safety: { eyebrow: tx(locale, 'بررسی ایمنی', 'Safety review'), title: tx(locale, 'ساخت خودکار برنامه متوقف شد', 'Automatic planning is paused'), body: tx(locale, 'پاسخ سلامتی نیاز به بررسی خارج از این سرویس دارد. هیچ درخواست ماهانه‌ای مصرف نشده است.', 'A health answer requires review outside this service. No monthly generation request has been consumed.'), tone: 'danger', icon: <ShieldCheck /> },
  }
  return values[state]
}

const waitStates = new Set<LifecycleState>(['queued', 'generating', 'validating', 'importing'])

const waitProgress: Record<'queued' | 'generating' | 'validating' | 'importing', number> = {
  queued: 22,
  generating: 54,
  validating: 76,
  importing: 91,
}

const waitEyebrow = {
  queued: { fa: 'یک برنامه برای یک ماه · در صف', en: 'One plan for one month · queued' },
  generating: { fa: 'یک برنامه برای یک ماه · در حال ساخت', en: 'One plan for one month · creating' },
  validating: { fa: 'یک برنامه برای یک ماه · بررسی ایمنی', en: 'One plan for one month · safety check' },
  importing: { fa: 'یک برنامه برای یک ماه · ورود به حساب', en: 'One plan for one month · importing' },
} as const

function waitLines(locale: SpecLocale) {
  return locale === 'fa'
    ? [
        'در حال خواندن هدف و برنامه تمرینی‌ات…',
        'در حال چیدن تمرین‌های یک ماه…',
        'در حال چیدن وعده‌های غذایی…',
        'در حال بررسی ایمنی غذا و حرکت…',
        'تقریباً آماده است…',
      ]
    : [
        'Reading your goal and training setup…',
        'Laying out one month of workouts…',
        'Laying out the meals for the month…',
        'Checking food and movement safety…',
        'Almost ready…',
      ]
}

function GenerateWaitScreen({ locale, state }: { locale: SpecLocale; state: Extract<LifecycleState, 'queued' | 'generating' | 'validating' | 'importing'> }) {
  const lines = waitLines(locale)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % lines.length), 2800)
    return () => window.clearInterval(timer)
  }, [lines.length])
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'ساخت برنامه', 'Creating your plan')}>
      <div className="mo-spec__generate-wait">
        <span className="mo-spec__state-icon mo-spec__state-icon--brand"><LoaderCircle className="orbit-spin" /></span>
        <p className="mo-spec__eyebrow">{tx(locale, waitEyebrow[state].fa, waitEyebrow[state].en)}</p>
        <h1>{tx(locale, 'لطفاً منتظر بمانید. برنامه شخصی‌سازی‌شده شما در حال تولید است.', 'Please wait. Your personalized plan is being created.')}</h1>
        <p className="mo-spec__generate-wait-rotating" aria-live="polite">{lines[index]}</p>
        <SpecProgress label={tx(locale, 'آماده‌سازی برنامه ۳۰روزه', 'Preparing the 30-day plan')} value={waitProgress[state]} />
        <p>{tx(locale, 'می‌توانی این صفحه را ببندی. اگر بعد از ۳ دقیقه آماده نشد، خطا می‌بینی و می‌توانی دوباره درخواست بدهی.', 'You can leave. If it is not ready after 3 minutes, you will see an error and can request again.')}</p>
      </div>
    </ProductFrame>
  )
}

function LifecycleScreen({ locale, state }: { locale: SpecLocale; state: LifecycleState }) {
  if (waitStates.has(state)) return <GenerateWaitScreen locale={locale} state={state as Extract<LifecycleState, 'queued' | 'generating' | 'validating' | 'importing'>} />
  const item = lifecycleCopy(locale, state)
  const requestUsed = usedRequestStates.has(state)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'چرخه برنامه', 'Plan lifecycle')}>
      <SpecHeader eyebrow={item.eyebrow} title={item.title} body={item.body} aside={<SpecBadge tone={item.tone}>{requestUsed ? tx(locale, '۱ از ۱ استفاده شده', '1 of 1 used') : tx(locale, '۱ از ۱ باقی مانده', '1 of 1 available')}</SpecBadge>} />
      <div className="mo-spec__grid">
        <SpecCard className="is-wide" tone={item.tone}>
          <span className={`mo-spec__state-icon mo-spec__state-icon--${item.tone}`}>{item.icon}</span>
          <div style={{ marginBlockStart: '1rem' }}><LifecycleBody locale={locale} state={state} /></div>
        </SpecCard>
        <SpecCard>
          <p className="mo-spec__eyebrow"><LockKeyhole size={14} /> {tx(locale, 'قرارداد دوره', 'Period contract')}</p>
          <h2>{tx(locale, 'دوره منتظر ابتدای ماه نمی‌ماند', 'The period does not wait for a new month')}</h2>
          <p>{tx(locale, 'دوره ۳۰روزه از زمان آماده‌شدن برنامه محاسبه می‌شود.', 'The 30-day period is counted from when the plan is ready.')}</p>
          <SpecProgress label={tx(locale, 'سهم درخواست', 'Request allowance')} value={requestUsed ? 100 : 0} />
        </SpecCard>
      </div>
    </ProductFrame>
  )
}

function LifecycleBody({ locale, state }: { locale: SpecLocale; state: LifecycleState }) {
  if (state === 'payment-pending') return <><SpecCallout icon={<CreditCard />} title={tx(locale, 'برنامه‌های قبلی در دسترس می‌مانند', 'Past plans remain available')} tone="warning">{tx(locale, 'تا بازیابی پرداخت و تأیید عضویت، درخواست دوره بعد شروع نمی‌شود و هیچ فراخوانی به سرویس تولید انجام نمی‌شود.', 'No next-period request or provider call starts until payment is recovered and membership is confirmed.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'به‌روزرسانی روش پرداخت', 'Update payment method')}</SpecButton><SpecButton kind="secondary"><RefreshCw />{tx(locale, 'بررسی دوباره وضعیت پرداخت', 'Check payment status again')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن برنامه‌های قبلی', 'View past plans')}</SpecButton></div></>
  if (state === 'eligibility' || state === 'gift-reserving') return <><SpecCallout icon={<LoaderCircle className="orbit-spin" />} title={tx(locale, 'این وضعیت قابل ترک و بازگشت است', 'You can safely leave and return')} tone={state === 'gift-reserving' ? 'energy' : 'info'}>{tx(locale, 'عملیات تکراری مسدود است و تغییر وضعیت به‌صورت قابل بازیابی ثبت می‌شود.', 'Duplicate action is blocked and every transition is recoverable.')}</SpecCallout><div className="mo-spec__actions"><SpecButton disabled>{tx(locale, 'در حال بررسی', 'In progress')}</SpecButton></div></>
  if (state === 'gift-reserved') return <><SpecCallout icon={<BadgeCheck />} title={tx(locale, 'رزرو موفق', 'Reservation complete')} tone="success">{tx(locale, 'در بازبینی نهایی می‌توانی درخواست ترکیبی را تأیید کنی.', 'You can confirm the combined request from final review.')}</SpecCallout><SpecButton>{tx(locale, 'رفتن به بازبینی', 'Continue to review')}</SpecButton></>
  if (state === 'subscription-active') return <><SpecCallout icon={<WalletCards />} title={tx(locale, 'تمدید بعدی: ۲۲ شهریور ۱۴۰۵', 'Next renewal: Sep 13, 2026')} tone="success">{tx(locale, 'درخواست بعدی پس از پایان دوره فعال می‌شود.', 'The next request unlocks after the active period ends.')}</SpecCallout><SpecButton kind="secondary">{tx(locale, 'مدیریت عضویت', 'Manage membership')}</SpecButton></>
  if (state === 'needs-input') return <><SpecCallout icon={<AlertTriangle />} title={tx(locale, 'این وضعیت یک فیلد مشخص را نام می‌برد', 'This state names one missing field')} tone="warning">{tx(locale, 'تأیید ایمیل، روش پرداخت و کشور صورتحساب قابل جایگزینی نیستند.', 'Email confirmation, payment method, and billing country are not interchangeable.')}</SpecCallout><SpecField error={tx(locale, 'روش پرداخت را اضافه کن. تا چرخه دوم شارژ نمی‌شود.', 'Add a payment method. It is not charged until cycle 2.')} label={tx(locale, 'روش پرداخت', 'Payment method')} value="" /><div className="mo-spec__actions"><SpecButton>{tx(locale, 'ذخیره و بررسی دوباره', 'Save and check again')}</SpecButton></div></>
  if (state === 'provider-failed' || state === 'timed-out') return <><SpecCallout icon={state === 'timed-out' ? <Clock3 /> : <XCircle />} title={state === 'timed-out' ? tx(locale, 'بعد از ۳ دقیقه برنامه آماده نشد', 'The plan was not ready after 3 minutes') : tx(locale, 'ساخت برنامه این بار تمام نشد', 'Creating the plan did not finish this time')} tone={state === 'timed-out' ? 'warning' : 'danger'}>{tx(locale, 'کد پیگیری PLAN-GEN-441 ثبت شد. صف بعد از تأخیر دوباره تلاش می‌کند. اگر همان کار هنوز زنده است، دکمه وضعیت را می‌خواند نه درخواست دوم.', 'Reference PLAN-GEN-441 is recorded. The queue retries after a delay. If the same job is still alive, the button reads status and does not start a second request.')}</SpecCallout><div className="mo-spec__actions"><SpecButton><RefreshCw />{tx(locale, 'تلاش دوباره', 'Try again')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن برنامه قبلی', 'View previous plan')}</SpecButton></div></>
  if (state === 'payment-verifying') return <><Timeline rows={[{ title: tx(locale, 'بازگشت از پرداخت', 'Returned from checkout'), body: tx(locale, 'شناسه پرداخت دریافت شد', 'Payment reference received'), status: 'done' }, { title: tx(locale, 'تأیید سمت سرور', 'Server verification'), body: tx(locale, 'انتظار برای پاسخ قطعی', 'Waiting for a final result'), status: 'active' }, { title: tx(locale, 'فعال‌کردن عضویت', 'Activate membership'), body: tx(locale, 'فقط پس از تأیید', 'Only after confirmation'), status: 'pending' }]} /><SpecCallout icon={<Clock3 />} title={tx(locale, 'می‌توانی این صفحه را ببندی', 'You can leave this screen')} tone="info">{tx(locale, 'با تغییر وضعیت، اعلان دریافت می‌کنی.', 'We’ll notify you when the status changes.')}</SpecCallout></>
  if (state === 'renewal-changes') return <><SpecField label={tx(locale, 'تغییرهای دوره بعد', 'Changes for the next period')} multiline value={tx(locale, 'از هفته بعد دوشنبه‌ها امکان تمرین ندارم و یک جفت دمبل تا ۲۰ کیلوگرم دارم.', 'I cannot train on Mondays next period, and I now have dumbbells up to 20 kg.')} /><div className="mo-spec__actions"><SpecButton>{tx(locale, 'تأیید و ساخت برنامه بعد', 'Confirm and create next plan')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'بدون تغییر ادامه بده', 'Continue unchanged')}</SpecButton></div></>
  if (state === 'checkout') return <><SpecCallout icon={<WalletCards />} title={tx(locale, 'هدیه بدون پرداخت؛ عضویت از چرخه دوم', 'Gift without payment; membership from cycle 2')} tone="brand">{tx(locale, 'هدیه برنامه اول بدون روش پرداخت شروع می‌شود. برای چرخه پولی بعدی اشتراک را از مسیر مناسب کشور فعال کن؛ ایران با درگاه ایرانی و تومان، سایر کشورها با Stripe و دلار.', 'The first-plan gift starts without a payment method. Activate membership for the next paid cycle through the country route: Iranian gateway and toman for Iran, Stripe and USD elsewhere.')}</SpecCallout><div className="mo-spec__stack" style={{ marginBlockStart: '1rem' }}><p>✓ {tx(locale, 'یک برنامه ترکیبی در هر دوره', 'One combined plan per period')}</p><p>✓ {tx(locale, 'هدیه بدون کارت یا شارژ', 'The gift needs no card or charge')}</p><p>✓ {tx(locale, 'لغو از تنظیمات عضویت', 'Cancel from membership settings')}</p></div><div className="mo-spec__actions"><SpecButton><CreditCard />{tx(locale, 'فعال‌سازی عضویت پولی', 'Activate paid membership')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن مسیر پرداخت', 'View payment route')}</SpecButton></div></>
  if (state === 'gift-available') return <><SpecCallout icon={<Gift />} title={tx(locale, 'هدیه برای رزرو در دسترس است', 'Gift is available to reserve')} tone="energy">{tx(locale, 'برنامه اول بدون کارت شروع می‌شود. رزرو هنوز درخواست ساخت برنامه را مصرف یا سرویس تولید را فراخوانی نمی‌کند.', 'The first plan starts without a card. Reserving does not consume the plan request or call the generation provider.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'رزرو هدیه برنامه اول', 'Reserve first-plan gift')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'بعداً تصمیم می‌گیرم', 'Decide later')}</SpecButton></div></>
  if (state === 'gift-exhausted') return <><SpecCallout icon={<Gift />} title={tx(locale, 'امکان هدیه فعلاً بسته است', 'Gift is currently unavailable')} tone="neutral">{tx(locale, 'اطلاعات راه‌اندازی ذخیره شده و با فعال‌کردن عضویت از بین نمی‌رود.', 'Your setup is saved and remains available when you activate membership.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'دیدن عضویت', 'View membership')}</SpecButton></div></>
  if (state === 'generation-ready') return <><SpecCallout icon={<Sparkles />} title={tx(locale, 'این اقدام درخواست دوره را مصرف می‌کند', 'This uses your period request')} tone="brand">{tx(locale, 'پیش از تأیید، خلاصه اطلاعات را بازبینی کن.', 'Review your confirmed information before continuing.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'تأیید و ساخت برنامه', 'Confirm and create plan')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'بازبینی اطلاعات', 'Review information')}</SpecButton></div></>
  if (state === 'validation-failed') return <><SpecCallout icon={<AlertOctagon />} title={tx(locale, 'خروجی وارد حساب نشد', 'The result was not imported')} tone="danger">{tx(locale, 'کد پیگیری PLAN-VAL-913 ثبت شد. صف بعد از تأخیر دوباره تلاش می‌کند. می‌توانی درخواست را تکرار کنی.', 'Reference PLAN-VAL-913 is recorded. The queue retries after a delay. You can request again.')}</SpecCallout><div className="mo-spec__actions"><SpecButton><RefreshCw />{tx(locale, 'تلاش دوباره', 'Try again')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن برنامه قبلی', 'View previous plan')}</SpecButton></div></>
  if (state === 'import-failed') return <><SpecCallout icon={<RefreshCw />} title={tx(locale, 'نتیجه معتبر محفوظ است؛ برنامه قبلی فعال می‌ماند', 'The valid result is preserved; your prior plan stays active')} tone="warning">{tx(locale, 'تلاش دوباره فقط ورود اتمیک همان نتیجه را تکرار می‌کند؛ سهم درخواست تغییر نمی‌کند و سرویس تولید دوباره فراخوانی نمی‌شود.', 'Retrying repeats only the atomic import of the same validated result; it does not change the allowance or call the generation provider again.')}</SpecCallout><SpecCallout icon={<AlertOctagon />} title={tx(locale, 'تطبیق پشتیبانی: PLAN-IMPORT-207', 'Support reconciliation: PLAN-IMPORT-207')} tone="info">{tx(locale, 'اگر ورود دوباره ناموفق بود، پشتیبانی با این شناسه نتیجه محفوظ را با حساب تطبیق می‌دهد؛ برنامه قبلی حذف یا بازنویسی نمی‌شود.', 'If import fails again, support uses this reference to reconcile the preserved result with the account; the prior plan is never deleted or overwritten.')}</SpecCallout><div className="mo-spec__actions"><SpecButton><RefreshCw />{tx(locale, 'تلاش دوباره برای ورود امن', 'Retry safe import')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن برنامه قبلی', 'View prior plan')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'درخواست تطبیق از پشتیبانی', 'Request support reconciliation')}</SpecButton></div></>
  if (state === 'imported') return <><SpecCallout icon={<BadgeCheck />} title={tx(locale, 'آماده در ۲۳ مرداد ۱۴۰۵، ساعت ۰۸:۴۲', 'Ready Aug 14, 2026 at 08:42')} tone="success">{tx(locale, 'نسخه v2 تغییرناپذیر و فعال است. دوره از همین زمان تا ۲۲ شهریور محاسبه می‌شود و تمرین، تغذیه و فهرست خرید با هم وارد شدند.', 'Immutable version v2 is active. The period runs from this ready time through Sep 13, and workout, nutrition, and grocery content were imported together.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'بازکردن برنامه امروز', 'Open Today')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دیدن نسخه و تاریخ شروع', 'View version and ready time')}</SpecButton></div></>
  if (state === 'renewal-notice') return <><SpecCallout icon={<CalendarClock />} title={tx(locale, '۳ روز تا پایان دوره', '3 days until period end')} tone="info">{tx(locale, 'درخواست جدید زودتر ارسال نمی‌شود؛ فقط می‌توانی تغییرها را از حالا آماده کنی.', 'The next request is not sent early; you can prepare your changes now.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'ثبت تغییرها', 'Describe changes')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'بعداً یادآوری کن', 'Remind me later')}</SpecButton></div></>
  if (state === 'renewal-unchanged') return <><SpecCallout icon={<Check />} title={tx(locale, 'اطلاعات تأیید شد', 'Information confirmed')} tone="success">{tx(locale, 'پس از پایان دوره و تأیید عضویت، درخواست جدید قابل ارسال است.', 'After the period ends and membership is verified, the next request becomes available.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'ادامه با اطلاعات قبلی', 'Continue unchanged')}</SpecButton></div></>
  if (state === 'expired') return <><SpecCallout icon={<CreditCard />} title={tx(locale, 'برنامه فعلی فقط‌خواندنی است', 'Current plan is read-only')} tone="warning">{tx(locale, 'داده‌ها حذف نمی‌شوند و پس از فعال‌سازی دوباره در دسترس می‌مانند.', 'Your data is not deleted and remains available after reactivation.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'فعال‌سازی دوباره', 'Reactivate membership')}</SpecButton></div></>
  if (state === 'region') return <><SpecCallout icon={<Globe2 />} title={tx(locale, 'کشور مسیر پرداخت را تعیین می‌کند', 'Country routes payment')} tone="brand">{tx(locale, 'IP فقط پیشنهاد اولیه می‌دهد. زبان را می‌توانی مستقل تغییر بدهی و دسترسی به برنامه محدود نمی‌شود.', 'IP only provides an initial suggestion. Language can be changed independently and plan access is not restricted.')}</SpecCallout><div className="mo-spec__actions"><SpecButton>{tx(locale, 'تأیید و ساخت برنامه', 'Confirm and create plan')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'مدیریت حساب', 'Manage account')}</SpecButton></div></>
  return <><SpecCallout icon={<AlertOctagon />} title={tx(locale, 'هیچ درخواست یا پرداختی انجام نشده', 'No request or payment was made')} tone="danger">{tx(locale, 'برای بررسی مناسب با متخصص سلامت دارای صلاحیت صحبت کن.', 'Speak with a qualified health professional for appropriate assessment.')}</SpecCallout><div className="mo-spec__actions"><SpecButton kind="danger">{tx(locale, 'دیدن راهنمای ایمنی', 'View safety guidance')}</SpecButton></div></>
}

function renderLifecycle(state: LifecycleState) { return (_: unknown, context: { globals: Record<string, unknown> }) => <LifecycleScreen locale={localeFromStory(context.globals.locale)} state={state} /> }

const meta = { title: 'Screens/Complete product/Subscription and lifecycle', parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Screen-level membership, gift, generation, validation, import, renewal, regional, and safety states. The monthly provider call contract is visible in every relevant state.' } } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const EntitlementChecking: Story = { parameters: momentumEvidence(['LIFE-01'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('eligibility') }
export const FirstPlanGiftAvailable: Story = { parameters: momentumEvidence(['LIFE-02'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('gift-available') }
export const GiftReservationInProgress: Story = { parameters: momentumEvidence(['LIFE-03'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('gift-reserving') }
export const GiftReserved: Story = { parameters: momentumEvidence(['LIFE-04'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('gift-reserved') }
export const FirstPlanGiftExhausted: Story = { parameters: momentumEvidence(['LIFE-05'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('gift-exhausted') }
export const IranPaymentRoute: Story = { name: 'Iran payment route', parameters: momentumEvidence(['LIFE-06'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('region') }
export const HealthSafetyBlocked: Story = { parameters: momentumEvidence(['LIFE-07'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('safety') }
export const MembershipCheckout: Story = { parameters: momentumEvidence(['LIFE-08'], '/[locale]/app/me', 'in-page'), render: renderLifecycle('checkout') }
export const MembershipActive: Story = { parameters: momentumEvidence(['LIFE-09'], '/[locale]/app/me', 'in-page'), render: renderLifecycle('subscription-active') }
export const MembershipPaymentPending: Story = { parameters: momentumEvidence(['LIFE-10'], '/[locale]/app/me', 'in-page'), render: renderLifecycle('payment-pending') }
export const MembershipExpired: Story = { parameters: momentumEvidence(['LIFE-11'], '/[locale]/app/me', 'in-page'), render: renderLifecycle('expired') }
export const GenerationQueued: Story = { name: 'Plan wait · queued', parameters: momentumEvidence(['LIFE-12'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('queued') }
export const GenerationInProgress: Story = { name: 'Plan wait · generating', parameters: momentumEvidence(['LIFE-13'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('generating') }
export const GenerationValidating: Story = { name: 'Plan wait · validating', parameters: momentumEvidence(['LIFE-14'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('validating') }
export const PlanImporting: Story = { name: 'Plan wait · importing', parameters: momentumEvidence(['LIFE-15'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('importing') }
export const PlanImportedAndPeriodStarted: Story = { parameters: momentumEvidence(['LIFE-16'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('imported') }
export const GenerationNeedsInput: Story = { parameters: momentumEvidence(['LIFE-17'], '/[locale]/onboarding/review', 'in-page'), render: renderLifecycle('needs-input') }
export const GenerationNeedsEmail: Story = { parameters: momentumSupportingVariant('/[locale]/onboarding/review', 'LIFE-17 named field: email confirmation', 'in-page'), render: (_, context) => {
  const locale = localeFromStory(context.globals.locale)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'چرخه برنامه', 'Plan lifecycle')}>
      <SpecHeader body={tx(locale, 'تأیید ایمیل، روش پرداخت و کشور صورتحساب فیلدهای جدا هستند.', 'Email confirmation, payment method, and billing country are distinct named fields.')} eyebrow={tx(locale, 'اطلاعات تکمیلی', 'More information needed')} title={tx(locale, 'ایمیل را تأیید کن', 'Confirm your email')} />
      <SpecCard><SpecField error={tx(locale, 'لینک تأیید ایمیل هنوز کامل نشده است.', 'The email confirmation link is not complete.')} label={tx(locale, 'ایمیل', 'Email')} value="sara@example.com" /><div className="mo-spec__actions"><SpecButton>{tx(locale, 'ارسال دوباره لینک', 'Resend confirmation')}</SpecButton></div></SpecCard>
    </ProductFrame>
  )
} }
export const GenerationNeedsBillingCountry: Story = { parameters: momentumSupportingVariant('/[locale]/onboarding/review', 'LIFE-17 named field: billing country', 'in-page'), render: (_, context) => {
  const locale = localeFromStory(context.globals.locale)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'چرخه برنامه', 'Plan lifecycle')}>
      <SpecHeader body={tx(locale, 'تأیید ایمیل، روش پرداخت و کشور صورتحساب فیلدهای جدا هستند.', 'Email confirmation, payment method, and billing country are distinct named fields.')} eyebrow={tx(locale, 'اطلاعات تکمیلی', 'More information needed')} title={tx(locale, 'کشور صورتحساب را اصلاح کن', 'Fix billing country')} />
      <SpecCard><SpecField error={tx(locale, 'کشور صورتحساب از روش پرداخت خوانده می‌شود، نه از IP.', 'Billing country comes from the payment method, not from IP.')} label={tx(locale, 'کشور صورتحساب', 'Billing country')} value="" /><div className="mo-spec__actions"><SpecButton>{tx(locale, 'به‌روزرسانی روش پرداخت', 'Update payment method')}</SpecButton></div></SpecCard>
    </ProductFrame>
  )
} }
export const GenerationTimedOut: Story = { parameters: momentumEvidence(['LIFE-18'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('timed-out') }
export const GenerationProviderFailed: Story = { parameters: momentumEvidence(['LIFE-18'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('provider-failed') }
export const GenerationValidationFailed: Story = { parameters: momentumEvidence(['LIFE-19'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('validation-failed') }
export const ValidPlanImportFailed: Story = { parameters: momentumEvidence(['LIFE-20'], '/[locale]/app/today', 'in-page'), render: renderLifecycle('import-failed') }
export const PaymentVerification: Story = { parameters: momentumEvidence(['LIFE-10'], '/[locale]/app/me', 'in-page'), render: renderLifecycle('payment-verifying') }
export const GenerationConfirmation: Story = { parameters: momentumSupportingVariant('/[locale]/onboarding/review', 'pre-provider confirmation; no canonical ready-state claim', 'in-page'), render: renderLifecycle('generation-ready') }
export const RenewalNotice: Story = { parameters: momentumEvidence(['PROG-07'], '/[locale]/app/progress', 'in-page'), render: renderLifecycle('renewal-notice') }
export const RenewalWithChanges: Story = { parameters: momentumEvidence(['PROG-07'], '/[locale]/app/progress', 'in-page'), render: renderLifecycle('renewal-changes') }
export const RenewalUnchanged: Story = { parameters: momentumEvidence(['PROG-07'], '/[locale]/app/progress', 'in-page'), render: renderLifecycle('renewal-unchanged') }
export const GenerationMobile: Story = { parameters: { ...momentumEvidence(['LIFE-13'], '/[locale]/app/today', 'in-page'), viewport: { defaultViewport: 'mobile1' } }, render: renderLifecycle('generating') }
