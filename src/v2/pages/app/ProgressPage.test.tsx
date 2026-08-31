import { fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { demoPlan } from '../../data/demo'
import { ProgressPage } from './ProgressPage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)

function renderProgress(props: Partial<ComponentProps<typeof ProgressPage>> = {}) {
  return render(
    <I18nProvider>
      <ProgressPage locale="en" plan={demoPlan} preview {...props} />
    </I18nProvider>,
  )
}

describe('ProgressPage inventory states', () => {
  beforeEach(async () => {
    online.mockReturnValue(true)
    await i18n.changeLanguage('en')
  })

  it('PROG-01 shows the available monthly-plan segments and a bold weekly report CTA', () => {
    renderProgress()
    expect(screen.getByText(/week 4 of 5/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /save weekly report/i }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/current streak/i)).not.toBeInTheDocument()
  })

  it('supports the fifth two-day segment of a complete 30-day plan', () => {
    const fifthWeekPlan = {
      ...demoPlan,
      progress: {
        ...demoPlan.progress,
        weeklySeries: [
          ...(demoPlan.progress.weeklySeries ?? []).map((point) => ({ ...point, partial: false })),
          { week: 5, workoutsCompleted: 1, workoutsPlanned: 1, mealsCompleted: 6, mealsPlanned: 8, energy: 7.5, adherence: 78, partial: true },
        ],
      },
    }
    renderProgress({ plan: fifthWeekPlan })
    expect(screen.getByText(/week 5 of 5/i)).toBeInTheDocument()
    expect(screen.getByText(/week 5 · partial/i)).toBeInTheDocument()
  })

  it('PROG-02 keeps chart, text, and table alternatives of the same data', () => {
    renderProgress()
    fireEvent.click(screen.getByRole('button', { name: /text chart summary/i }))
    expect(screen.getByText(/adherence is week 1 62%/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view data table/i }))
    expect(screen.getByText(/this table contains exactly the chart data/i)).toBeInTheDocument()
    expect(screen.getByText(/week 4 · partial/i)).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /week 4 · partial 1 \/ 3 5 \/ 28 7 18%/i })).toBeInTheDocument()
  })

  it('PROG-03 is an empty state without judgment and with a weekly CTA', () => {
    renderProgress({
      plan: { ...demoPlan, progress: { ...demoPlan.progress, weeklyAdherence: 0, recentCheckIns: [], weeklySeries: undefined } },
      surface: 'empty',
    })
    expect(screen.getByRole('heading', { name: /no progress data yet/i })).toBeInTheDocument()
    expect(screen.queryByText(/failed|behind|streak/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start weekly report/i })).toBeInTheDocument()
  })

  it('PROG-04 shows a saved offline summary with last-sync time', () => {
    renderProgress({ surface: 'offline', lastSyncedAt: '2026-08-17T08:42:00.000Z' })
    expect(screen.getByText(/saved summary · last synced/i)).toBeInTheDocument()
  })

  it('PROG-05 and PROG-06 open the weekly report and keep the month unchanged', async () => {
    renderProgress()
    fireEvent.click(screen.getAllByRole('button', { name: /save weekly report/i })[0]!)
    expect(await screen.findByRole('heading', { name: 'Weekly check-in' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /save and calculate trend/i }))
    expect(await screen.findByText(/weekly check-in saved/i)).toBeInTheDocument()
    expect(screen.getAllByText(/this month’s plan is unchanged|your current plan continues unchanged|no ai was called/i).length).toBeGreaterThan(0)
  })

  it('PROG-07 informs gift users that checkout starts here', () => {
    renderProgress({ plan: { ...demoPlan, progress: { ...demoPlan.progress, entitlementStatus: 'gift', cycleEnding: true } } })
    expect(screen.getByRole('heading', { name: /the free month is ending/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start membership/i })).toHaveAttribute('href', '/en/pricing')
    expect(screen.getByLabelText(/note for next month/i)).toBeInTheDocument()
    expect(screen.getByText(/complete 30-day first-month plan/i)).toBeInTheDocument()
  })

  it('uses the account unit preference for weight without changing stored metric values', () => {
    renderProgress({ plan: { ...demoPlan, displayUnitSystem: 'us_customary' } })
    expect(screen.getByText(/160\.5 lb/i)).toBeInTheDocument()
    expect(demoPlan.progress.currentWeight).toBe(72.8)
  })
})
