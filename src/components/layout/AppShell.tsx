import { useEffect, useState, type ComponentType } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Moon,
  Settings,
  Sun,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { CalendarScreen } from '../../features/calendar/CalendarScreen'
import { TodayScreen } from '../../features/dashboard/TodayScreen'
import { MealPlanScreen } from '../../features/plans/MealPlanScreen'
import { SettingsScreen } from '../../features/settings/SettingsScreen'
import { EmptyScreen } from '../../features/shared/EmptyScreen'
import { formatJalaliDate, getTodayIso } from '../../lib/dates/jalali'
import { loadUiState, updateUiState } from '../../lib/ui-state'
import type { AppTab, Theme } from '../../types/ui'
import { OfflineNotice } from '../feedback/OfflineNotice'
import { Brand } from './Brand'

interface NavigationItem {
  id: AppTab
  label: string
  icon: ComponentType<LucideProps>
}

const navigation: NavigationItem[] = [
  { id: 'today', label: 'امروز', icon: ClipboardList },
  { id: 'meal-plan', label: 'برنامه غذایی', icon: UtensilsCrossed },
  { id: 'calendar', label: 'تقویم', icon: CalendarDays },
  { id: 'progress', label: 'پیشرفت', icon: TrendingUp },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
]

function ThemeButton({
  theme,
  onToggle,
  showLabel = false,
}: {
  theme: Theme
  onToggle: () => void
  showLabel?: boolean
}) {
  const Icon = theme === 'dark' ? Sun : Moon
  const label = theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'

  return (
    <button
      aria-label={label}
      className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      onClick={onToggle}
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
      {showLabel && <span>{label}</span>}
    </button>
  )
}

function MobileNavigation({
  selectedTab,
  onSelect,
}: {
  selectedTab: AppTab
  onSelect: (tab: AppTab) => void
}) {
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--page-background)_88%,transparent)] px-2 pt-2 backdrop-blur-2xl desktop:hidden"
      data-print-hidden="true"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = selectedTab === item.id

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold transition ${
                isActive
                  ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                  : 'text-[var(--text-muted)]'
              }`}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute inset-x-5 -top-2 h-0.5 rounded-full bg-[var(--emerald)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell() {
  const { appState } = useAppState()
  const [initialState] = useState(loadUiState)
  const [selectedTab, setSelectedTab] = useState<AppTab>(initialState.selectedTab)
  const [theme, setTheme] = useState<Theme>(initialState.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.style.colorScheme = theme
    updateUiState({ theme })
  }, [theme])

  if (!appState) {
    return null
  }

  const selectTab = (tab: AppTab) => {
    setSelectedTab(tab)
    updateUiState({ selectedTab: tab })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  return (
    <div className="min-h-screen">
      <OfflineNotice />
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-l border-[var(--border)] px-5 py-7 desktop:flex"
          data-print-hidden="true"
        >
          <Brand />
          <nav aria-label="ناوبری اصلی" className="mt-10 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = selectedTab === item.id

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                    isActive
                      ? 'bg-[var(--emerald-soft)] text-[var(--emerald)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-secondary)]'
                  }`}
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.label}
                  {isActive && <span className="mr-auto size-1.5 rounded-full bg-[var(--emerald)]" />}
                </button>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-[10px] font-bold text-[var(--gold)]">حریم خصوصی</p>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--text-secondary)]">
              همه داده‌ها فقط روی همین دستگاه می‌مانند
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--page-background)_82%,transparent)] px-4 py-3 backdrop-blur-2xl desktop:px-8 desktop:py-4"
            data-print-hidden="true"
          >
            <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4">
              <div className="desktop:hidden">
                <Brand />
              </div>
              <div className="hidden desktop:block">
                <p className="text-[11px] font-bold text-[var(--text-muted)]">
                  {appState.profile.name}
                </p>
                <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                  {formatJalaliDate(getTodayIso(), 'full')}
                </p>
              </div>
              <ThemeButton theme={theme} onToggle={toggleTheme} />
            </div>
          </header>

          <main className="mx-auto max-w-[1040px] px-4 pb-28 pt-5 desktop:px-8 desktop:pb-10 desktop:pt-8">
            {selectedTab === 'today' && <TodayScreen />}
            {selectedTab === 'meal-plan' && <MealPlanScreen />}
            {selectedTab === 'calendar' && <CalendarScreen />}
            {selectedTab === 'settings' && (
              <SettingsScreen
                theme={theme}
                themeControl={
                  <ThemeButton theme={theme} onToggle={toggleTheme} showLabel />
                }
              />
            )}
            {selectedTab === 'progress' && <EmptyScreen tab={selectedTab} />}
          </main>
        </div>
      </div>
      <MobileNavigation selectedTab={selectedTab} onSelect={selectTab} />
    </div>
  )
}
