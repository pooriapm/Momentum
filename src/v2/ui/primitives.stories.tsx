import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sparkles } from 'lucide-react'
import { Button, ContentCard, Eyebrow, GlassChrome, PageSkeleton, StatusPill } from './primitives'
import './production-components.stories.css'

function isEnglish(locale: unknown) {
  return locale === 'en'
}

const meta = {
  title: 'Components/Primitives',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'The active Momentum primitives rendered with the production Orbit styles.',
      },
    },
  },
  args: {
    children: 'ادامه',
    variant: 'primary',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const ButtonPlayground: Story = {}

export const ButtonStates: Story = {
  render: (_args, context) => (
    <div className="storybook-stack">
      <Button icon={<Sparkles aria-hidden="true" size={18} />} variant="primary">{isEnglish(context.globals.locale) ? 'Start your path' : 'شروع مسیر'}</Button>
      <Button variant="secondary">{isEnglish(context.globals.locale) ? 'Preview' : 'پیش‌نمایش'}</Button>
      <Button variant="ghost">{isEnglish(context.globals.locale) ? 'Later' : 'بعداً'}</Button>
      <Button variant="danger">{isEnglish(context.globals.locale) ? 'Delete' : 'حذف'}</Button>
      <Button disabled>{isEnglish(context.globals.locale) ? 'Disabled' : 'غیرفعال'}</Button>
      <Button loading>{isEnglish(context.globals.locale) ? 'Saving' : 'در حال ذخیره'}</Button>
    </div>
  ),
}

export const StatusPills: Story = {
  render: (_args, context) => (
    <div className="storybook-stack">
      <StatusPill tone="brand">{isEnglish(context.globals.locale) ? 'Personal plan' : 'برنامه شخصی'}</StatusPill>
      <StatusPill tone="success">{isEnglish(context.globals.locale) ? 'Ready' : 'آماده'}</StatusPill>
      <StatusPill tone="energy">{isEnglish(context.globals.locale) ? 'Energy' : 'انرژی'}</StatusPill>
      <StatusPill tone="neutral">{isEnglish(context.globals.locale) ? 'Draft' : 'پیش‌نویس'}</StatusPill>
    </div>
  ),
}

export const Surfaces: Story = {
  render: (_args, context) => (
    <div className="storybook-grid">
      <ContentCard className="storybook-surface-demo">
        <h3>Content Card</h3>
        <p>{isEnglish(context.globals.locale) ? 'Primary surface for grouping product content.' : 'سطح اصلی برای گروه‌بندی محتوای محصول.'}</p>
      </ContentCard>
      <GlassChrome className="storybook-surface-demo">
        <h3>Glass Chrome</h3>
        <p>{isEnglish(context.globals.locale) ? 'Adaptive glass reserved for navigation and floating chrome.' : 'شیشه تطبیقی مخصوص ناوبری و لایه‌های شناور.'}</p>
      </GlassChrome>
    </div>
  ),
}

export const Eyebrows: Story = {
  render: (_args, context) => (
    <div className="storybook-stack">
      <Eyebrow><Sparkles aria-hidden="true" size={15} />{isEnglish(context.globals.locale) ? 'Built around your rhythm' : 'هماهنگ با ریتم زندگی تو'}</Eyebrow>
    </div>
  ),
}

export const LoadingSkeleton: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <PageSkeleton />,
}
