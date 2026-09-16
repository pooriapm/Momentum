import { fireEvent, render, screen } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { demoPlan } from '../../data/demo'
import { LandingPage } from './LandingPage'

describe('LandingPage product explanation', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('uses factual monthly sample copy and exposes four native FAQ disclosures', () => {
    render(<I18nProvider><LandingPage locale="en" /></I18nProvider>)
    expect(demoPlan.monthlyPlanBrief.en).toMatch(/sample monthly workout and nutrition plan/i)
    expect(demoPlan.monthlyPlanBrief.en).not.toMatch(/sleep|shortened/i)
    expect(document.querySelectorAll('.landing-faq details')).toHaveLength(4)
    const giftQuestion = screen.getByText('Is the first plan always gifted?')
    fireEvent.click(giftQuestion)
    expect(giftQuestion.closest('details')).toHaveAttribute('open')
    expect(screen.getByText(/only when campaign budget is available and reservation succeeds/i)).toBeInTheDocument()
    expect(screen.getByText(/lasts exactly 30 days/i)).toBeInTheDocument()
    expect(screen.getByText(/minimized planning context is sent to a provider only when you start managed generation/i)).toBeInTheDocument()
    expect(screen.getByText(/body report is optional, and its file is not analyzed automatically/i)).toBeInTheDocument()
    expect(screen.getByText(/free path, the prompt is transferred to an external tool only after you confirm/i)).toBeInTheDocument()
  })
})
