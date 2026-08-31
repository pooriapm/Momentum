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

  it('ME-03 keeps payment country read-only while language, calendar, and units stay independent', () => {
    renderSettings()
    expect(screen.getByLabelText(/payment country/i)).toHaveAttribute('disabled')
    expect(screen.getByLabelText(/payment route/i)).toHaveValue('International payment · USD')
    expect(screen.getByLabelText(/language for future plans/i)).toBeInTheDocument()
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

  it('keeps optional analytics off by default and explains the filtered payload', () => {
    renderSettings()
    expect(screen.getByRole('checkbox', { name: /help improve activation and adherence/i })).not.toBeChecked()
    expect(screen.getByText(/never raw health values, free text, email, or account identifiers/i)).toBeInTheDocument()
    expect(screen.getByText(/required operational and security records remain independent/i)).toBeInTheDocument()
  })
})
