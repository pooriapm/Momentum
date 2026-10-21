import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  grantDays,
  loadIsAdmin,
  loadMember,
  loadPendingReceipts,
  reviewReceipt,
  searchMembers,
} from '../../data/admin'
import { AdminPage } from './AdminPage'

vi.mock('../../data/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/admin')>()),
  loadIsAdmin: vi.fn(async () => true),
  loadAdminOverview: vi.fn(async () => ({
    pending_receipts: 2, paying_members: 14, gift_members: 5, ending_within_5_days: 3,
    paid_last_30_days: 9, revenue_last_30_days_irr: 44_100_000, accounts: 40, waitlist: 6,
  })),
  loadPendingReceipts: vi.fn(async () => [{
    payment_id: '11111111-1111-4111-8111-111111111111', email: 'payer@example.com', amount_minor: 4_900_000,
    submitted_at: '2026-10-20T08:00:00Z', receipt_url: 'https://example.supabase.co/receipt.jpg',
  }]),
  loadReviewHistory: vi.fn(async () => [{
    payment_id: '22222222-2222-4222-8222-222222222222', email: 'old@example.com', amount_minor: 4_900_000,
    status: 'failed', failure_code: 'card_unreadable', submitted_at: '2026-10-18T08:00:00Z',
    reviewed_at: '2026-10-18T09:00:00Z', reviewer_email: 'admin@example.com',
  }]),
  reviewReceipt: vi.fn(async () => ({ rejected: true })),
  searchMembers: vi.fn(async () => [{ user_id: '33333333-3333-4333-8333-333333333333', email: 'member@example.com', created_at: '2026-09-01T00:00:00Z', country_code: 'IR', product_region: 'ir' }]),
  loadMember: vi.fn(async () => ({
    user_id: '33333333-3333-4333-8333-333333333333', email: 'member@example.com', created_at: '2026-09-01T00:00:00Z',
    last_sign_in_at: null, country_code: 'IR', product_region: 'ir', onboarding_status: 'completed', membership_interest_at: null,
    entitlements: [{ id: '44444444-4444-4444-8444-444444444444', source: 'gift', status: 'active', period_start: '2026-09-01T00:00:00Z', period_end: '2026-10-01T00:00:00Z' }],
    payments: [],
  })),
  grantDays: vi.fn(async () => ({ entitlement_id: '55555555-5555-4555-8555-555555555555', period_start: '2026-10-21T00:00:00Z', period_end: '2026-10-31T00:00:00Z' })),
  loadWaitlist: vi.fn(async () => []),
}))

function renderAdmin(initialTab?: 'receipts' | 'members') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AdminPage initialTab={initialTab} locale="en" /></QueryClientProvider>)
}

describe('admin panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('keeps everything hidden from accounts that are not admins', async () => {
    vi.mocked(loadIsAdmin).mockResolvedValueOnce(false)
    renderAdmin()
    expect(await screen.findByText('This page is for admins only.')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(loadPendingReceipts).not.toHaveBeenCalled()
  })

  it('shows what needs attention and opens the receipts from there', async () => {
    renderAdmin()
    expect(await screen.findByText('Active paying members')).toBeInTheDocument()
    expect(screen.getByText('4,410,000 toman')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /receipts to review/i }))
    expect(screen.getByRole('tab', { name: 'Receipts' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('payer@example.com')).toBeInTheDocument()
  })

  it('rejects a receipt with a reason and lists past reviews', async () => {
    renderAdmin('receipts')
    expect(await screen.findByText('Receipt is unreadable')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'not_received' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reject receipt' }))
    await waitFor(() => expect(reviewReceipt).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', false, 'not_received'))
    expect(await screen.findByText(/the member sees the reason/i)).toBeInTheDocument()
    expect(screen.queryByText('payer@example.com')).not.toBeInTheDocument()
  })

  it('finds a member and adds days with a note', async () => {
    renderAdmin('members')
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'mem' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(searchMembers).toHaveBeenCalledWith('mem'))
    fireEvent.click(await screen.findByRole('button', { name: /member@example.com/ }))
    await waitFor(() => expect(loadMember).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333'))
    expect(await screen.findByText('No active membership')).toBeInTheDocument()

    const form = screen.getByRole('heading', { name: 'Add membership days' }).closest('form')!
    const add = within(form).getByRole('button', { name: 'Add days' })
    expect(add).toBeDisabled()
    fireEvent.change(within(form).getByLabelText('Days (1–90)'), { target: { value: '10' } })
    fireEvent.change(within(form).getByLabelText('Note (why?)'), { target: { value: 'Bank delay' } })
    fireEvent.click(add)
    await waitFor(() => expect(grantDays).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333', 10, 'Bank delay'))
    expect(await screen.findByText(/10 days added/)).toBeInTheDocument()
  })
})
