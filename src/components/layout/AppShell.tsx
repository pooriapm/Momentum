import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { APP_NAVIGATION } from '../../config/navigation'
import { TodayScreen } from '../../features/dashboard/TodayScreen'
import { EmptyScreen } from '../../features/shared/EmptyScreen'
import { formatJalaliDate, getTodayIso } from '../../lib/dates/jalali'
import { applyUiTheme, loadUiState, updateUiState } from '../../lib/ui-state'
import type { AppTab, Theme } from '../../types/ui'
import { OfflineNotice } from '../feedback/OfflineNotice'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Surface } from '../ui/Surface'
import { Brand } from './Brand'

const CalendarScreen = lazy(() =>
  import('../../features/calendar/CalendarScreen').then((module) => ({
    default: module.CalendarScreen,
  })),
)
const MealPlanScreen = lazy(() =>
  import('../../features/plans/MealPlanScreen').then((module) => ({
    default: module.MealPlanScreen,
  })),
)
const SettingsScreen = lazy(() =>
  import('../../features/settings/SettingsScreen').then((module) => ({
    default: module.SettingsScreen,
  })),
)

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

  if (showLabel) {
    return (
      <Button
        aria-label={label}
        onClick={onToggle}
        variant="secondary"
      >
        <Icon aria-hidden="true" size={18} />
        <span>{label}</span>
      </Button>
    )
  }

  return (
    <IconButton
      aria-label={label}
      className="border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
      onClick={onToggle}
    >
      <Icon aria-hidden="true" size={18} />
    </IconButton>
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
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-chrome)] px-2 pt-2 shadow-[var(--shadow-navigation)] backdrop-blur-2xl desktop:hidden"
      data-print-hidden="true"
    >
      <div
        className="mx-auto grid max-w-xl"
        style={{
          gridTemplateColumns: `repeat(${APP_NAVIGATION.length}, minmax(0, 1fr))`,
        }}
      >
        {APP_NAVIGATION.map((item) => {
          const Icon = item.icon
          const isActive = selectedTab === item.id

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold transition ${
                isActive
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute inset-x-5 -top-2 h-0.5 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function ScreenLoading() {
  return (
    <Surface
      aria-label="در حال آماده‌سازی صفحه"
      className="rounded-[26px] p-5 desktop:p-7"
      role="status"
    >
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-4 h-8 w-2/3 max-w-sm" />
      <div className="mt-7 grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton h-24" key={index} />
        ))}
      </div>
      <div className="skeleton mt-4 h-44 w-full" />
    </Surface>
  )
}

export function AppShell() {
  const { appState } = useAppState()
  const [initialState] = useState(loadUiState)
  const [selectedTab, setSelectedTab] = useState<AppTab>(initialState.selectedTab)
  const [theme, setTheme] = useState<Theme>(initialState.theme)

  useEffect(() => {
    applyUiTheme(theme)
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
  const screenByTab: Record<AppTab, ReactNode> = {
    today: <TodayScreen />,
    'meal-plan': <MealPlanScreen />,
    calendar: <CalendarScreen />,
    progress: <EmptyScreen tab="progress" />,
    settings: (
      <SettingsScreen
        theme={theme}
        themeControl={
          <ThemeButton theme={theme} onToggle={toggleTheme} showLabel />
        }
      />
    ),
  }

  return (
    <div className="min-h-screen">
      <OfflineNotice />
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-chrome)] px-5 py-7 backdrop-blur-2xl desktop:flex"
          data-print-hidden="true"
        >
          <Brand />
          <nav aria-label="ناوبری اصلی" className="mt-10 space-y-1.5">
            {APP_NAVIGATION.map((item) => {
              const Icon = item.icon
              const isActive = selectedTab === item.id

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                    isActive
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.label}
                  {isActive && <span className="mr-auto size-1.5 rounded-full bg-[var(--color-accent)]" />}
                </button>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-[10px] font-bold text-[var(--color-highlight)]">حریم خصوصی</p>
            <p className="mt-2 text-xs font-bold leading-5 text-[var(--color-text-secondary)]">
              همه داده‌ها فقط روی همین دستگاه می‌مانند
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-chrome)] px-4 py-3 backdrop-blur-2xl desktop:px-8 desktop:py-4"
            data-print-hidden="true"
          >
            <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4">
              <div className="desktop:hidden">
                <Brand />
              </div>
              <div className="hidden desktop:block">
                <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
                  {appState.profile.name}
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-text)]">
                  {formatJalaliDate(getTodayIso(), 'full')}
                </p>
              </div>
              <ThemeButton theme={theme} onToggle={toggleTheme} />
            </div>
          </header>

          <main className="mx-auto max-w-[1040px] px-4 pb-28 pt-5 desktop:px-8 desktop:pb-10 desktop:pt-8">
            <Suspense fallback={<ScreenLoading />}>
              <div className="screen-enter" key={selectedTab}>
                {screenByTab[selectedTab]}
              </div>
            </Suspense>
          </main>
        </div>
      </div>
      <MobileNavigation selectedTab={selectedTab} onSelect={selectTab} />
    </div>
  )
}
