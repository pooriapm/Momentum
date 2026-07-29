import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
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
    vi.unstubAllGlobals()
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

  it('explains the prompt workflow and blocks home until a plan is selected', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))

    expect(
      screen.getByRole('heading', { name: 'فایل برنامه‌ات را آماده کن' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /دانلود پرامپت کامل Momentum/ }),
    ).toBeEnabled()
    expect(
      screen.getByText(
        'لازم نیست جای‌خالی‌ها را خودت پر کنی؛ ChatGPT همه اطلاعات ناقص را یک‌جا از تو می‌پرسد.',
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'استفاده از دمو' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'فایل یا دمو را انتخاب کن' }),
    ).toBeDisabled()
    expect(screen.queryByText('ورود دستی')).not.toBeInTheDocument()
  })

  it('shows progress and success while downloading the weekly template', async () => {
    let resolveRequest:
      | ((response: { ok: boolean; status: number; blob: () => Promise<Blob> }) => void)
      | undefined
    const fetchRequest = new Promise<{
      ok: boolean
      status: number
      blob: () => Promise<Blob>
    }>((resolve) => {
      resolveRequest = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => fetchRequest))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:momentum-template'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))

    const downloadButton = screen.getByRole('button', {
      name: /دانلود پرامپت کامل Momentum/,
    })
    fireEvent.click(downloadButton)

    expect(downloadButton).toBeDisabled()
    expect(
      screen.getByText('در حال دریافت تمپلیت؛ لطفاً منتظر بمانید…'),
    ).toBeInTheDocument()

    await act(async () => {
      resolveRequest?.({
        ok: true,
        status: 200,
        blob: async () => new Blob(['Momentum template']),
      })
      await fetchRequest
    })

    expect(
      await screen.findByText('دانلود تمپلیت با موفقیت شروع شد.'),
    ).toBeInTheDocument()
    expect(downloadButton).toBeEnabled()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })

  it('shows a retryable error when the template download fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'شروع مسیر' }))
    fireEvent.click(
      screen.getByRole('button', { name: /دانلود پرامپت کامل Momentum/ }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'دانلود انجام نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.',
    )
    expect(
      screen.getByRole('button', { name: /دانلود پرامپت کامل Momentum/ }),
    ).toBeEnabled()
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

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب این برنامه' }))
    fireEvent.click(screen.getByRole('button', { name: 'مرور برنامه' }))

    expect(
      screen.getByRole('heading', { name: 'خلاصه مسیر کاربر فایل' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ورود به خانه' }))

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
