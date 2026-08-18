import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CountryCombobox } from './CountryCombobox'
import './production-components.stories.css'

function CountryGallery({ locale }: { locale: 'fa' | 'en' }) {
  const english = locale === 'en'
  const [country, setCountry] = useState('IR')

  return (
    <div className="mo-component-column mo-component-popover-stage">
      <CountryCombobox
        defaultOpen
        label={english ? 'Country of use' : 'کشور محل استفاده'}
        locale={locale}
        onChange={setCountry}
        suggested
        value={country}
      />
      <CountryCombobox
        error={english ? 'Choose a country to continue.' : 'برای ادامه یک کشور انتخاب کن.'}
        label={english ? 'Required country' : 'کشور الزامی'}
        locale={locale}
        onChange={() => undefined}
        value=""
      />
    </div>
  )
}

const meta = {
  title: 'Components/Country combobox',
  component: CountryCombobox,
  args: {
    label: 'Country or region',
    locale: 'en',
    onChange: () => undefined,
    value: 'IR',
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Localized country search returning an ISO country code. Open it to inspect search, selected, empty-result, and keyboard states.',
      },
    },
  },
} satisfies Meta<typeof CountryCombobox>

export default meta
type Story = StoryObj<typeof meta>

export const SuggestedAndError: Story = {
  render: (_args, context) => <CountryGallery locale={context.globals.locale === 'en' ? 'en' : 'fa'} />,
}
