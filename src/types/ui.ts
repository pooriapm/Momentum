export type AppTab = 'today' | 'meal-plan' | 'calendar' | 'progress' | 'settings'

export type Theme = 'dark' | 'light'

export interface UiState {
  selectedTab: AppTab
  theme: Theme
}
