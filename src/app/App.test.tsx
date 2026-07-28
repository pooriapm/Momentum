import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppState, saveAppState } from '../lib/storage/app-state'
import type { UserProfile, WeeklyMealPlan } from '../types/domain'
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

function loadImportPlan(): WeeklyMealPlan {
  const plan = JSON.parse(
    readFileSync(resolve('public/samples/momentum-week-example.json'), 'utf8'),
  ) as WeeklyMealPlan

  return {
    ...plan,
    schemaVersion: '0.1.0',
    profile: {
      name: 'کاربر فایل',
      age: 34,
      sex: 'prefer_not_to_say',
      heightCm: 168,
      currentWeightKg: 78,
      targetWeightKg: 72,
      startWeightKg: 80,
      goalDate: '2026-12-15',
      activityLevel: 'moderate',
    },
  }
}

describe('Momentum app', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('light')
  })

  it('shows onboarding on the first launch', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Momentum ریتم پایدار، پیشرفت واقعی',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'شروع مسیر' })).toBeInTheDocument()
  })

  it('offers template and upload before the manual profile fallback', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))

    expect(
      screen.getByRole('heading', { name: 'برنامه آماده داری؟' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /هنوز فایل نداری؟/ }),
    ).toHaveAttribute('href', '/templates/momentum-weekly-plan-prompt.md')

    fireEvent.click(
      screen.getByRole('button', { name: 'رد کردن و ورود دستی' }),
    )

    expect(
      screen.getByRole('heading', { name: 'اطلاعات پایه را وارد کن' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('نام')).toBeInTheDocument()
    expect(screen.getByLabelText('قد')).toBeInTheDocument()
    expect(screen.getByLabelText('وزن فعلی')).toBeInTheDocument()
    expect(screen.getByLabelText('وزن هدف')).toBeInTheDocument()
  })

  it('allows onboarding to finish without uploading a meal plan', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'رد کردن و ورود دستی' }),
    )
    fireEvent.change(screen.getByLabelText('نام'), {
      target: { value: 'کاربر نمونه' },
    })
    fireEvent.change(screen.getByLabelText('قد'), { target: { value: '۱۷۲' } })
    fireEvent.change(screen.getByLabelText('وزن فعلی'), {
      target: { value: '۸۱٫۵' },
    })
    fireEvent.change(screen.getByLabelText('وزن هدف'), {
      target: { value: '۷۵' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'مرور اطلاعات' }))
    fireEvent.click(screen.getByRole('button', { name: 'ورود به داشبورد' }))

    expect(await screen.findByText('سلام کاربر نمونه،')).toBeInTheDocument()
    const state = JSON.parse(localStorage.getItem('momentum.appState') ?? '{}')
    expect(state.plans).toEqual({})
    expect(state.profile.heightCm).toBe(172)
    expect(state.profile.currentWeightKg).toBe(81.5)
    expect(state.profile.startWeightKg).toBe(81.5)
  })

  it('creates both profile and plan from one uploaded file', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))
    await screen.findByText('فایل برنامه هفتگی JSON')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(
      [JSON.stringify(loadImportPlan())],
      'momentum-user-week.json',
      { type: 'application/json' },
    )

    fireEvent.change(input, { target: { files: [file] } })
    expect(
      await screen.findByText('دموی برنامه منعطف Momentum'),
    ).toBeInTheDocument()
    expect(screen.getByText('کاربر فایل · ۳۴ سال')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب این فایل' }))
    fireEvent.click(screen.getByRole('button', { name: 'استفاده از این فایل' }))

    expect(
      screen.getByRole('heading', { name: 'خلاصه مسیر کاربر فایل' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ورود به داشبورد' }))

    expect(await screen.findByText('سلام کاربر فایل،')).toBeInTheDocument()
    const state = JSON.parse(localStorage.getItem('momentum.appState') ?? '{}')
    expect(state.profile).toMatchObject({
      name: 'کاربر فایل',
      heightCm: 168,
      startWeightKg: 80,
      currentWeightKg: 78,
      targetWeightKg: 72,
      goalDate: '2026-12-15',
    })
    expect(Object.keys(state.plans)).toHaveLength(1)
  })

  it('renders the personalized dashboard from local state', async () => {
    saveAppState(createAppState(profile))
    render(<App />)

    expect(await screen.findByText('سلام کاربر نمونه،')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'حرکت امروزت، Momentum فرداست.',
      }),
    ).toBeInTheDocument()
  })

  it('switches sections and persists the selected tab', async () => {
    saveAppState(createAppState(profile))
    render(<App />)

    await screen.findByText('سلام کاربر نمونه،')
    fireEvent.click(screen.getAllByRole('button', { name: 'تنظیمات' })[0])

    expect(
      await screen.findByRole('heading', { name: 'اطلاعات کاربر نمونه' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('momentum.uiState')).toContain(
      '"selectedTab":"settings"',
    )
  })

  it('switches to the light theme', async () => {
    saveAppState(createAppState(profile))
    render(<App />)

    await screen.findByText('سلام کاربر نمونه،')
    fireEvent.click(screen.getAllByRole('button', { name: 'حالت روشن' })[0])

    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('momentum.uiState')).toContain('"theme":"light"')
  })

  it('clears all local copies only after two confirmations', async () => {
    saveAppState(createAppState(profile))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await screen.findByText('سلام کاربر نمونه،')
    fireEvent.click(screen.getAllByRole('button', { name: 'تنظیمات' })[0])
    fireEvent.click(
      await screen.findByRole('button', { name: 'پاک‌کردن همه اطلاعات' }),
    )

    expect(window.confirm).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem('momentum.appState')).toBeNull()
    expect(
      screen.getByRole('heading', {
        name: 'Momentum ریتم پایدار، پیشرفت واقعی',
      }),
    ).toBeInTheDocument()
  })
})
