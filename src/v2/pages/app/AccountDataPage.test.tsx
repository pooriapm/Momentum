import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { AccountDataPage } from './AccountDataPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

vi.mock('../../data/repository', async () => {
  const actual = await vi.importActual<typeof import('../../data/repository')>('../../data/repository')
  return {
    ...actual,
    exportAccountData: vi.fn(),
    deleteAccount: vi.fn(),
  }
})

const online = vi.mocked(useOnlineStatus)

describe('AccountDataPage inventory states', () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    await i18n.changeLanguage('en')
  })

  it('ME-06 moves export from request to pending, ready, and expired', async () => {
    render(
      <I18nProvider>
        <AccountDataPage locale="en" preview />
      </I18nProvider>,
    )
    expect(screen.queryByText(/private/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /request archive/i }))
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /link valid for 24 hours/i })).toBeInTheDocument()
  })

  it('ME-06 shows failure guidance that no data was deleted', () => {
    render(
      <I18nProvider>
        <AccountDataPage exportState="failed" locale="en" preview />
      </I18nProvider>,
    )
    expect(screen.getByText(/failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('ME-07 reviews consequences, confirms, and can complete or fail', async () => {
    render(
      <I18nProvider>
        <AccountDataPage locale="en" preview />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    expect(screen.getByRole('heading', { name: /account deletion cannot be undone/i })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('DELETE'), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /the account can no longer be accessed/i })).toBeInTheDocument()
    })
  })

  it('ME-07 keeps the account locked when deletion fails', () => {
    render(
      <I18nProvider>
        <AccountDataPage deleteState="failed" locale="en" preview />
      </I18nProvider>,
    )
    expect(screen.getByText(/del-err-09/i)).toBeInTheDocument()
  })
})
