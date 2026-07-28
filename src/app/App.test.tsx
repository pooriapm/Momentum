import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppState, saveAppState } from '../lib/storage/app-state'
import type { UserProfile } from '../types/domain'
import App from './App'

const profile: UserProfile = {
  name: 'کاربر نمونه',
  startWeightKg: 82,
  currentWeightKg: 81,
  targetWeightKg: 75,
  heightCm: 172,
  journeyStartDate: '2026-08-01',
  goalDate: '2026-11-01',
}

describe('Momentum app', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('light')
  })

  it('shows onboarding on the first launch', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Momentum ریتم پایدار، پیشرفت واقعی' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'شروع مسیر' })).toBeInTheDocument()
  })

  it('allows onboarding to finish without uploading a meal plan', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'کاربر نمونه' } })
    fireEvent.change(screen.getByLabelText('قد'), { target: { value: '172' } })
    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))
    fireEvent.change(screen.getByLabelText('وزن شروع'), { target: { value: '82' } })
    fireEvent.change(screen.getByLabelText('وزن فعلی'), { target: { value: '81' } })
    fireEvent.change(screen.getByLabelText('وزن هدف'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))
    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))

    expect(screen.getByText('اختیاری')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'فایل هفتگی داری؟' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ادامه' }))
    fireEvent.click(screen.getByRole('button', { name: 'ورود به داشبورد' }))

    expect(screen.getByText('سلام کاربر نمونه،')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('momentum.appState') ?? '{}').plans).toEqual({})
  })

  it('renders the personalized dashboard from local state', () => {
    saveAppState(createAppState(profile))
    render(<App />)

    expect(screen.getByText('سلام کاربر نمونه،')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'حرکت امروزت، Momentum فرداست.' })).toBeInTheDocument()
  })

  it('switches sections and persists the selected tab', () => {
    saveAppState(createAppState(profile))
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'تنظیمات' })[0])

    expect(screen.getByRole('heading', { name: 'اطلاعات کاربر نمونه' })).toBeInTheDocument()
    expect(localStorage.getItem('momentum.uiState')).toContain('"selectedTab":"settings"')
  })

  it('switches to the light theme', () => {
    saveAppState(createAppState(profile))
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'حالت روشن' })[0])

    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('momentum.uiState')).toContain('"theme":"light"')
  })

  it('clears all local copies only after two confirmations', () => {
    saveAppState(createAppState(profile))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'تنظیمات' })[0])
    fireEvent.click(
      screen.getByRole('button', { name: 'پاک‌کردن همه اطلاعات' }),
    )

    expect(window.confirm).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem('momentum.appState')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Momentum ریتم پایدار، پیشرفت واقعی' }),
    ).toBeInTheDocument()
  })
})
