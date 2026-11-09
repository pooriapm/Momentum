import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'
import { TodayOrbit } from '../../v2/pages/app/TodayOrbit'
import { EmptyState, Notice, Skeleton } from '../../v2/ui/feedback'
import { Checkbox, Input, NumberStepper, Select, Switch } from '../../v2/ui/FormControls'
import { conceptIcons } from '../../v2/ui/icons'
import { Page, PageHeader, SectionHeader } from '../../v2/ui/layout'
import { OrbitMark } from '../../v2/ui/OrbitMark'
import { Button, ContentCard, StatusPill } from '../../v2/ui/primitives'
import { SegmentedControl } from '../../v2/ui/SegmentedControl'
import './state-matrix.css'

// Every component in every state it can be in. Review each with the toolbar on: light/dark,
// فارسی/English, text 100–200% and reduced motion. A state missing here is a state not designed.

type Locale = 'fa' | 'en'
const tx = (locale: Locale, fa: string, en: string) => (locale === 'fa' ? fa : en)

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="state-matrix__row">
      <h3>{name}</h3>
      <div className="state-matrix__cells">{children}</div>
    </section>
  )
}

function Cell({ state, children }: { state: string; children: ReactNode }) {
  return (
    <figure className="state-matrix__cell">
      <figcaption>{state}</figcaption>
      <div>{children}</div>
    </figure>
  )
}

function Matrix({ locale }: { locale: Locale }) {
  const [segment, setSegment] = useState<'week' | 'nutrition' | 'training'>('week')
  const [count, setCount] = useState('1')
  const Warning = conceptIcons.warning
  return (
    <div className="state-matrix">
      <Row name="Button">
        <Cell state="primary"><Button>{tx(locale, 'ثبت مصرف', 'Log intake')}</Button></Cell>
        <Cell state="secondary"><Button variant="secondary">{tx(locale, 'تغییر غذا', 'Change meal')}</Button></Cell>
        <Cell state="ghost"><Button variant="ghost">{tx(locale, 'بعداً', 'Not now')}</Button></Cell>
        <Cell state="danger"><Button variant="danger">{tx(locale, 'حذف حساب', 'Delete account')}</Button></Cell>
        <Cell state="loading"><Button loading>{tx(locale, 'در حال ذخیره', 'Saving')}</Button></Cell>
        <Cell state="disabled"><Button disabled>{tx(locale, 'در دسترس نیست', 'Unavailable')}</Button></Cell>
      </Row>

      <Row name="Input">
        <Cell state="empty"><Input label={tx(locale, 'ایمیل', 'Email')} placeholder="you@example.com" required /></Cell>
        <Cell state="filled + hint"><Input defaultValue="72.8" hint={tx(locale, 'به کیلوگرم', 'In kilograms')} label={tx(locale, 'وزن', 'Weight')} /></Cell>
        <Cell state="error"><Input defaultValue="999" error={tx(locale, 'قد باید بین ۱۰۰ تا ۲۵۰ باشد.', 'Height must be 100–250.')} label={tx(locale, 'قد', 'Height')} /></Cell>
        <Cell state="disabled"><Input defaultValue="IR" disabled label={tx(locale, 'کشور', 'Country')} /></Cell>
      </Row>

      <Row name="Select">
        <Cell state="closed"><Select label={tx(locale, 'سطح فعالیت', 'Activity level')} onChange={() => undefined} value="m"><option value="l">{tx(locale, 'کم', 'Low')}</option><option value="m">{tx(locale, 'متوسط', 'Moderate')}</option></Select></Cell>
        <Cell state="error"><Select error={tx(locale, 'یکی را انتخاب کن.', 'Choose one.')} label={tx(locale, 'هدف', 'Goal')} onChange={() => undefined} value=""><option value="a">A</option></Select></Cell>
        <Cell state="disabled"><Select disabled label={tx(locale, 'زبان', 'Language')} onChange={() => undefined} value="fa"><option value="fa">فارسی</option></Select></Cell>
      </Row>

      <Row name="NumberStepper">
        <Cell state="at minimum"><NumberStepper decreaseLabel="−" increaseLabel="+" label={tx(locale, 'جلسه در هفته', 'Sessions a week')} locale={locale} max={6} min={1} onChange={setCount} value={count} /></Cell>
        <Cell state="error"><NumberStepper decreaseLabel="−" error={tx(locale, 'حداکثر ۶ جلسه.', 'At most 6 sessions.')} increaseLabel="+" label={tx(locale, 'جلسه در هفته', 'Sessions a week')} locale={locale} max={6} min={1} onChange={() => undefined} value="6" /></Cell>
      </Row>

      <Row name="Checkbox">
        <Cell state="unchecked"><Checkbox description={tx(locale, 'مثل سفر یا شیفت کاری', 'Travel or shift work')} label={tx(locale, 'شرایطم تغییر کرده', 'My circumstances changed')} /></Cell>
        <Cell state="checked"><Checkbox defaultChecked label={tx(locale, 'درد قفسهٔ سینه', 'Chest pain')} /></Cell>
        <Cell state="required error"><Checkbox error={tx(locale, 'برای ادامه لازم است.', 'Required to continue.')} label={tx(locale, 'شرایط را می‌پذیرم', 'I accept the terms')} required /></Cell>
        <Cell state="plain"><Checkbox appearance="plain" label={tx(locale, 'سیاست حریم خصوصی را خواندم', 'I read the privacy policy')} /></Cell>
        <Cell state="disabled"><Checkbox disabled label={tx(locale, 'در دسترس نیست', 'Unavailable')} /></Cell>
      </Row>

      <Row name="Switch">
        <Cell state="off"><Switch description={tx(locale, 'پایان هر هفته', 'End of each week')} label={tx(locale, 'گزارش هفتگی', 'Weekly report')} /></Cell>
        <Cell state="on"><Switch defaultChecked label={tx(locale, 'یادآوری تمرین', 'Workout reminder')} /></Cell>
        <Cell state="disabled (offline)"><Switch disabled label={tx(locale, 'تحلیل اختیاری', 'Optional analytics')} /></Cell>
      </Row>

      <Row name="SegmentedControl">
        <Cell state="three views">
          <SegmentedControl
            idPrefix="matrix"
            items={[
              { value: 'week', label: tx(locale, 'هفته', 'Week'), icon: <conceptIcons.week size={18} /> },
              { value: 'nutrition', label: tx(locale, 'تغذیه', 'Nutrition'), icon: <conceptIcons.meal size={18} /> },
              { value: 'training', label: tx(locale, 'تمرین', 'Training'), icon: <conceptIcons.workout size={18} /> },
            ]}
            label={tx(locale, 'بخش', 'Section')}
            onChange={setSegment}
            value={segment}
          />
        </Cell>
      </Row>

      <Row name="Notice">
        <Cell state="neutral"><Notice>{tx(locale, 'برنامه‌ها اول هر ماه تازه می‌شوند.', 'Plans refresh at the start of each month.')}</Notice></Cell>
        <Cell state="info"><Notice tone="info">{tx(locale, 'پیش‌نمایش · تغییرها ذخیره نمی‌شوند.', 'Preview · changes are not saved.')}</Notice></Cell>
        <Cell state="success"><Notice tone="success">{tx(locale, 'ثبت ویرایش شد.', 'Edit saved.')}</Notice></Cell>
        <Cell state="warning (stale)"><Notice icon={<Warning size={18} />} tone="warning">{tx(locale, 'نسخهٔ ذخیره‌شده · آخرین همگام‌سازی ۱۰:۴۲', 'Saved copy · last synced 10:42')}</Notice></Cell>
        <Cell state="error + action"><Notice action={<Button variant="secondary">{tx(locale, 'تلاش دوباره', 'Try again')}</Button>} title={tx(locale, 'اطلاعات دریافت نشد', 'Couldn’t load')} tone="error">{tx(locale, 'اتصال را بررسی کن.', 'Check your connection.')}</Notice></Cell>
      </Row>

      <Row name="StatusPill">
        <Cell state="tones">
          <div className="state-matrix__inline">
            <StatusPill>{tx(locale, 'برنامه فعال', 'Active plan')}</StatusPill>
            <StatusPill tone="success">{tx(locale, 'انجام شد', 'Done')}</StatusPill>
            <StatusPill tone="energy">{tx(locale, 'روز تمرین', 'Training day')}</StatusPill>
            <StatusPill tone="neutral">{tx(locale, 'روز استراحت', 'Rest day')}</StatusPill>
          </div>
        </Cell>
      </Row>

      <Row name="TodayOrbit">
        <Cell state="in progress"><TodayOrbit calories={{ logged: 1240, target: 2100 }} locale={locale} meals={{ kind: 'value', done: 2, target: 4 }} water={{ kind: 'value', done: 1400, target: 2500 }} workout={{ kind: 'value', done: 0.5, target: 1 }} /></Cell>
        <Cell state="zero (fresh day)"><TodayOrbit calories={{ logged: 0, target: 2100 }} locale={locale} meals={{ kind: 'value', done: 0, target: 4 }} water={{ kind: 'value', done: 0, target: 2500 }} workout={{ kind: 'value', done: 0, target: 1 }} /></Cell>
        <Cell state="rest + unknown"><TodayOrbit calories={{ logged: 2080, target: 2100 }} locale={locale} meals={{ kind: 'value', done: 4, target: 4 }} water={{ kind: 'unknown' }} workout={{ kind: 'rest' }} /></Cell>
      </Row>

      <Row name="Empty, loading">
        <Cell state="empty">
          <EmptyState action={<Button>{tx(locale, 'ادامه راه‌اندازی', 'Continue setup')}</Button>} icon={<OrbitMark size={64} />} title={tx(locale, 'هنوز برنامه‌ای فعال نیست', 'No active plan')}>
            {tx(locale, 'راه‌اندازی را کامل کن تا برنامه ساخته شود.', 'Finish setup and the plan will be built.')}
          </EmptyState>
        </Cell>
        <Cell state="loading">
          <ContentCard className="state-matrix__skeleton"><Skeleton short /><Skeleton variant="title" /><Skeleton variant="card" /></ContentCard>
        </Cell>
      </Row>

      <Row name="Page template">
        <Cell state="header + section">
          <Page name="matrix">
            <PageHeader actions={<StatusPill tone="success">{tx(locale, 'هفته ۲ از ۴', 'Week 2 of 4')}</StatusPill>} description={tx(locale, 'وعده‌ها، تمرین و آب امروز.', 'Today’s meals, workout and water.')} eyebrow={tx(locale, 'سه‌شنبه', 'Tuesday')} title={tx(locale, 'امروز', 'Today')} />
            <SectionHeader meta={<conceptIcons.time size={16} />} title={tx(locale, 'وعدهٔ بعدی', 'Next meal')} />
          </Page>
        </Cell>
      </Row>
    </div>
  )
}

const meta = {
  title: 'Foundations/State matrix',
  parameters: {
    docs: { description: { component: 'Every component in every designed state. Use the toolbar for theme, language, text size and motion.' } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllStates: Story = {
  render: (_args, context) => <Matrix locale={(context.globals.locale as Locale) ?? 'fa'} />,
}
