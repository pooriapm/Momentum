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
  createStarterPlan,
  deleteOnboardingDraft,
  discardBodyReport,
  loadOnboardingDraft,
  requestPlanGeneration,
  saveOnboardingBodyMeasurements,
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
  createStarterPlan: vi.fn(),
  deleteOnboardingDraft: vi.fn(),
  discardBodyReport: vi.fn(),
  requestPlanGeneration: vi.fn(),
  saveOnboardingBodyMeasurements: vi.fn(),
  uploadBodyReport: vi.fn(),
}))

const online = vi.mocked(useOnlineStatus)
const loadDraft = vi.mocked(loadOnboardingDraft)
const saveDraft = vi.mocked(saveOnboardingDraft)
const complete = vi.mocked(completeOnboarding)
const createStarter = vi.mocked(createStarterPlan)
const generate = vi.mocked(requestPlanGeneration)
const discardReport = vi.mocked(discardBodyReport)
const saveBodyMeasurements = vi.mocked(saveOnboardingBodyMeasurements)
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
  return { client, ...render(
    <I18nProvider>
      <AuthContext.Provider value={auth}>
        <QueryClientProvider client={client}>
          <OnboardingPage locale="en" step={step} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </I18nProvider>,
  ) }
}

describe('OnboardingPage inventory states', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    online.mockReturnValue(true)
    saveDraft.mockResolvedValue(undefined)
    discardReport.mockReset()
    discardReport.mockResolvedValue(undefined)
    saveBodyMeasurements.mockResolvedValue(undefined)
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

  it('moves focus to the first invalid answer', async () => {
    renderStep('basics', { ...completeDraft, firstName: '' })
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
    expect(saveDraft).not.toHaveBeenCalled()
  })

  it('explains disabled navigation while offline', async () => {
    online.mockReturnValue(false)
    renderStep('basics')
    expect(await screen.findByText(/reconnect to save and continue/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('ONB-10 shows a non-medical eligible result after Health screening', async () => {
    renderStep('health')
    expect(await screen.findByText('Your answers do not block automatic planning')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Optional health details' })).toBeInTheDocument()
    expect(screen.getByText(/not medical clearance or diagnosis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('reveals the matching health path while preserving optional answers across a safety toggle', async () => {
    renderStep('health', {
      ...completeDraft,
      medications: 'Prescription A',
      medicalNotes: 'Knee sensitivity',
      supplements: 'Vitamin D',
    })

    expect(await screen.findByDisplayValue('Prescription A')).toBeInTheDocument()
    const highRisk = screen.getByLabelText(/diabetes, kidney, liver/i)
    fireEvent.click(highRisk)
    fireEvent.click(screen.getByRole('option', { name: 'Yes' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /automatic planning is unavailable/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View safety guidance' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/diabetes, kidney, liver/i))
    fireEvent.click(screen.getByRole('option', { name: 'No' }))

    expect(await screen.findByDisplayValue('Prescription A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Knee sensitivity')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vitamin D')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View safety guidance' })).not.toBeInTheDocument()
  })

  it('ONB-11 stops after an automated-plan block and does not continue collection', async () => {
    renderStep('health', { ...completeDraft, highRiskCondition: 'yes' })
    expect(await screen.findByRole('heading', { name: /automatic planning is unavailable/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save and exit' })).toBeEnabled()
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

  it('ONB-13 and ONB-14 use catalog allergen chips and reveal a note only for Other', async () => {
    renderStep('food', { ...completeDraft, allergies: 'peanut' })
    expect(await screen.findByText('Peanut')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.queryByLabelText(/name the other allergy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/other is not mapped to the catalog/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Other'))
    expect(screen.getByLabelText(/name the other allergy/i)).toBeEnabled()
    expect(screen.getByText(/other is not mapped to the catalog/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Other'))
    expect(screen.queryByLabelText(/name the other allergy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/other is not mapped to the catalog/i)).not.toBeInTheDocument()
  })

  it('review lists the answers without a plan-source choice', async () => {
    renderStep('review', { ...completeDraft, bodySkipped: 'yes', bodyReportPath: '' })
    expect(await screen.findByText(/Sara · Female · May 18, 1992 · Iran/i)).toBeInTheDocument()
    expect(screen.getByText(/Allergies: Peanut/i)).toBeInTheDocument()
    expect(screen.getByText(/3 days · Strength training · Intermediate · Home/i)).toBeInTheDocument()
    expect(screen.getByText(/3 meals \/ 3 options/i)).toBeInTheDocument()
    expect(screen.queryByText(/3 meals · 3 meals \/ 3 options/i)).not.toBeInTheDocument()
    expect(screen.getByText('Terms, privacy, and health-data consent accepted')).toBeInTheDocument()
    expect(screen.queryByText('2026-08-01-alpha')).not.toBeInTheDocument()
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

  it('shows BMI from height and weight, and details only in the second manual path', async () => {
    renderStep('body', { ...completeDraft, bodySkipped: '', bodyReportPath: '', bodySource: '', bodyDetail: '' })
    expect(await screen.findByRole('button', { name: /manual entry/i })).toBeInTheDocument()
    expect(screen.queryByText(/body mass index/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/waist/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /manual entry/i }))
    expect(screen.getByText(/body mass index/i)).toBeInTheDocument()
    expect(screen.getByText('25.7')).toBeInTheDocument()
    expect(screen.queryByLabelText(/waist/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /with details/i }))
    expect(screen.getByLabelText(/waist/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/body fat percent/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /uploaded report/i }))
    expect(document.querySelector('.body-upload--bold')).toBeTruthy()
    expect(screen.queryByLabelText(/waist/i)).not.toBeInTheDocument()
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
    expect(await screen.findByText(/file removal could not be confirmed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove file/i })).toBeInTheDocument()
    expect(discardReport).toHaveBeenCalledWith(
      user.id,
      '31313131-3131-4131-8131-313131313131',
      `${user.id}/body-report.pdf`,
    )
  })

  it('persists safety answers before leaving a stopped health flow', async () => {
    renderStep('health', { ...completeDraft, highRiskCondition: 'yes' })
    fireEvent.click(await screen.findByRole('button', { name: 'Save and exit' }))
    await waitFor(() => expect(saveDraft).toHaveBeenCalledWith(
      user.id,
      'health',
      expect.objectContaining({ highRiskCondition: 'yes' }),
    ))
  })

  it('disables body skip and removal while offline', async () => {
    online.mockReturnValue(false)
    renderStep('body', {
      ...completeDraft,
      bodyReportId: '31313131-3131-4131-8131-313131313131',
      bodyReportPath: `${user.id}/body-report.pdf`,
      bodySource: 'report',
    })
    expect(await screen.findByRole('button', { name: /remove file/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Skip this step' })).toBeDisabled()
  })

  it('shows a recoverable error when restart deletion fails', async () => {
    vi.mocked(deleteOnboardingDraft).mockRejectedValueOnce(new Error('offline'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    loadDraft.mockResolvedValue({ currentStep: 'food', values: completeDraft })
    render(
      <I18nProvider><AuthContext.Provider value={auth}><QueryClientProvider client={client}>
        <OnboardingResumePage locale="en" />
      </QueryClientProvider></AuthContext.Provider></I18nProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Start over' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not restart setup/i)
    expect(screen.getByRole('heading', { name: 'Continue where you left off' })).toBeInTheDocument()
  })

  it('ONB-27 and ONB-28 finish into the lifecycle gate without generating a plan', async () => {
    vi.mocked(deleteOnboardingDraft).mockClear()
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
    expect(createStarter).not.toHaveBeenCalled()
    expect(deleteOnboardingDraft).not.toHaveBeenCalled()
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
  it('updates the shared draft before the next keyed step mounts', async () => {
    const { client } = renderStep('consent', completeDraft)
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(client.getQueryData(['onboarding-draft', user.id])).toMatchObject({
      currentStep: 'goal', values: { healthDataConsent: 'yes' },
    }))
  })

  it('restores the signed-in user\'s in-memory edits after auth finishes loading', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['onboarding-unsaved', user.id, 'basics'], { firstName: 'Unsaved Sara' })
    loadDraft.mockResolvedValue({ currentStep: 'basics', values: { ...completeDraft, firstName: 'Saved Sara' } })
    const loadingAuth = { ...auth, status: 'loading' as const, user: null }
    const view = render(
      <I18nProvider>
        <AuthContext.Provider value={loadingAuth}>
          <QueryClientProvider client={client}>
            <OnboardingPage locale="en" step="basics" />
          </QueryClientProvider>
        </AuthContext.Provider>
      </I18nProvider>,
    )

    view.rerender(
      <I18nProvider>
        <AuthContext.Provider value={auth}>
          <QueryClientProvider client={client}>
            <OnboardingPage locale="en" step="basics" />
          </QueryClientProvider>
        </AuthContext.Provider>
      </I18nProvider>,
    )

    expect(await screen.findByDisplayValue('Unsaved Sara')).toBeInTheDocument()
    expect(client.getQueryData(['onboarding-unsaved', user.id, 'basics'])).toEqual({ firstName: 'Unsaved Sara' })
  })

  it('keeps space under the versioned consent note', async () => {
    renderStep('consent')
    const note = (await screen.findByText(/each consent is independent and versioned/i)).closest('.onboarding-lead-note')
    expect(note).toBeTruthy()
    expect(getComputedStyle(note as HTMLElement).marginBottom).toBe('var(--space-6)')
  })

  it('explains a food field in a short note', async () => {
    renderStep('food')
    const marks = await screen.findAllByRole('button', { name: 'About this field' })
    expect(marks.length).toBeGreaterThan(5)
    fireEvent.click(marks[0])
    expect(await screen.findByRole('status')).toHaveTextContent(/meals are built from that/i)
  })

  it('keeps space under the food allergen note', async () => {
    renderStep('food')
    const note = (await screen.findByText(/allergies are chosen from the catalog/i)).closest('.onboarding-lead-note')
    expect(note).toBeTruthy()
    expect(getComputedStyle(note as HTMLElement).marginBottom).toBe('var(--space-6)')
  })

})
