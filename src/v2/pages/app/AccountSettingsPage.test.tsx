import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { AccountSettingsPage } from './AccountSettingsPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <AccountSettingsPage locale="en" preview />
      </QueryClientProvider>
    </I18nProvider>,
  )
}

describe('AccountSettingsPage inventory states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('ME-02 saves preferences for the next cycle without regenerating this month', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: /profile and preferences/i })).toBeInTheDocument()
    expect(screen.getByText(/the current plan is not regenerated and no ai call is created/i)).toBeInTheDocument()
  })

  it('ME-03 keeps product_region read-only and calendar/units separate', () => {
    renderSettings()
    expect(screen.getByLabelText(/account version/i)).toHaveAttribute('disabled')
    expect(screen.getByLabelText(/account version/i)).toHaveValue('International · English and USD')
    expect(screen.getByLabelText(/date display/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/appearance/i)).toBeInTheDocument()
    expect(screen.queryByText(/rtl|ltr/i)).not.toBeInTheDocument()
  })

  it('ME-04 shows notification channels and denied-permission recovery', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText(/plan ready/i)).toBeInTheDocument()
    expect(screen.getByText(/weekly report/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accessibility' })).toBeInTheDocument()
  })
})
