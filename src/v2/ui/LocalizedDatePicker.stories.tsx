import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { LocalizedDatePicker } from './LocalizedDatePicker'
import './production-components.stories.css'

function DatePickerGallery({ locale }: { locale: 'fa' | 'en' }) {
  const english = locale === 'en'
  const [birthDate, setBirthDate] = useState('1990-03-21')
  const [reportDate, setReportDate] = useState('')

  return (
    <div className="mo-component-column mo-component-popover-stage">
      <LocalizedDatePicker
        label={english ? 'Date of birth' : 'تاریخ تولد'}
        locale={locale}
        onChange={setBirthDate}
        purpose="birth"
        value={birthDate}
      />
      <LocalizedDatePicker
        label={english ? 'Report date' : 'تاریخ گزارش'}
        locale={locale}
        onChange={setReportDate}
        purpose="report"
        value={reportDate}
      />
      <LocalizedDatePicker
        error={english ? 'Choose a valid date.' : 'یک تاریخ معتبر انتخاب کن.'}
        label={english ? 'Required date' : 'تاریخ الزامی'}
        locale={locale}
        onChange={() => undefined}
        value=""
      />
    </div>
  )
}

const meta = {
  title: 'Components/Localized date picker',
  component: LocalizedDatePicker,
  args: {
    label: 'Date of birth',
    locale: 'en',
    onChange: () => undefined,
    value: '1990-03-21',
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Jalali in Persian and Gregorian in English while preserving the same ISO date contract.',
      },
    },
  },
} satisfies Meta<typeof LocalizedDatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const BirthReportAndError: Story = {
  render: (_args, context) => <DatePickerGallery locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
