import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'
import { userEvent, within } from 'storybook/test'
import { LocalizedStory } from '../../../.storybook/LocalizedStory'
import type { AppLocale } from '../../platform/i18n/catalog'
import { CheckInSheet } from '../../v2/components/CheckInSheet'
import { MealDetailSheet } from '../../v2/components/MealDetailSheet'
import { WeeklyCheckInSheet } from '../../v2/components/WeeklyCheckInSheet'
import { WorkoutLogger } from '../../v2/components/WorkoutLogger'
import { demoPlan } from '../../v2/data/demo'
import type { MealChoice } from '../../v2/data/types'
import { Button, ContentCard } from '../../v2/ui/primitives'
import '../app/app-stories.css'
import './operational-patterns.css'

function localeFromGlobal(value: unknown): AppLocale { return value === 'en' ? 'en' : 'fa' }

const trend = {
  current: { adherence_percent: 84, pain_score: 1.5, recovery_score: 3.8, training_difficulty_score: 3.2 },
  previous: { adherence_percent: 79, pain_score: 2.1, recovery_score: 3.4, training_difficulty_score: 3.6 },
  delta: { adherence_percent: 5, pain_score: -0.6, recovery_score: 0.4, training_difficulty_score: -0.4 },
  current_daily_count: 5, previous_daily_count: 6,
}

function Stage({ children, locale }: { children: ReactNode; locale: AppLocale }) {
  return <LocalizedStory locale={locale}><main className="mo-app-story mo-pattern-stage">{children}</main></LocalizedStory>
}

function Daily({ locale, safety = 'normal' }: { locale: AppLocale; safety?: 'normal' | 'caution' | 'urgent' }) {
  const [open, setOpen] = useState(true)
  return <Stage locale={locale}><ContentCard><h1>{locale === 'fa' ? 'چک‌این روزانه' : 'Daily check-in'}</h1><Button onClick={() => setOpen(true)}>{locale === 'fa' ? 'بازکردن' : 'Open'}</Button></ContentCard>{open ? <CheckInSheet locale={locale} onClose={() => setOpen(false)} onSave={async () => ({ safety: { level: safety, reasons: safety === 'normal' ? [] : ['storybook'] } })} /> : null}</Stage>
}

function Weekly({ locale, safety = 'normal' }: { locale: AppLocale; safety?: 'normal' | 'caution' | 'urgent' }) {
  const [open, setOpen] = useState(true)
  return <Stage locale={locale}><ContentCard><h1>{locale === 'fa' ? 'چک‌این هفتگی' : 'Weekly check-in'}</h1><Button onClick={() => setOpen(true)}>{locale === 'fa' ? 'بازکردن' : 'Open'}</Button></ContentCard>{open ? <WeeklyCheckInSheet locale={locale} onClose={() => setOpen(false)} onSave={async () => ({ checkin: { id: crypto.randomUUID(), week_start: '2026-08-10', updated_at: '2026-08-13T10:00:00.000Z', trend_summary: trend }, safety: { level: safety, reasons: safety === 'normal' ? [] : ['storybook'] } })} /> : null}</Stage>
}

function Meal({ locale }: { locale: AppLocale }) {
  const meal = demoPlan.meals.find((slot) => slot.id === 'lunch')!
  const choice = meal.options[0] as MealChoice
  return <Stage locale={locale}><MealDetailSheet choice={choice} locale={locale} mealLabel={meal.label[locale]} onClose={() => undefined} /></Stage>
}

function Workout({ locale, enabled = true }: { locale: AppLocale; enabled?: boolean }) {
  return <Stage locale={locale}><WorkoutLogger enabled={enabled} localDate={demoPlan.localDate!} locale={locale} preview workout={demoPlan.workout!} /></Stage>
}

const meta = {
  title: 'Patterns/Operational',
  parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Isolated, offline operational patterns for meals, check-ins, safety messaging, and workout execution.' } } },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const MealDetails: Story = { render: (_, c) => <Meal locale={localeFromGlobal(c.globals.locale)} /> }
export const DailyCheckIn: Story = { render: (_, c) => <Daily locale={localeFromGlobal(c.globals.locale)} /> }
export const DailyCheckInCautionResult: Story = {
  render: (_, c) => <Daily locale={localeFromGlobal(c.globals.locale)} safety="caution" />,
  play: async () => {
    const body = within(document.body)
    const sleep = body.getByLabelText(/خواب دیشب|Sleep last night/i)
    await userEvent.type(sleep, '7')
    await userEvent.click(body.getByRole('button', { name: /ثبت چک.این|Save check-in/i }))
  },
}
export const WeeklyCheckIn: Story = { render: (_, c) => <Weekly locale={localeFromGlobal(c.globals.locale)} /> }
export const WeeklyCheckInResult: Story = {
  render: (_, c) => <Weekly locale={localeFromGlobal(c.globals.locale)} />,
  play: async () => { await userEvent.click(within(document.body).getByRole('button', { name: /ثبت و محاسبه روند|Save and calculate trend/i })) },
}
export const WorkoutReady: Story = { render: (_, c) => <Workout locale={localeFromGlobal(c.globals.locale)} /> }
export const WorkoutInProgress: Story = {
  render: (_, c) => <Workout locale={localeFromGlobal(c.globals.locale)} />,
  play: async ({ canvasElement }) => { await userEvent.click(within(canvasElement).getByRole('button', { name: /شروع تمرین|Start workout/i })) },
}
export const WorkoutUnavailableOnDifferentDay: Story = { render: (_, c) => <Workout enabled={false} locale={localeFromGlobal(c.globals.locale)} /> }
