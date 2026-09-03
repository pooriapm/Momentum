import type { Meta, StoryObj } from '@storybook/react-vite'
import { BadgeCheck, Boxes, Languages, MonitorSmartphone, MoonStar, Network, ShieldCheck } from 'lucide-react'
import { canonicalStateIds } from './coverage'
import { localeFromStory, ProductFrame, SpecBadge, SpecCallout, SpecCard, SpecHeader, SpecMetric, tx } from './ProductSpec'

const familyNames = {
  AUTH: ['ورود و حساب', 'Authentication'], EXEC: ['اجرای روزانه', 'Daily execution'],
  LIFE: ['چرخه و عضویت', 'Lifecycle & membership'], ME: ['حساب و تنظیمات', 'Account & settings'],
  ONB: ['راه‌اندازی', 'Onboarding'], PLAN: ['برنامه', 'Plan'], PROG: ['پیشرفت', 'Progress'],
  PUB: ['فضای عمومی', 'Public'], TODAY: ['امروز', 'Today'],
} as const
const ids = canonicalStateIds()

function CoverageReport({ locale }: { locale: 'fa' | 'en' }) {
  const families = Object.entries(familyNames).map(([family, names]) => ({ family, name: locale === 'fa' ? names[0] : names[1], ids: ids.filter((id) => id.startsWith(`${family}-`)) }))
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'تحویل طراحی', 'Design handoff')}>
      <SpecHeader aside={<SpecBadge tone="energy">{tx(locale, '۱۳۷ شناسه', '137 IDs')}</SpecBadge>} body={tx(locale, 'قرارداد فعلی ۱۳۷ شناسه canonical است. عدد تاریخی ۱۳۲ و قفل طراحی پیش از امضای Step 5 مبنای بازگشایی نیست. ممیزی بصری باقی‌ماندهٔ دستگاه واقعی هنوز باز است.', 'The current contract is 137 canonical IDs. The historical 132 count and pre–Step 5 design lock are not a reopen baseline. Remaining real-device visual audit is still open.')} eyebrow={tx(locale, 'گزارش پوشش Storybook', 'Storybook coverage report')} title={tx(locale, 'پوشش طراحی محصول', 'Product-design coverage')} />
      <div className="mo-spec__grid">
        <SpecMetric detail={tx(locale, 'شناسه معنایی یکتا', 'unique semantic IDs')} label={tx(locale, 'قرارداد canonical', 'Canonical contract')} tone="brand" value="137" />
        <SpecMetric detail={tx(locale, 'فضای محصول', 'product areas')} label={tx(locale, 'خانواده‌ها', 'Families')} value="9" />
        <SpecMetric detail={tx(locale, 'فارسی × انگلیسی × روشن × تیره', 'FA × EN × Light × Dark')} label={tx(locale, 'حالت نمایش', 'Display matrix')} tone="brand" value="2 × 2" />
        <SpecCard className="is-full"><SpecCallout icon={<BadgeCheck />} title={tx(locale, 'namespace جدیدی ساخته نشده است', 'No second namespace was introduced')} tone="success">{tx(locale, 'شناسه‌های معتبر فقط PUB، AUTH، ONB، LIFE، TODAY، PLAN، EXEC، PROG و ME هستند.', 'The only valid families are PUB, AUTH, ONB, LIFE, TODAY, PLAN, EXEC, PROG, and ME.')}</SpecCallout></SpecCard>
        {families.map(({ family, name, ids: familyIds }) => <SpecCard key={family}><div className="mo-spec__heading" style={{ marginBlockEnd: '.75rem' }}><div><span className="mo-spec__eyebrow">{family}</span><h2>{name}</h2></div><SpecBadge tone="brand">{familyIds.length}</SpecBadge></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>{familyIds.map((id) => <SpecBadge key={id} tone="neutral">{id}</SpecBadge>)}</div></SpecCard>)}
        <SpecCard className="is-full"><h2>{tx(locale, 'ماتریس آزمون هر state', 'Per-state test matrix')}</h2><div className="mo-spec__grid"><SpecCallout icon={<Languages />} title={tx(locale, 'فارسی و انگلیسی', 'Persian & English')} tone="brand" /><SpecCallout icon={<MoonStar />} title={tx(locale, 'روشن و تیره', 'Light & Dark')} tone="brand" /><SpecCallout icon={<MonitorSmartphone />} title={tx(locale, '۳۲۰ تا ۱۴۴۰ پیکسل', '320–1440 px')} tone="brand" /><SpecCallout icon={<ShieldCheck />} title={tx(locale, 'ایمنی و دسترس‌پذیری', 'Safety & accessibility')} tone="brand" /><SpecCallout icon={<Network />} title={tx(locale, 'داده محلی بدون شبکه', 'Network-free fixtures')} tone="brand" /><SpecCallout icon={<Boxes />} title={tx(locale, 'Human Strength و Liquid Glass', 'Human Strength & Liquid Glass')} tone="brand" /></div></SpecCard>
      </div>
    </ProductFrame>
  )
}

const meta = { title: 'Screens/Complete product/Coverage report', parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Visual checksum of the 137 canonical product-state IDs. D14 visual audit remains explicitly open.' } } }, render: (_: unknown, context: { globals: Record<string, unknown> }) => <CoverageReport locale={localeFromStory(context.globals.locale)} /> } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
export const Canonical137StateCoverage: Story = {}
