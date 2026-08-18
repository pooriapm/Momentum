import { lazy, Suspense, type ReactNode } from 'react'

export const CheckInSheet = lazy(async () => ({ default: (await import('./CheckInSheet')).CheckInSheet }))
export const MealDetailSheet = lazy(async () => ({ default: (await import('./MealDetailSheet')).MealDetailSheet }))
export const WeeklyCheckInSheet = lazy(async () => ({ default: (await import('./WeeklyCheckInSheet')).WeeklyCheckInSheet }))
export const WorkoutDetailSheet = lazy(async () => ({ default: (await import('./WorkoutDetailSheet')).WorkoutDetailSheet }))
export const PlanSubstitutionSheet = lazy(async () => ({ default: (await import('./WorkoutDetailSheet')).PlanSubstitutionSheet }))

export function LazyOverlay({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
