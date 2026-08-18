import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { NumberStepper, Select, Textarea } from './FormControls'
import { LocalizedTimePicker } from './LocalizedTimePicker'
import './production-components.stories.css'

function OnboardingFieldsGallery({ locale }: { locale: 'fa' | 'en' }) {
  const english = locale === 'en'
  const [mealCount, setMealCount] = useState('3')
  const [mealPattern, setMealPattern] = useState('')
  const [optionCount, setOptionCount] = useState('3')
  const [trainingDays, setTrainingDays] = useState('0')
  const [duration, setDuration] = useState('60')
  const [startTime, setStartTime] = useState('18:30')

  return (
    <div className="mo-component-column mo-component-popover-stage">
      <Select
        label={english ? 'Preferred meal count' : 'تعداد وعده‌های دلخواه'}
        onChange={(event) => setMealCount(event.target.value)}
        required
        value={mealCount}
      >
        <option value="2">{english ? '2 meals' : '۲ وعده'}</option>
        <option value="3">{english ? '3 meals' : '۳ وعده'}</option>
        <option value="4">{english ? '4 meals' : '۴ وعده'}</option>
        <option value="5">{english ? '5 meals' : '۵ وعده'}</option>
        <option value="6">{english ? '6 meals' : '۶ وعده'}</option>
      </Select>
      <Textarea
        label={english ? 'Meal pattern' : 'الگوی وعده‌ها'}
        onChange={(event) => setMealPattern(event.target.value)}
        placeholder={english ? 'e.g. three main meals and a snack' : 'مثلاً سه وعده اصلی و یک میان‌وعده'}
        value={mealPattern}
      />
      <NumberStepper
        decreaseLabel={english ? 'Decrease' : 'کم کردن'}
        fallback={3}
        increaseLabel={english ? 'Increase' : 'زیاد کردن'}
        label={english ? 'Options per meal' : 'تعداد گزینه برای هر وعده'}
        locale={locale}
        max={4}
        min={1}
        onChange={setOptionCount}
        value={optionCount}
      />
      <NumberStepper
        decreaseLabel={english ? 'Decrease' : 'کم کردن'}
        fallback={0}
        increaseLabel={english ? 'Increase' : 'زیاد کردن'}
        label={english ? 'Training days per week' : 'روزهای تمرین در هفته'}
        locale={locale}
        max={7}
        min={0}
        onChange={setTrainingDays}
        required
        value={trainingDays}
      />
      {Number(trainingDays) > 0 ? (
        <Select
          label={english ? 'Session duration' : 'مدت هر تمرین'}
          onChange={(event) => setDuration(event.target.value)}
          required
          value={duration}
        >
          <option value="30">{english ? '30 minutes' : '۳۰ دقیقه'}</option>
          <option value="45">{english ? '45 minutes' : '۴۵ دقیقه'}</option>
          <option value="60">{english ? '60 minutes' : '۶۰ دقیقه'}</option>
          <option value="75">{english ? '75 minutes' : '۷۵ دقیقه'}</option>
          <option value="90">{english ? '90 minutes' : '۹۰ دقیقه'}</option>
          <option value="120">{english ? '120 minutes' : '۱۲۰ دقیقه'}</option>
        </Select>
      ) : null}
      <LocalizedTimePicker
        label={english ? 'Usual training start time' : 'ساعت معمول شروع تمرین'}
        locale={locale}
        onChange={setStartTime}
        required
        value={startTime}
      />
    </div>
  )
}

const meta = {
  title: 'Components/Onboarding fields',
  component: NumberStepper,
  args: {
    decreaseLabel: 'Decrease',
    increaseLabel: 'Increase',
    label: 'Training days per week',
    locale: 'en',
    max: 7,
    min: 0,
    onChange: () => undefined,
    value: '0',
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Reusable onboarding pickers: meal count, optional pattern, glass plus/minus steppers, duration dropdown, and 24-hour time.',
      },
    },
  },
} satisfies Meta<typeof NumberStepper>

export default meta
type Story = StoryObj<typeof meta>

export const FoodAndTrainingPickers: Story = {
  render: (_args, context) => <OnboardingFieldsGallery locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
