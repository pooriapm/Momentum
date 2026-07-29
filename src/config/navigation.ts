import {
  CalendarDays,
  ClipboardList,
  Settings,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { AppTab } from '../types/ui'

export interface NavigationItem {
  id: AppTab
  label: string
  icon: LucideIcon
}

export const APP_NAVIGATION: readonly NavigationItem[] = [
  { id: 'today', label: 'امروز', icon: ClipboardList },
  { id: 'meal-plan', label: 'برنامه غذایی', icon: UtensilsCrossed },
  { id: 'calendar', label: 'تقویم', icon: CalendarDays },
  { id: 'progress', label: 'پیشرفت', icon: TrendingUp },
  { id: 'settings', label: 'تنظیمات', icon: Settings },
] as const
