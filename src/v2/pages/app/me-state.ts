import type { AppLocale } from '../../../platform/i18n/catalog'
import type { MomentumPlanView } from '../../data/types'

export type MembershipStatus = 'gift' | 'active' | 'pending' | 'expired' | 'none'
export type MePanel = 'hub' | 'subscription' | 'help'
export type ExportStatus = 'idle' | 'pending' | 'ready' | 'expired' | 'failed'
export type DeleteStatus = 'idle' | 'review' | 'pending' | 'complete' | 'failed'
export type SignOutScope = 'local' | 'global'

export const EXPORT_TTL_MS = 24 * 60 * 60 * 1000
export const NEXT_CYCLE_NOTE_MAX = 500
export const NEXT_CYCLE_NOTE_SOFT = 400
export const NEXT_CYCLE_NOTE_KEY = 'momentum.progress.nextCycleNote'
export const ME_PREFS_KEY = 'momentum.me.preferences'

export interface MePreferences {
  calendar: 'jalali' | 'gregorian'
  weekStart: 'saturday' | 'monday' | 'sunday'
  reduceMotion: 'system' | 'on' | 'off'
  reduceTransparency: 'system' | 'on' | 'off'
  notifications: {
    planReady: boolean
    weeklyReport: boolean
    workoutReminder: boolean
    dailyCheckIn: boolean
  }
}

export const defaultMePreferences: MePreferences = {
  calendar: 'gregorian',
  weekStart: 'monday',
  reduceMotion: 'system',
  reduceTransparency: 'system',
  notifications: {
    planReady: true,
    weeklyReport: true,
    workoutReminder: true,
    dailyCheckIn: false,
  },
}

export function deriveMembershipStatus(plan: MomentumPlanView | null): MembershipStatus {
  if (plan?.progress.entitlementStatus) return plan.progress.entitlementStatus
  const label = plan?.progress.entitlementLabel?.en?.toLowerCase() ?? ''
  if (label.includes('gift')) return 'gift'
  if (plan?.progress.entitlementLabel) return 'active'
  return 'none'
}

export function membershipCopy(status: MembershipStatus, locale: AppLocale) {
  const fa = locale === 'fa'
  if (status === 'gift') {
    return {
      label: fa ? 'هدیه برنامه اول' : 'First-plan gift',
      detail: fa ? 'یک برنامه ماهانه · برای ماه بعد عضویت لازم است' : 'One monthly plan · membership is needed for next month',
    }
  }
  if (status === 'pending') {
    return {
      label: fa ? 'پرداخت در انتظار تأیید' : 'Payment pending',
      detail: fa ? 'ساخت برنامه جدید شروع نمی‌شود تا پرداخت بازیابی شود' : 'A new plan will not start until payment is recovered',
    }
  }
  if (status === 'expired') {
    return {
      label: fa ? 'منقضی یا لغوشده' : 'Cancelled or expired',
      detail: fa ? 'تاریخچه خواندنی است؛ چرخه بعد ساخته نمی‌شود' : 'History stays readable; the next cycle is blocked',
    }
  }
  if (status === 'none') {
    return {
      label: fa ? 'بدون عضویت' : 'No membership',
      detail: fa ? 'یک اشتراک Momentum' : 'One Momentum membership',
    }
  }
  return {
    label: fa ? 'عضویت Momentum' : 'Momentum membership',
    detail: fa ? 'یک اشتراک ماهانه · یک برنامه کامل در هر چرخه' : 'One monthly subscription · one complete plan each cycle',
  }
}

export function isExportExpired(readyAt: number | undefined, now = Date.now(), ttlMs = EXPORT_TTL_MS) {
  if (!readyAt) return false
  return now - readyAt >= ttlMs
}

export function deriveExportStatus(input: { status: ExportStatus; readyAt?: number; now?: number; ttlMs?: number }): ExportStatus {
  if (input.status === 'ready' && isExportExpired(input.readyAt, input.now, input.ttlMs)) return 'expired'
  return input.status
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported' as const
  return Notification.permission
}

export function readMePreferences(): MePreferences {
  try {
    const raw = localStorage.getItem(ME_PREFS_KEY)
    if (!raw) return { ...defaultMePreferences, notifications: { ...defaultMePreferences.notifications } }
    const parsed = JSON.parse(raw) as Partial<MePreferences>
    return {
      calendar: parsed.calendar === 'jalali' ? 'jalali' : 'gregorian',
      weekStart: parsed.weekStart === 'saturday' || parsed.weekStart === 'sunday' ? parsed.weekStart : 'monday',
      reduceMotion: parsed.reduceMotion === 'on' || parsed.reduceMotion === 'off' ? parsed.reduceMotion : 'system',
      reduceTransparency: parsed.reduceTransparency === 'on' || parsed.reduceTransparency === 'off' ? parsed.reduceTransparency : 'system',
      notifications: {
        planReady: parsed.notifications?.planReady ?? true,
        weeklyReport: parsed.notifications?.weeklyReport ?? true,
        workoutReminder: parsed.notifications?.workoutReminder ?? true,
        dailyCheckIn: parsed.notifications?.dailyCheckIn ?? false,
      },
    }
  } catch {
    return { ...defaultMePreferences, notifications: { ...defaultMePreferences.notifications } }
  }
}

export function writeMePreferences(value: MePreferences) {
  try {
    localStorage.setItem(ME_PREFS_KEY, JSON.stringify(value))
  } catch {
    /* private mode */
  }
}

export function readNextCycleNote() {
  try {
    return sessionStorage.getItem(NEXT_CYCLE_NOTE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeNextCycleNote(value: string) {
  try {
    sessionStorage.setItem(NEXT_CYCLE_NOTE_KEY, value.slice(0, NEXT_CYCLE_NOTE_MAX))
  } catch {
    /* private mode */
  }
}

export function productVersionCopy(region: 'ir' | 'intl' | undefined, locale: AppLocale) {
  const resolved = region ?? (locale === 'fa' ? 'ir' : 'intl')
  if (resolved === 'ir') {
    return locale === 'fa' ? 'ایران · فارسی و ریال' : 'Iran · Persian and IRR'
  }
  return locale === 'fa' ? 'بین‌المللی · انگلیسی و دلار' : 'International · English and USD'
}
