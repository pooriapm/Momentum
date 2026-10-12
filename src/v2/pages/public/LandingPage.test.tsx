import { fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('says what Momentum is and leads to sign-up and the sample', () => {
    render(<I18nProvider><LandingPage locale="en" /></I18nProvider>)
    expect(screen.getByRole('heading', { level: 1, name: /a month of meals and workouts, planned around you/i })).toBeInTheDocument()
    const start = screen.getAllByRole('link', { name: /build my plan/i })
    expect(start.length).toBeGreaterThan(0)
    expect(start[0]).toHaveAttribute('href', '/en/auth/sign-up')
    expect(screen.getAllByRole('link', { name: /see a sample/i })[0]).toHaveAttribute('href', '/en/app/today?preview=1')
    expect(screen.getByRole('img', { name: /sample of the momentum today screen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument()
  })

  it('explains the three steps and what the plan includes', () => {
    render(<I18nProvider><LandingPage locale="en" /></I18nProvider>)
    expect(screen.getByRole('heading', { name: /tell us about your life/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /get your thirty-day plan/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /follow it day by day/i })).toBeInTheDocument()
    expect(document.querySelectorAll('.land-step img')).toHaveLength(3)
    expect(document.querySelectorAll('.land-feature')).toHaveLength(6)
  })

  it('answers common questions in native disclosures without promising a gift or live payments', () => {
    render(<I18nProvider><LandingPage locale="en" /></I18nProvider>)
    expect(document.querySelectorAll('.land-faq details')).toHaveLength(5)
    const cost = screen.getByText('What does it cost?')
    fireEvent.click(cost)
    expect(cost.closest('details')).toHaveAttribute('open')
    expect(screen.getByText(/payments are not live in the current alpha/i)).toBeInTheDocument()
    expect(screen.queryByText(/always gifted|free first plan/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /see pricing/i })).toHaveAttribute('href', '/en/pricing')
    expect(screen.getByRole('link', { name: /safety boundary/i })).toHaveAttribute('href', '/en/safety')
  })

  it('renders the Persian copy with Persian digits in the preview', () => {
    render(<I18nProvider><LandingPage locale="fa" /></I18nProvider>)
    expect(screen.getByRole('heading', { level: 1, name: /یک ماه غذا و تمرین/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'برنامه‌ام را بساز' })[0]).toHaveAttribute('href', '/fa/auth/sign-up')
    expect(screen.getByText('روز ۱۲ از ۳۰')).toBeInTheDocument()
  })
})
