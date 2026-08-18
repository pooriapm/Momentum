import type { User } from '@supabase/supabase-js'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { mocked } from 'storybook/test'
import { LocalizedStory } from '../../../../.storybook/LocalizedStory'
import { AuthContext, type AuthContextValue } from '../../../platform/auth/auth-context'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { QueryProvider } from '../../../platform/query/QueryProvider'
import { loadAccountDashboard } from '../../data/repository'
import { loadPricingContext, type PricingContext } from '../../data/pricing'
import {
  completeOnboarding,
  deleteOnboardingDraft,
  discardBodyReport,
  loadOnboardingDraft,
  saveOnboardingDraft,
  uploadBodyReport,
} from '../../onboarding/repository'
import type { OnboardingStepKey } from '../../onboarding/schema'
import { OnboardingPage } from './OnboardingPage'
import { OnboardingResumePage } from './OnboardingResumePage'
import '../public/public-pages.stories.css'
import './onboarding-page.stories.css'

const mockUser = {
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-08-10T08:00:00.000Z',
  email: 'sara@example.com',
  id: '2f02a069-5294-4dee-92dc-2ecfe077902b',
  user_metadata: { name: 'سارا' },
} as User

const mockAuth: AuthContextValue = {
  isConfigured: true,
  requestPasswordReset: async () => undefined,
  resendConfirmation: async () => undefined,
  session: null,
  signIn: async () => undefined,
  signOut: async () => undefined,
  signUp: async () => 'authenticated',
  status: 'authenticated',
  updatePassword: async () => undefined,
  user: mockUser,
}

const pricingFixture: PricingContext = {
  ai_service_available: true,
  authoritative_for_checkout: false,
  country: 'DE',
  prices: [],
  source: 'fallback',
  suggested_cuisine_region: 'international',
  suggested_currency: 'USD',
  suggested_locale: 'en-US',
  suggested_market: 'global',
}

const completeDraft: Record<string, string> = {
  adultConfirmed: 'yes',
  allergies: 'peanut',
  birthDate: '1992-05-18',
  bodyReportDate: '',
  cookingConstraints: 'حداکثر ۳۰ دقیقه برای هر وعده',
  country: 'IR',
  dietStyle: 'omnivore',
  dislikedFoods: 'قارچ',
  eatingDisorderHistory: 'no',
  equipment: 'دمبل، کش تمرینی و treadmill',
  favoriteFoods: 'خوراک مرغ، ماست یونانی و سالاد',
  firstName: 'سارا',
  foodBudget: 'standard',
  goalType: 'fat_loss',
  groceryPreferences: 'خرید هفتگی از فروشگاه محلی',
  healthDataConsent: 'yes',
  heightCm: '168',
  highRiskCondition: 'no',
  injuryLimitation: 'no',
  medicalNotes: '',
  medications: '',
  onboardingFlowId: 'storybook-onboarding-flow',
  pregnancyOrBreastfeeding: 'no',
  preferredOptionCount: '3',
  primaryActivity: 'strength',
  privacyAccepted: 'yes',
  requestedMealCount: '3',
  requestedMealPattern: '۳ وعده اصلی و یک میان‌وعده',
  restaurantMealsPerWeek: '2',
  restaurantPreferences: 'غذای مدیترانه‌ای؛ بدون نوشابه',
  sex: 'female',
  supplements: 'Vitamin D 1000 IU',
  targetWeightKg: '64',
  termsAccepted: 'yes',
  trainingAvailability: 'شنبه، دوشنبه و چهارشنبه عصر',
  trainingDays: '3',
  trainingDuration: '60',
  trainingDurationPreset: '60',
  trainingExperience: 'intermediate',
  trainingLocation: 'home',
  trainingStartTime: '18:30',
  trainingWeekdays: '0,2,4',
  urgentSymptoms: 'no',
  weightKg: '72.4',
  workSchedule: 'شنبه تا چهارشنبه، 09:00–17:00',
}

const englishDraftText: Record<string, string> = {
  allergies: 'peanut',
  cookingConstraints: 'No more than 30 minutes per meal',
  equipment: 'Dumbbells, resistance bands, and a treadmill',
  favoriteFoods: 'Chicken stew, Greek yogurt, and salads',
  firstName: 'Sara',
  groceryPreferences: 'One weekly shop at the local market',
  requestedMealCount: '3',
  requestedMealPattern: '3 main meals and one snack',
  restaurantPreferences: 'Mediterranean food; no soft drinks',
  supplements: 'Vitamin D 1000 IU',
  trainingAvailability: 'Sunday, Tuesday, and Thursday evenings',
  workSchedule: 'Sunday to Thursday, 09:00–17:00',
}

function localeFromGlobal(value: unknown): AppLocale {
  return value === 'en' ? 'en' : 'fa'
}

function resetStoryMocks() {
  mocked(loadOnboardingDraft).mockReset()
  mocked(saveOnboardingDraft).mockReset()
  mocked(uploadBodyReport).mockReset()
  mocked(discardBodyReport).mockReset()
  mocked(deleteOnboardingDraft).mockReset()
  mocked(completeOnboarding).mockReset()
  mocked(loadPricingContext).mockReset()
  mocked(loadAccountDashboard).mockReset()
  mocked(useOnlineStatus).mockReset()
}

function installStoryMocks(values: Record<string, string>) {
  mocked(loadOnboardingDraft).mockResolvedValue({ currentStep: 'basics', values })
  mocked(saveOnboardingDraft).mockResolvedValue(undefined)
  mocked(uploadBodyReport).mockResolvedValue({ id: 'body-report-story', path: `${mockUser.id}/body-report.pdf` })
  mocked(discardBodyReport).mockResolvedValue(undefined)
  mocked(deleteOnboardingDraft).mockResolvedValue(undefined)
  mocked(completeOnboarding).mockResolvedValue({
    ai_country_verified: true,
    automation_block_reason: null,
    country_code: values.country || 'IR',
    goal_id: '513bc02f-9b72-42f7-b518-ab2542f4cb08',
    status: 'complete',
  })
  mocked(loadPricingContext).mockResolvedValue({ ...pricingFixture, country: values.country || 'IR' })
  mocked(loadAccountDashboard).mockResolvedValue({
    aiCountryVerified: true,
    aiPlanAccess: { reason: 'storybook-fixture', state: 'ready' },
    automationBlockReason: null,
    countryCode: values.country || 'IR',
    onboardingStatus: 'complete',
    plan: null,
  })
  mocked(useOnlineStatus).mockReturnValue(true)
}

function beforeEachWithDraft(overrides: Record<string, string> = {}) {
  return async (context: { globals: Record<string, unknown> }) => {
    const localizedText = context.globals.locale === 'en' ? englishDraftText : {}
    installStoryMocks({ ...completeDraft, ...localizedText, ...overrides })
    return resetStoryMocks
  }
}

function OnboardingScreen({ locale, step }: { locale: AppLocale; step: OnboardingStepKey }) {
  return (
    <div className="mo-screen-story mo-onboarding-story">
      <LocalizedStory locale={locale}>
        <AuthContext.Provider value={mockAuth}>
          <QueryProvider>
            <OnboardingPage locale={locale} step={step} />
          </QueryProvider>
        </AuthContext.Provider>
      </LocalizedStory>
    </div>
  )
}

function renderStep(step: OnboardingStepKey) {
  return (_args: unknown, context: { globals: Record<string, unknown> }): ReactElement => (
    <OnboardingScreen locale={localeFromGlobal(context.globals.locale)} step={step} />
  )
}

const meta = {
  title: 'Screens/Onboarding',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component: 'Production onboarding screens with an authenticated in-memory user and a complete local draft. All repository, geo, connectivity, and account calls are mocked; no Supabase or network request is made.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Basics: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('basics') }

export const BasicsWithSuggestedCountry: Story = {
  beforeEach: beforeEachWithDraft({ country: '' }),
  render: renderStep('basics'),
}

export const HealthEligible: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('health') }

export const HealthBlocked: Story = {
  beforeEach: beforeEachWithDraft({ highRiskCondition: 'yes' }),
  render: renderStep('health'),
}

export const HealthUrgent: Story = {
  beforeEach: beforeEachWithDraft({ urgentSymptoms: 'yes' }),
  render: renderStep('health'),
}

export const Consent: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('consent') }

export const Goal: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('goal') }

export const GoalMaintenance: Story = {
  beforeEach: beforeEachWithDraft({ goalType: 'maintenance', targetWeightKg: '' }),
  render: renderStep('goal'),
}

export const FoodPreferences: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('food') }

export const FoodUnmappedAllergen: Story = {
  beforeEach: beforeEachWithDraft({ allergies: 'peanut,other' }),
  render: renderStep('food'),
}

export const TrainingSchedule: Story = { beforeEach: beforeEachWithDraft(), render: renderStep('training') }

export const TrainingAtHome: Story = { beforeEach: beforeEachWithDraft({ trainingLocation: 'home' }), render: renderStep('training') }

export const TrainingOutdoors: Story = {
  beforeEach: beforeEachWithDraft({ trainingLocation: 'outdoor', equipment: '' }),
  render: renderStep('training'),
}

export const TrainingCustomDuration: Story = {
  beforeEach: beforeEachWithDraft({ trainingDurationPreset: 'custom', trainingDuration: '75' }),
  render: renderStep('training'),
}

export const TrainingWithoutScheduledWorkouts: Story = {
  beforeEach: beforeEachWithDraft({
    primaryActivity: '',
    trainingAvailability: '',
    trainingDays: '0',
    trainingDuration: '',
    trainingDurationPreset: '',
    trainingExperience: '',
    trainingLocation: '',
    trainingStartTime: '',
    trainingWeekdays: '',
  }),
  render: renderStep('training'),
}

export const BodyReportEmpty: Story = {
  beforeEach: beforeEachWithDraft({ bodyReportDate: '', bodyReportPath: '', bodySkipped: '' }),
  render: renderStep('body'),
}

export const BodySkipped: Story = {
  beforeEach: beforeEachWithDraft({ bodySkipped: 'yes', bodyReportPath: '' }),
  render: renderStep('body'),
}

export const BodyReportUploaded: Story = {
  beforeEach: beforeEachWithDraft({
    bodyReportDate: '2026-08-08',
    bodyReportId: 'body-report-story',
    bodyReportPath: `${mockUser.id}/body-report.pdf`,
    bodySource: 'report',
  }),
  render: renderStep('body'),
}

export const ReviewReady: Story = {
  beforeEach: beforeEachWithDraft({ bodyReportId: '', bodyReportPath: '', bodySkipped: 'yes' }),
  render: renderStep('review'),
}

export const ReviewOffline: Story = {
  beforeEach: async (context) => {
    const cleanup = await beforeEachWithDraft({ bodySkipped: 'yes' })(context)
    mocked(useOnlineStatus).mockReturnValue(false)
    return cleanup
  },
  render: renderStep('review'),
}

export const Resume: Story = {
  beforeEach: beforeEachWithDraft(),
  render: (_args, context) => (
    <div className="mo-screen-story mo-onboarding-story">
      <LocalizedStory locale={localeFromGlobal(context.globals.locale)}>
        <AuthContext.Provider value={mockAuth}>
          <QueryProvider>
            <OnboardingResumePage locale={localeFromGlobal(context.globals.locale)} />
          </QueryProvider>
        </AuthContext.Provider>
      </LocalizedStory>
    </div>
  ),
}
