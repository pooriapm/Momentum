import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Input, NumberStepper, Select, Textarea } from './FormControls'
import './production-components.stories.css'

function FormControlGallery({ locale }: { locale: 'fa' | 'en' }) {
  const english = locale === 'en'
  const [name, setName] = useState(english ? 'Alex Morgan' : 'پوریا مقدم')
  const [goal, setGoal] = useState(english ? 'fat_loss' : 'fat_loss')
  const [notes, setNotes] = useState('')
  const [optionCount, setOptionCount] = useState('3')
  const [trainingDays, setTrainingDays] = useState('3')

  return (
    <div className="mo-component-column mo-component-popover-stage">
      <Input
        label={english ? 'Display name' : 'نام نمایشی'}
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <Input
        hint={english ? 'We use this only to personalize your plan.' : 'فقط برای شخصی‌سازی برنامه استفاده می‌شود.'}
        label={english ? 'Email' : 'ایمیل'}
        placeholder="name@example.com"
        type="email"
      />
      <Input
        error={english ? 'Enter a valid email address.' : 'یک ایمیل معتبر وارد کن.'}
        label={english ? 'Email · error' : 'ایمیل · خطا'}
        value="not-an-email"
        readOnly
      />
      <Input disabled label={english ? 'Invite code · disabled' : 'کد دعوت · غیرفعال'} value="MOMENTUM" />
      <Select
        defaultOpen
        hint={english ? 'You can change this later.' : 'بعداً قابل تغییر است.'}
        label={english ? 'Primary goal' : 'هدف اصلی'}
        onChange={(event) => setGoal(event.target.value)}
        value={goal}
      >
        <option value="fat_loss">{english ? 'Fat loss' : 'کاهش چربی'}</option>
        <option value="muscle_gain">{english ? 'Muscle gain' : 'افزایش عضله'}</option>
        <option value="maintenance">{english ? 'Maintain and improve performance' : 'حفظ و بهبود عملکرد'}</option>
      </Select>
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
      <Textarea
        hint={english ? 'Avoid including medical records.' : 'اطلاعات پزشکی حساس را وارد نکن.'}
        label={english ? 'Anything else?' : 'نکته دیگری هست؟'}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={english ? 'Optional context…' : 'توضیحات اختیاری…'}
        value={notes}
      />
    </div>
  )
}

const meta = {
  title: 'Components/Form controls',
  component: Input,
  args: {
    label: 'Display name',
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production form controls with label, hint, error, disabled, and interactive states.',
      },
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const InputSelectTextarea: Story = {
  render: (_args, context) => <FormControlGallery locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
