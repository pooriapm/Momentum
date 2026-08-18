import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { LocalizedTimePicker } from './LocalizedTimePicker'
import './production-components.stories.css'

function TimePickerGallery({ locale }: { locale: 'fa' | 'en' }) {
  const english = locale === 'en'
  const [startTime, setStartTime] = useState('18:30')

  return (
    <div className="mo-component-column mo-component-popover-stage">
      <LocalizedTimePicker
        label={english ? 'Usual training start time' : 'ساعت معمول شروع تمرین'}
        locale={locale}
        onChange={setStartTime}
        required
        value={startTime}
      />
      <LocalizedTimePicker
        error={english ? 'Choose a start time.' : 'ساعت شروع را انتخاب کن.'}
        label={english ? 'Required time' : 'ساعت الزامی'}
        locale={locale}
        onChange={() => undefined}
        required
        value=""
      />
    </div>
  )
}

const meta = {
  title: 'Components/Localized time picker',
  component: LocalizedTimePicker,
  args: {
    label: 'Usual training start time',
    locale: 'en',
    onChange: () => undefined,
    value: '18:30',
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: '24-hour glass time picker with hours and minutes only.',
      },
    },
  },
} satisfies Meta<typeof LocalizedTimePicker>

export default meta
type Story = StoryObj<typeof meta>

export const TwentyFourHourGlass: Story = {
  render: (_args, context) => <TimePickerGallery locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
