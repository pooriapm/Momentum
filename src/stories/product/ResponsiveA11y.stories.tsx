import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, ChartNoAxesCombined, CircleUserRound, House } from 'lucide-react'
import { momentumEvidence, momentumSupportingVariant } from './coverage'
import {
  ChartBars,
  localeFromStory,
  ProductFrame,
  PublicFrame,
  SpecBadge,
  SpecButton,
  SpecCallout,
  SpecCard,
  SpecField,
  SpecHeader,
  SpecList,
  SpecSelect,
  SpecTable,
  tx,
  type SpecLocale,
} from './ProductSpec'

const compact320 = { defaultViewport: 'compact320' }
const compact375 = { defaultViewport: 'compact375' }
const compact390 = { defaultViewport: 'compact390' }
const medium768 = { defaultViewport: 'medium768' }
const expanded1440 = { defaultViewport: 'expanded1440' }

function TodayActive({ locale, nav = true }: { locale: SpecLocale; nav?: boolean }) {
  return (
    <ProductFrame locale={locale} nav={nav} title={tx(locale, 'امروز', 'Today')}>
      <SpecHeader
        body={tx(locale, '۶ حرکت · ۳ دور · حدود ۴۵ دقیقه · خانه', '6 exercises · 3 rounds · about 45 minutes · home')}
        eyebrow={tx(locale, 'روز ۱۲ از دوره', 'Day 12 of period')}
        title={tx(locale, 'امروز یک تمرین قدرتی داری', 'A strength session is next')}
      />
      <div className="mo-spec__grid">
        <SpecCard className="is-wide" tone="brand">
          <SpecBadge tone="brand">{tx(locale, 'قدم بعدی', 'Next action')}</SpecBadge>
          <h2>{tx(locale, 'قدرت تمام‌بدن', 'Full-body strength')}</h2>
          <p>{tx(locale, 'این اقدام باید بالای تاخوردگی در ۳۷۵×۶۶۷ بماند.', 'This action must stay above the fold at 375×667.')}</p>
          <div className="mo-spec__actions">
            <SpecButton>{tx(locale, 'شروع تمرین', 'Start workout')}</SpecButton>
          </div>
        </SpecCard>
      </div>
    </ProductFrame>
  )
}

function Weekdays({ locale }: { locale: SpecLocale }) {
  const days = locale === 'fa'
    ? ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'تمرین', 'Training')}>
      <SpecHeader
        body={tx(locale, 'هفت برچسب باید در عرض فشرده بپیچند، بدون برش یا اصطلاحات LTR.', 'Seven labels wrap at compact width without clipping or LTR/RTL jargon.')}
        eyebrow={tx(locale, 'روزهای هفته', 'Weekdays')}
        title={tx(locale, 'کدام روزها تمرین می‌کنی؟', 'Which days do you train?')}
      />
      <div className="mo-spec__week">
        {days.map((day) => (
          <button className="mo-spec__day" key={day} type="button">{day}</button>
        ))}
      </div>
    </ProductFrame>
  )
}

function ChartAndTable({ locale }: { locale: SpecLocale }) {
  return (
    <ProductFrame active="progress" locale={locale} title={tx(locale, 'پیشرفت', 'Progress')}>
      <SpecHeader
        body={tx(locale, 'نمودار و جدول باید همان چهار مقدار را نشان دهند.', 'The chart and table must show the same four values.')}
        eyebrow={tx(locale, 'چهار هفته', 'Four weeks')}
        title={tx(locale, 'پایبندی با جایگزین متنی', 'Adherence with a text alternative')}
      />
      <div className="mo-spec__grid">
        <SpecCard className="is-wide">
          <ChartBars labels={locale === 'fa' ? ['هفته ۱', 'هفته ۲', 'هفته ۳', 'هفته ۴'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4']} values={[62, 78, 86, 18]} />
        </SpecCard>
        <SpecCard>
          <SpecCallout title={tx(locale, 'جایگزین جدول', 'Table alternative')} tone="info">
            {tx(locale, 'هفته چهارم ناقص است و صفر تفسیر نمی‌شود.', 'Week four is partial and is not treated as zero.')}
          </SpecCallout>
        </SpecCard>
        <SpecCard className="is-full">
          <SpecTable
            columns={locale === 'fa' ? ['هفته', 'پایبندی'] : ['Week', 'Adherence']}
            rows={locale === 'fa' ? [['هفته ۱', '۶۲٪'], ['هفته ۲', '۷۸٪'], ['هفته ۳', '۸۶٪'], ['هفته ۴ · ناقص', '۱۸٪']] : [['Week 1', '62%'], ['Week 2', '78%'], ['Week 3', '86%'], ['Week 4 · partial', '18%']]}
          />
        </SpecCard>
      </div>
    </ProductFrame>
  )
}

function ExpandedShell({ locale }: { locale: SpecLocale }) {
  const items = [
    { id: 'today', icon: House, fa: 'امروز', en: 'Today' },
    { id: 'plan', icon: CalendarDays, fa: 'برنامه', en: 'Plan' },
    { id: 'progress', icon: ChartNoAxesCombined, fa: 'پیشرفت', en: 'Progress' },
    { id: 'me', icon: CircleUserRound, fa: 'من', en: 'Me' },
  ] as const
  return (
    <div className={`mo-spec mo-spec--sidebar`} dir={locale === 'fa' ? 'rtl' : 'ltr'} lang={locale}>
      <nav aria-label={tx(locale, 'ناوبری اصلی', 'Primary navigation')} className="mo-spec__rail">
        {items.map(({ id, icon: Icon, fa, en }) => (
          <button aria-current={id === 'today' ? 'page' : undefined} className={id === 'today' ? 'is-active' : ''} key={id} type="button">
            <Icon aria-hidden="true" size={20} />
            <span>{tx(locale, fa, en)}</span>
          </button>
        ))}
      </nav>
      <div className="mo-spec__shell">
        <TodayActive locale={locale} nav={false} />
      </div>
    </div>
  )
}

function Grocery({ locale }: { locale: SpecLocale }) {
  const groups = locale === 'fa'
    ? [
        { title: 'سبزی و میوه', rows: ['اسفناج', 'گوجه‌فرنگی خوشه‌ای', 'خیار'] },
        { title: 'پروتئین', rows: ['سینه مرغ', 'ماست یونانی'] },
      ]
    : [
        { title: 'Produce', rows: ['Spinach', 'Vine tomatoes', 'Cucumber'] },
        { title: 'Protein', rows: ['Chicken breast', 'Greek yogurt'] },
      ]
  return (
    <ProductFrame active="plan" locale={locale} title={tx(locale, 'خرید', 'Grocery')}>
      <SpecHeader
        body={tx(locale, 'فهرست گروه‌بندی‌شده در عرض متوسط باید خوانا بماند و تکمیل آفلاین را نشان دهد.', 'The grouped list stays readable at medium width and shows offline-safe completion.')}
        eyebrow={tx(locale, 'برنامه جاری', 'Current plan')}
        title={tx(locale, 'فهرست خرید این هفته', 'This week’s grocery list')}
      />
      <div className="mo-spec__grid">
        {groups.map((group) => (
          <SpecCard key={group.title}>
            <h2>{group.title}</h2>
            <SpecList rows={group.rows.map((row) => ({ label: row }))} />
          </SpecCard>
        ))}
      </div>
    </ProductFrame>
  )
}

function LocaleCalendarUnits({ locale }: { locale: SpecLocale }) {
  return (
    <ProductFrame active="me" locale={locale} nav={false} title={tx(locale, 'زبان و واحدها', 'Language & units')}>
      <SpecHeader
        body={tx(locale, 'زبان و ارز فهرست از نسخه قفل‌شده حساب می‌آیند. تقویم و واحدها جدا می‌مانند. نمونه زنده تقویم در Components/Localized date picker است.', 'Language and list currency follow the locked account version. Calendar and units stay separate. Live calendar evidence is Components/Localized date picker.')}
        eyebrow={tx(locale, 'ME-03', 'ME-03')}
        title={tx(locale, 'تاریخ، رقم و واحد محلی', 'Local date, digits and units')}
      />
      <div className="mo-spec__grid">
        <SpecCard>
          <SpecField hint={tx(locale, 'جلالی با رقم فارسی', 'Jalali with Persian digits')} label={tx(locale, 'تاریخ تولد', 'Date of birth')} value={locale === 'fa' ? '۱۳۶۹/۰۱/۰۱' : '21 Mar 1990'} />
          <SpecField hint={tx(locale, 'کیلوگرم برای این حساب', 'Kilograms for this account')} label={tx(locale, 'وزن', 'Weight')} value={locale === 'fa' ? '۷۲٫۴ کیلوگرم' : '72.4 kg'} />
          <SpecSelect label={tx(locale, 'تقویم', 'Calendar')} value={tx(locale, 'هجری شمسی', 'Gregorian')} />
        </SpecCard>
        <SpecCard>
          <SpecCallout title={tx(locale, 'بدون برچسب فنی جهت', 'No technical direction labels')} tone="info">
            {tx(locale, 'چیدمان مناسب زبان به‌صورت خودکار اعمال می‌شود. LTR و RTL در رابط دیده نمی‌شوند.', 'The matching layout is applied automatically. LTR and RTL are not shown in the UI.')}
          </SpecCallout>
        </SpecCard>
      </div>
    </ProductFrame>
  )
}

function LongEnglishCopy() {
  return (
    <ProductFrame locale="en" title="Review">
      <SpecHeader
        body="This paragraph is deliberately about thirty-five percent longer than the default English review so wrapping, line length, and logical spacing stay readable at compact width. The next monthly plan is built from the current goal, training days, and safety limits, and no artificial coach conversation is added to this screen."
        eyebrow="Long English +35%"
        title="A plan that moves with the real rhythm of your life, not with short fitness slogans that leave the important constraints unsaid"
      />
      <SpecCard className="is-wide">
        <p>If week four is still incomplete, adherence is partial and is not read as zero. Weight stays in kilograms unless changed in settings. Dates in this language use the Gregorian calendar and Western digits.</p>
        <div className="mo-spec__actions">
          <SpecButton>Continue with this plan</SpecButton>
        </div>
      </SpecCard>
    </ProductFrame>
  )
}

function LongPersianCopy() {
  return (
    <ProductFrame locale="fa" title="مرور">
      <SpecHeader
        body="این پاراگراف عمداً طولانی است تا شکست خط فارسی، اعداد محلی و فاصله منطقی در عرض فشرده دیده شود. برنامه ماه بعد از روی هدف فعلی، روزهای تمرین و محدودیت‌های ایمنی ساخته می‌شود و هیچ گفتگوی مربی مصنوعی به این صفحه اضافه نمی‌شود."
        eyebrow="متن بلند فارسی"
        title="برنامه‌ای که با ریتم واقعی زندگی شما حرکت می‌کند، نه با شعارهای کوتاه تناسب‌اندام"
      />
      <SpecCard className="is-wide">
        <p>اگر هفته چهارم هنوز تمام نشده، مقدار پایبندی ناقص است و صفر خوانده نمی‌شود. واحد وزن کیلوگرم می‌ماند مگر اینکه در تنظیمات عوض شود. تاریخ‌ها در این زبان با تقویم هجری شمسی و رقم فارسی نمایش داده می‌شوند.</p>
        <div className="mo-spec__actions">
          <SpecButton>ادامه با همین برنامه</SpecButton>
        </div>
      </SpecCard>
    </ProductFrame>
  )
}

function PreferenceFallbacks({ locale }: { locale: SpecLocale }) {
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'ترجیح‌های حسی', 'Sensory preferences')}>
      <SpecHeader
        body={tx(locale, 'شواهد کامل در Visual direction/Liquid Glass motion · ReducedTransparencyAndMotionFallbacks است. Penpot جفت‌های مات و بدون حرکت جدا دارد.', 'Full evidence is Visual direction/Liquid Glass motion · ReducedTransparencyAndMotionFallbacks. Penpot has separate opaque and instant-rest boards.')}
        eyebrow={tx(locale, 'جفت دسترس‌پذیری', 'Accessibility pairing')}
        title={tx(locale, 'شفافیت کمتر و حرکت کمتر', 'Reduced transparency and reduced motion')}
      />
      <div className="mo-spec__grid">
        <SpecCard className="mo-spec--force-reduced-transparency">
          <h2>{tx(locale, 'شفافیت کاهش‌یافته', 'Reduced transparency')}</h2>
          <p>{tx(locale, 'نوار ناوبری مات است؛ محوشدگی و نویز حذف می‌شوند.', 'Navigation chrome is opaque; blur and noise are removed.')}</p>
        </SpecCard>
        <SpecCard className="mo-spec--force-reduced-motion">
          <h2>{tx(locale, 'حرکت کاهش‌یافته', 'Reduced motion')}</h2>
          <p>{tx(locale, 'تغییر وضعیت فوری است؛ فشار و morph مقیاس نمی‌گیرند.', 'State changes are instant; press and morph do not scale.')}</p>
        </SpecCard>
      </div>
    </ProductFrame>
  )
}

function LandingNarrow({ locale }: { locale: SpecLocale }) {
  return (
    <PublicFrame locale={locale}>
      <SpecHeader
        body={tx(locale, 'یک برنامه‌ی یکپارچه‌ی غذا و تمرین برای هر ماه.', 'One integrated nutrition and training plan each month.')}
        eyebrow={tx(locale, 'Momentum', 'Momentum')}
        title={tx(locale, 'برنامه‌ای که با شما حرکت می‌کند', 'A plan that moves with you')}
      />
      <div className="mo-spec__actions">
        <SpecButton>{tx(locale, 'برنامه‌ام را بساز', 'Build my plan')}</SpecButton>
        <SpecButton kind="secondary">{tx(locale, 'کاوش محصول', 'Explore the product')}</SpecButton>
      </div>
    </PublicFrame>
  )
}

const meta = {
  title: 'Patterns/Responsive and accessibility evidence',
  parameters: {
    controls: { disable: true },
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Step 4 representative evidence: Compact 320/375/390, Medium 768, Expanded 1440, 44px targets, 200% zoom, Dynamic Type 2.0, long Persian and English, chart alternatives, and reduced motion/transparency pairing. Toolbar locale and theme still apply.',
      },
    },
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Compact390Today: Story = {
  parameters: { ...momentumEvidence(['TODAY-01'], '/[locale]/app/today'), viewport: compact390 },
  render: (_, context) => <TodayActive locale={localeFromStory(context.globals.locale)} />,
}
export const Compact320TodayOverflow: Story = {
  parameters: { ...momentumEvidence(['TODAY-01'], '/[locale]/app/today'), viewport: compact320 },
  render: (_, context) => (
    <div className="mo-spec-compact-phone">
      <TodayActive locale={localeFromStory(context.globals.locale)} />
    </div>
  ),
}
export const Compact320WeekdaysWrap: Story = {
  parameters: { ...momentumEvidence(['ONB-18'], '/[locale]/onboarding/training'), viewport: compact320 },
  render: (_, context) => (
    <div className="mo-spec-compact-phone">
      <Weekdays locale={localeFromStory(context.globals.locale)} />
    </div>
  ),
}
export const Compact320Landing: Story = {
  parameters: { ...momentumEvidence(['PUB-02'], '/[locale]'), viewport: compact320 },
  render: (_, context) => <LandingNarrow locale={localeFromStory(context.globals.locale)} />,
}
export const Compact375TodayAboveFold: Story = {
  parameters: { ...momentumEvidence(['TODAY-01'], '/[locale]/app/today'), viewport: compact375 },
  render: (_, context) => {
    const locale = localeFromStory(context.globals.locale)
    return (
      <div>
        <div aria-label={tx(locale, 'نمونه تاخوردگی ۳۷۵ در ۶۶۷', '375 by 667 fold specimen')} className="mo-spec-fold-375">
          <TodayActive locale={locale} />
        </div>
        <p className="mo-spec-fold-375__note">{tx(locale, 'تاخوردگی ۳۷۵×۶۶۷. شروع تمرین بالای داک می‌ماند.', '375×667 fold. Start workout stays above the dock.')}</p>
      </div>
    )
  },
}
export const Medium768ChartAndTable: Story = {
  parameters: { ...momentumEvidence(['PROG-02'], '/[locale]/app/progress'), viewport: medium768 },
  render: (_, context) => <ChartAndTable locale={localeFromStory(context.globals.locale)} />,
}
export const Medium768Weekdays: Story = {
  parameters: { ...momentumEvidence(['ONB-18'], '/[locale]/onboarding/training'), viewport: medium768 },
  render: (_, context) => <Weekdays locale={localeFromStory(context.globals.locale)} />,
}
export const Medium768Grocery: Story = {
  parameters: { ...momentumEvidence(['PLAN-04'], '/[locale]/app/plan'), viewport: medium768 },
  render: (_, context) => <Grocery locale={localeFromStory(context.globals.locale)} />,
}
export const Expanded1440SidebarToday: Story = {
  parameters: { ...momentumEvidence(['TODAY-01'], '/[locale]/app/today'), viewport: expanded1440 },
  render: (_, context) => <ExpandedShell locale={localeFromStory(context.globals.locale)} />,
}
export const Zoom200TodayReflow: Story = {
  parameters: momentumSupportingVariant('/[locale]/app/today', '200% zoom reflow without two-axis scroll'),
  render: (_, context) => (
    <div className="mo-spec-zoom-200">
      <TodayActive locale={localeFromStory(context.globals.locale)} />
    </div>
  ),
}
export const Target44pxControls: Story = {
  parameters: momentumSupportingVariant('/[locale]/app/today', '44px minimum targets and visible focus'),
  render: (_, context) => {
    const locale = localeFromStory(context.globals.locale)
    return (
      <ProductFrame locale={locale} nav={false} title={tx(locale, 'اهداف لمسی', 'Touch targets')}>
        <SpecHeader
          body={tx(locale, 'هر کنترل تعاملی حداقل ۴۴×۴۴ است و فوکوس صفحه‌کلید دیده می‌شود.', 'Every interactive control is at least 44×44 and keyboard focus is visible.')}
          eyebrow={tx(locale, 'WCAG 2.2 AA', 'WCAG 2.2 AA')}
          title={tx(locale, 'اهداف ۴۴ پیکسلی', '44-pixel targets')}
        />
        <div className="mo-spec-targets">
          <SpecButton>{tx(locale, 'ادامه', 'Continue')}</SpecButton>
          <SpecButton kind="secondary">{tx(locale, 'بازگشت', 'Back')}</SpecButton>
          <button aria-label={tx(locale, 'امروز', 'Today')} type="button"><House aria-hidden="true" /></button>
        </div>
      </ProductFrame>
    )
  },
}
export const LongPersianReflow: Story = {
  parameters: { ...momentumEvidence(['ONB-27'], '/[locale]/onboarding/review'), viewport: compact320 },
  render: () => <LongPersianCopy />,
}
export const LongEnglishReflow: Story = {
  parameters: { ...momentumSupportingVariant('/[locale]/onboarding/review', 'English +35% long copy reflow at compact 320'), viewport: compact320 },
  render: () => <LongEnglishCopy />,
}
export const DynamicTypeScale200: Story = {
  parameters: { ...momentumSupportingVariant('/[locale]/app/today', 'Dynamic Type / font scale 2.0 without two-axis scroll'), viewport: compact320 },
  render: (_, context) => (
    <div className="mo-spec-type-scale-200">
      <div className="mo-spec-compact-phone">
        <TodayActive locale={localeFromStory(context.globals.locale)} />
      </div>
    </div>
  ),
}
export const CalendarDigitsAndUnits: Story = {
  parameters: momentumEvidence(['ME-03'], '/[locale]/app/settings'),
  render: (_, context) => <LocaleCalendarUnits locale={localeFromStory(context.globals.locale)} />,
}
export const ReducedTransparencyAndMotionPairing: Story = {
  parameters: momentumSupportingVariant('/[locale]/app/today', 'reduced transparency and reduced motion pairing'),
  render: (_, context) => <PreferenceFallbacks locale={localeFromStory(context.globals.locale)} />,
}
