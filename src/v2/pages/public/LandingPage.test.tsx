import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('tells the monthly Momentum story without a product preview or FAQ', () => {
    render(<I18nProvider><LandingPage locale="en" /></I18nProvider>)
    expect(screen.getByRole('heading', { level: 1, name: /momentum starts with this month/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /the month is built around your life/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /you don’t start from zero/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /start this month/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /back to top/i })).toBeInTheDocument()
    expect(document.querySelectorAll('.land-frame img')).toHaveLength(3)
    expect(document.querySelector('.product-preview')).toBeNull()
    expect(document.querySelector('.landing-faq')).toBeNull()
    expect(screen.queryByText(/quiet/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/is the first plan always gifted/i)).not.toBeInTheDocument()
  })
})
