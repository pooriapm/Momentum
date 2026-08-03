import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('../platform/config/runtime', () => ({
  runtimeConfig: {
    appEnvironment: 'test',
    hasSupabase: true,
    supabasePublishableKey: 'test-publishable-key',
    supabaseUrl: 'https://test.supabase.co',
  },
}))

describe('Momentum public product', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/fa')
    localStorage.clear()
  })

  it('renders the new Persian landing experience', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /هر روز، Momentum می‌داند/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'برنامه‌ام را بساز' })[0]).toHaveAttribute('href', '/fa/auth/sign-up')
    expect(screen.getAllByText(/General wellness/).length).toBeGreaterThan(0)
  })

  it('renders the English route in LTR', async () => {
    window.history.replaceState({}, '', '/en')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /Momentum always knows/ })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
  })

  it('keeps the product preview in memory and does not create local business state', async () => {
    window.history.replaceState({}, '', '/fa/app/today?preview=1')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'صبح بخیر، آوا' })).toBeInTheDocument()
    expect(screen.getByText(/Preview حافظه‌ای/)).toBeInTheDocument()
    expect(localStorage.getItem('momentum.appState')).toBeNull()
  })

  it('enables account creation when cloud configuration is present', async () => {
    window.history.replaceState({}, '', '/fa/auth/sign-up')
    render(<App />)

    expect(await screen.findByRole('button', { name: 'ساخت حساب امن' })).toBeEnabled()
    expect(screen.queryByText(/سرویس ابری این نسخه هنوز تنظیم نشده/)).not.toBeInTheDocument()
  })

  it('exposes transparent pricing and the Iran launch restriction', async () => {
    window.history.replaceState({}, '', '/fa/pricing')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'به اندازه‌ی همراهی‌ای که نیاز داری' })).toBeInTheDocument()
    expect(screen.getByText(/فروش قابلیت AI تا رفع محدودیت سرویس‌دهنده غیرفعال/)).toBeInTheDocument()
  })
})
