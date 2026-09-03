import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import { I18nProvider } from '../../../platform/i18n/I18nProvider'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { loadPricingContext } from '../../data/pricing'
import {
  completeOnboarding,
  deleteOnboardingDraft,
  discardBodyReport,
  loadOnboardingDraft,
  requestPlanGeneration,
  saveOnboardingDraft,
} from '../../onboarding/repository'
import type { OnboardingStepKey } from '../../onboarding/schema'
import { OnboardingPage } from './OnboardingPage'
import { OnboardingResumePage } from './OnboardingResumePage'

vi.mock('../../../platform/pwa/network', () => ({
  useOnlineStatus: vi.fn(() => true),
  assertOnline: vi.fn(),
}))

vi.mock('../../data/pricing', () => ({
  loadPricingContext: vi.fn(),
}))

vi.mock('../../onboarding/repository', () => ({
  loadOnboardingDraft: vi.fn(),
  saveOnboardingDraft: vi.fn(),
  completeOnboarding: vi.fn(),
  deleteOnboardingDraft: vi.fn(),
  discardBodyReport: vi.fn(),
  requestPlanGeneration: vi.fn(),
  uploadBodyReport: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)
const loadDraft = vi.mocked(loadOnboardingDraft)
const saveDraft = vi.mocked(saveOnboardingDraft)
const complete = vi.mocked(completeOnboarding)
const generate = vi.mocked(requestPlanGeneration)
const discardReport = vi.mocked(discardBodyReport)
const pricing = vi.mocked(loadPricingContext)

const user = {
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-08-10T08:00:00.000Z',
  email: 'sara@example.com',
  id: '2f02a069-5294-4dee-92dc-2ecfe077902b',
  user_metadata: { name: 'Sara' },
} as User

const auth: AuthContextValue = {
  isConfigured: true,
  requestPasswordReset: vi.fn(),
  resendConfirmation: vi.fn(),
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  status: 'authenticated',
  updatePassword: vi.fn(),
  user,
}

const completeDraft: Record<string, string> = {
  adultConfirmed: 'yes',
  allergies: 'peanut',
  birthDate: '1992-05-18',
  cookingConstraints: '30 minutes',
  country: 'IR',
  dietStyle: 'omnivore',
  eatingDisorderHistory: 'no',
  favoriteFoods: 'chicken, yogurt',
  firstName: 'Sara',
  foodBudget: 'standard',
  goalType: 'fat_loss',
  groceryPreferences: 'weekly shop',
  healthDataConsent: 'yes',
  heightCm: '168',
  highRiskCondition: 'no',
  injuryLimitation: 'no',
  pregnancyOrBreastfeeding: 'no',
  planSource: 'momentum',
  preferredOptionCount: '3',
  primaryActivity: 'strength',
  privacyAccepted: 'yes',
  requestedMealCount: '3',
  requestedMealPattern: '3 meals',
  restaurantMealsPerWeek: '0',
  sex: 'female',
  targetWeightKg: '64',
  termsAccepted: 'yes',
  trainingAvailability: 'evenings',
  trainingDays: '3',
  trainingDuration: '60',
  trainingDurationPreset: '60',
  trainingExperience: 'intermediate',
  trainingLocation: 'home',
  trainingStartTime: '18:30',
  trainingWeekdays: '1,3,5',
  urgentSymptoms: 'no',
  weightKg: '72.4',
  workSchedule: 'weekdays',
}

function renderStep(step: OnboardingStepKey, values: Record<string, string> = completeDraft) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  loadDraft.mockResolvedValue({ currentStep: step, values })
  return render(
    <I18nProvider>
      <AuthContext.Provider value={auth}>
        <QueryClientProvider client={client}>
          <OnboardingPage locale="en" step={step} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </I18nProvider>,
  )
}

describe('OnboardingPage inventory states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    online.mockReturnValue(true)
    saveDraft.mockResolvedValue(undefined)
    discardReport.mockReset()
    discardReport.mockResolvedValue(undefined)
    complete.mockResolvedValue({
      automation_block_reason: null,
      country_code: 'IR',
      goal_id: '513bc02f-9b72-42f7-b518-ab2542f4cb08',
      status: 'complete',
    })
    vi.mocked(deleteOnboardingDraft).mockResolvedValue(undefined)
    pricing.mockResolvedValue({
      ai_service_available: true,
      authoritative_for_checkout: false,
      country: 'IR',
      gift_campaign: { status: 'available' },
      prices: [],
      source: 'fallback',
      suggested_cuisine_region: 'iran',
      suggested_currency: 'IRR',
      suggested_locale: 'fa-IR',
      suggested_market: 'ir',
      suggested_product_region: 'ir',
    })
  })

  it('ONB-03 keeps adult gate, sex, and Iran on Basics in D11 order', async () => {
    renderStep('basics')
    expect(await screen.findByRole('heading', { name: 'About you' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Setup progress' })).toBeInTheDocument()
    expect(screen.getByLabelText('I confirm I am 18 or older')).toBeInTheDocument()
    expect(screen.getByLabelText(/sex used for physiological calculations/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Country of use' })).toBeInTheDocument()
  })

  it('ONB-04 names the under-18 boundary without leaving Basics', async () => {
    renderStep('basics', { ...completeDraft, birthDate: '2012-05-18', adultConfirmed: 'yes' })
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/you must be at least 18/i)).toBeInTheDocument()
    expect(saveDraft).not.toHaveBeenCalled()
  })

  it('ONB-10 shows a non-medical eligible result after Health screening', async () => {
    renderStep('health')
    expect(await screen.findByText('Your answers do not block automatic planning')).toBeInTheDocument()
    expect(screen.getByText(/not medical clearance or diagnosis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('ONB-11 stops after an automated-plan block and does not continue collection', async () => {
    renderStep('health', { ...completeDraft, highRiskCondition: 'yes' })
    expect(await screen.findByRole('heading', { name: /automatic planning is unavailable/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Save and exit' })).toHaveAttribute('href', '/en/app/today')
    expect(screen.getByRole('link', { name: 'View safety guidance' })).toHaveAttribute('href', '/en/safety')
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    expect(screen.getByText(/not medical care, diagnosis, or treatment/i)).toBeInTheDocument()
  })

  it('ONB-12 keeps an urgent-help boundary and a safe exit', async () => {
    renderStep('health', { ...completeDraft, urgentSymptoms: 'yes' })
    expect(await screen.findByRole('heading', { name: /get urgent help before continuing/i })).toBeInTheDocument()
    expect(screen.getByText(/contact local emergency services/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('ONB-13 and ONB-14 use catalog allergen chips and block unmapped Other', async () => {
    renderStep('food', { ...completeDraft, allergies: 'peanut,other' })
    expect(await screen.findByText('Peanut')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.queryByLabelText(/allergies & intolerances/i)).not.toBeInTheDocument()
    expect(screen.getByText(/other is not mapped to the catalog/i)).toBeInTheDocument()
  })

  it('ONB-29 requires one clearly selected plan path before continuing', async () => {
    renderStep('plan-source', { ...completeDraft, planSource: '' })
    const external = await screen.findByRole('radio', { name: /use my own plan/i })
    const managed = screen.getByRole('radio', { name: /create my plan/i })
    const continueButton = screen.getByRole('button', { name: 'Continue' })

    expect(external).not.toBeChecked()
    expect(managed).not.toBeChecked()
    expect(continueButton).toBeDisabled()
    expect(screen.getByText('Choose one option to continue.')).toBeInTheDocument()
    expect(screen.getByText(/First-plan gift when campaign budget remains/i)).toBeInTheDocument()

    fireEvent.click(external)
    expect(external).toBeChecked()
    expect(managed).not.toBeChecked()
    expect(continueButton).toBeEnabled()
    expect(screen.getByText('Selected: Use my own plan')).toBeInTheDocument()

    fireEvent.click(managed)
    expect(external).not.toBeChecked()
    expect(managed).toBeChecked()
    expect(screen.getByText('Selected: Create my plan')).toBeInTheDocument()

    fireEvent.click(continueButton)
    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalledWith(
        user.id,
        'goal',
        expect.objectContaining({ planSource: 'momentum' }),
      )
    })
  })

  it('ONB-29 persists plan source on Back and shows membership copy when gift is exhausted', async () => {
    pricing.mockResolvedValue({
      ai_service_available: true,
      authoritative_for_checkout: false,
      country: 'IR',
      gift_campaign: { status: 'exhausted' },
      prices: [],
      source: 'fallback',
      suggested_cuisine_region: 'iran',
      suggested_currency: 'IRR',
      suggested_locale: 'fa-IR',
      suggested_market: 'ir',
      suggested_product_region: 'ir',
    })
    renderStep('plan-source', { ...completeDraft, planSource: 'external' })
    expect(await screen.findByText(/Gift unavailable · Membership required/i)).toBeInTheDocument()
    expect(screen.getByText(/change it with Back before you finish setup/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalledWith(
        user.id,
        'consent',
        expect.objectContaining({ planSource: 'external' }),
      )
    })
  })

  it('ONB-29 resumes a saved plan-source selection from the draft', async () => {
    renderStep('plan-source', { ...completeDraft, planSource: 'momentum' })
    const managed = await screen.findByRole('radio', { name: /create my plan/i })
    expect(managed).toBeChecked()
    expect(screen.getByRole('radio', { name: /use my own plan/i })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(screen.getByText('Selected: Create my plan')).toBeInTheDocument()
  })

  it('review edit links include plan source', async () => {
    renderStep('review', { ...completeDraft, bodySkipped: 'yes', bodyReportPath: '' })
    expect(await screen.findByText('How your plan is created')).toBeInTheDocument()
    expect(screen.getByText('Create my plan')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute('href', '/en/onboarding/plan-source')
  })

  it('changes options per meal only with plus and minus between 1 and 4', async () => {
    renderStep('food')
    expect(await screen.findByRole('spinbutton', { name: 'Options per meal' })).toHaveAttribute('aria-valuenow', '3')
    expect(screen.queryByRole('textbox', { name: 'Options per meal' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(screen.getByRole('spinbutton', { name: 'Options per meal' })).toHaveAttribute('aria-valuenow', '4')
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(screen.getByRole('spinbutton', { name: 'Options per meal' })).toHaveAttribute('aria-valuenow', '3')
  })

  it('ONB-17 hides equipment for outdoor training', async () => {
    renderStep('training', { ...completeDraft, trainingLocation: 'outdoor', equipment: '' })
    expect(await screen.findByText(/equipment input is hidden/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Available equipment')).not.toBeInTheDocument()
  })

  it('steps training days from 0 to 7 and uses a duration dropdown', async () => {
    renderStep('training', { ...completeDraft, trainingDays: '0', trainingDurationPreset: 'custom', trainingDuration: '' })
    expect(await screen.findByRole('spinbutton', { name: 'Training days per week' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.queryByRole('combobox', { name: 'Session duration' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Custom duration (minutes)')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(screen.getByRole('spinbutton', { name: 'Training days per week' })).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('combobox', { name: 'Session duration' })).toBeInTheDocument()
  })

  it('ONB-21 lets Body be skipped without an AI analysis claim', async () => {
    renderStep('body', { ...completeDraft, bodySkipped: '', bodyReportPath: '' })
    expect(await screen.findByText(/never uses a separate ai call/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeInTheDocument()
  })

  it('keeps a private report attached when deletion cannot be confirmed', async () => {
    discardReport.mockRejectedValueOnce(new Error('storage unavailable'))
    renderStep('body', {
      ...completeDraft,
      bodyReportId: '31313131-3131-4131-8131-313131313131',
      bodyReportPath: `${user.id}/body-report.pdf`,
      bodySource: 'report',
      bodySkipped: '',
    })
    fireEvent.click(await screen.findByRole('button', { name: /remove file/i }))
    expect(await screen.findByText(/file was not removed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove file/i })).toBeInTheDocument()
    expect(discardReport).toHaveBeenCalledWith(
      user.id,
      '31313131-3131-4131-8131-313131313131',
      `${user.id}/body-report.pdf`,
    )
  })

  it('ONB-27 and ONB-28 finish into the lifecycle gate without generating a plan', async () => {
    renderStep('review')
    expect(await screen.findByRole('button', { name: 'Confirm and continue' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'One month free' })).toBeInTheDocument()
    expect(screen.getByText(/no card and no charge/i)).toBeInTheDocument()
    expect(screen.getByText('No payment details')).toBeInTheDocument()
    expect(screen.queryByText(/add a payment method/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/authoritative source/i)).not.toBeInTheDocument()
    expect(screen.getByText(/one month free/i)).toBeInTheDocument()
    expect(screen.queryByText(/iranian version/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate my plan/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and continue' }))
    await waitFor(() => expect(complete).toHaveBeenCalled())
    expect(generate).not.toHaveBeenCalled()
  })

  it('ONB-02 resumes the earliest incomplete step and keeps restart secondary', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    loadDraft.mockResolvedValue({ currentStep: 'food', values: completeDraft })
    render(
      <I18nProvider>
        <AuthContext.Provider value={auth}>
          <QueryClientProvider client={client}>
            <OnboardingResumePage locale="en" />
          </QueryClientProvider>
        </AuthContext.Provider>
      </I18nProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Continue where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue setup' })).toHaveAttribute('href', '/en/onboarding/body')
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument()
  })
})
