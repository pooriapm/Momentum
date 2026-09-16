import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test'

const supabaseOrigin = 'https://mock.test'
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'audit@example.test',
  email_confirmed_at: '2026-09-01T00:00:00.000Z',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: {},
}
const session = {
  access_token: 'audit-access-token',
  refresh_token: 'audit-refresh-token',
  expires_at: 4_102_444_800,
  expires_in: 3600,
  token_type: 'bearer',
  user,
}

type Draft = { current_step: string; payload: Record<string, string> }
type MockState = {
  draft: Draft
  calls: string[]
  actions: string[]
  providerCalls: string[]
  failNextDraftSave: boolean
  completed: boolean
}

const basicsPayload = {
  firstName: 'Audit', birthDate: '1990-05-15', adultConfirmed: 'yes', sex: 'undisclosed',
  heightCm: '175', weightKg: '75.5', country: 'US', locale: 'en-US', timezone: 'UTC',
}
const healthPayload = {
  pregnancyOrBreastfeeding: 'no', eatingDisorderHistory: 'no', highRiskCondition: 'no',
  urgentSymptoms: 'no', injuryLimitation: 'no',
}

async function installMocks(context: BrowserContext, initial?: Partial<Draft>) {
  const state: MockState = {
    draft: { current_step: initial?.current_step ?? 'basics', payload: initial?.payload ?? {} },
    calls: [],
    actions: [],
    providerCalls: [],
    failNextDraftSave: false,
    completed: false,
  }
  context.on('page', (page) => page.on('pageerror', (error) => console.error('AUDIT_PAGE_ERROR', error.message)))
  await context.route('**/*', async (route) => mockRequest(route, state))
  return state
}

async function mockRequest(route: Route, state: MockState) {
  const request = route.request()
  const url = new URL(request.url())
  if (/openai|anthropic|generativelanguage/i.test(url.hostname)
    || /\/functions\/v1\/generate-monthly-plan(?:\/|$)/i.test(url.pathname)) {
    state.providerCalls.push(`${request.method()} ${request.url()}`)
    return route.abort('blockedbyclient')
  }
  if (url.origin !== supabaseOrigin) return route.continue()
  const key = `${request.method()} ${url.pathname}`
  state.calls.push(key)
  if (url.pathname.includes('/auth/v1/token')) return route.fulfill({ status: 200, json: session })
  if (url.pathname.includes('/auth/v1/user')) return route.fulfill({ status: 200, json: user })
  if (url.pathname.includes('/auth/v1/signup')) {
    return route.fulfill({ status: 200, json: { user: { ...user, email_confirmed_at: null }, session: null } })
  }
  if (url.pathname.includes('onboarding_drafts')) {
    if (request.method() === 'GET') return route.fulfill({ status: 200, json: state.draft })
    if (request.method() === 'DELETE') {
      state.draft = { current_step: 'basics', payload: {} }
      return route.fulfill({ status: 204, body: '' })
    }
    if (state.failNextDraftSave) {
      state.failNextDraftSave = false
      return route.fulfill({ status: 503, json: { message: 'audit save failure' } })
    }
    const body = request.postDataJSON() as Draft | Draft[]
    state.draft = Array.isArray(body) ? body[0] : body
    return route.fulfill({ status: 200, json: state.draft })
  }
  if (url.pathname.includes('body_composition_measurements')) {
    if (request.method() === 'GET') return route.fulfill({ status: 200, json: null })
    return route.fulfill({ status: 201, json: [] })
  }
  if (url.pathname.includes('current_legal')) {
    return route.fulfill({ status: 200, json: { terms: '2026-08-01-alpha', privacy: '2026-08-01-alpha', health: '2026-08-01-alpha' } })
  }
  if (url.pathname.includes('geo-context')) {
    return route.fulfill({ status: 200, json: {
      country: 'US', source: 'fallback', suggested_locale: 'en-US', suggested_product_region: 'intl',
      suggested_market: 'global', suggested_currency: 'USD', suggested_cuisine_region: 'international',
      ai_service_available: true, authoritative_for_checkout: false, prices: [],
    } })
  }
  if (url.pathname.includes('/functions/v1/account-data')) {
    const body = request.postDataJSON() as { action?: string }
    if (body.action) state.actions.push(body.action)
    if (body.action === 'dashboard') {
      return route.fulfill({ status: 200, json: { dashboard: dashboard(state.completed ? 'complete' : 'started', state.draft.payload.planSource) } })
    }
    if (body.action === 'complete-onboarding') {
      state.completed = true
      return route.fulfill({ status: 200, json: { onboarding: {
        status: 'complete', automation_block_reason: null,
        goal_id: '22222222-2222-4222-8222-222222222222', country_code: 'US', product_region: 'intl',
      } } })
    }
  }
  return route.fulfill({ status: 503, json: { error: { code: 'AUDIT_BOUNDARY', path: url.pathname } } })
}

function dashboard(status: 'started' | 'complete', planSource = 'momentum') {
  return {
    local_date: '2026-09-16',
    profile: {
      display_name: 'Audit', date_of_birth: '1990-05-15', sex: 'undisclosed', height_cm: 175,
      locale: 'en-US', timezone: 'UTC', country_code: 'US', pricing_market: 'global', product_region: 'intl',
      unit_system: 'metric', onboarding_status: status, automation_block_reason: null,
      plan_source_preference: planSource === 'external' ? 'external' : 'momentum',
      email_confirmed: true, consent_versions: { terms: null, privacy: null, health: null }, health_data_consent_at: null,
    },
    active_goal: null, checkin: null, recent_checkins: [], latest_body_weight: null,
    entitlement_usage: null, ai_access: { plan: { state: 'ready', reason: 'eligible' } },
    plan: null, plan_history: [], progress_series: [],
  }
}

async function signIn(page: Page) {
  await page.goto('/en/auth/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Audit-only-pass1!')
  await page.getByRole('button', { name: 'Sign in to Momentum' }).click()
  await page.waitForURL(/\/en\/(onboarding|app)/)
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function continueStep(page: Page, expected: string) {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/en/onboarding/${expected}$`))
}

async function continueFa(page: Page, expected: string) {
  await page.getByRole('button', { name: 'ادامه', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/fa/onboarding/${expected}$`))
}

async function fillPersianJourney(page: Page) {
  await page.goto('/fa/onboarding/basics')
  await page.getByLabel('نام', { exact: true }).fill('آزمون')
  await page.getByRole('combobox', { name: /تاریخ تولد/ }).click()
  await page.getByRole('combobox', { name: 'سال', exact: true }).click()
  await page.getByRole('option').filter({ hasText: '۱۳۶۹' }).click()
  await page.locator('.localized-date-grid button:not(:disabled)').filter({ visible: true }).first().click()
  await page.locator('select').nth(0).selectOption('yes')
  await page.locator('select').nth(1).selectOption('undisclosed')
  await page.getByLabel('قد (سانتی‌متر)', { exact: true }).fill('۱۷۵٫۵')
  await page.getByLabel('وزن فعلی (کیلوگرم)', { exact: true }).fill('۷۵٫۵')
  await page.getByRole('combobox', { name: 'کشور محل استفاده' }).click()
  await page.getByRole('option', { name: /ایران/ }).click()
  await continueFa(page, 'health')
  for (const select of await page.locator('select').all()) await select.selectOption('no')
  await continueFa(page, 'consent')
  for (const checkbox of await page.locator('.onboarding-checkbox input').all()) await checkbox.check({ force: true })
  await continueFa(page, 'plan-source')
  await page.getByRole('radio', { name: /برنامه خودم را استفاده می‌کنم/ }).check()
  await continueFa(page, 'goal')
  await page.locator('select').selectOption('maintenance')
  await continueFa(page, 'food')
  await page.locator('select').first().selectOption('omnivore')
  await continueFa(page, 'training')
  await page.getByLabel('برنامه کاری و محدودیت‌های آشپزی', { exact: true }).fill('شنبه تا چهارشنبه')
  await continueFa(page, 'body')
  await page.getByRole('button', { name: 'رد کردن این مرحله' }).click()
  await expect(page).toHaveURL(/\/fa\/onboarding\/review$/)
}

async function fillFullJourney(page: Page, source: 'momentum' | 'external', activeTraining = false) {
  await page.goto('/en/onboarding/basics')
  await page.getByLabel('Name', { exact: true }).fill('Audit')
  await page.getByRole('combobox', { name: /Date of birth/ }).click()
  await page.getByRole('combobox', { name: 'Year', exact: true }).click()
  await page.getByRole('option', { name: '1990', exact: true }).click()
  await page.locator('.localized-date-grid button:not(:disabled)').filter({ visible: true }).first().click()
  await choose(page, 'I confirm I am 18 or older', 'Yes')
  await choose(page, 'Sex used for physiological calculations', 'Prefer not to say')
  await page.getByLabel('Height (cm)', { exact: true }).fill('175')
  await page.getByLabel('Current weight (kg)', { exact: true }).fill('75.5')
  await continueStep(page, 'health')

  for (const label of [
    'Pregnant or breastfeeding', 'Current or previous eating-disorder concern',
    'Diabetes, kidney, liver, heart condition, or weight-affecting medication',
    'Severe or sudden symptoms that need urgent help', 'Injury or movement limitation',
  ]) await choose(page, label, 'No')
  await continueStep(page, 'consent')
  for (const checkbox of await page.locator('.onboarding-checkbox input').all()) await checkbox.check({ force: true })
  await continueStep(page, 'plan-source')
  await page.getByRole('radio', { name: source === 'momentum' ? /create my plan/i : /use my own plan/i }).check()
  await continueStep(page, 'goal')
  await choose(page, 'Primary goal', 'Maintain & perform')
  await continueStep(page, 'food')
  await choose(page, 'Diet style', 'Omnivore')
  await continueStep(page, 'training')
  if (activeTraining) {
    await page.getByRole('button', { name: 'Increase' }).click()
    await page.getByRole('button', { name: 'Increase' }).click()
    await choose(page, 'Primary activity', 'Strength training')
    await choose(page, 'Session duration', '45 minutes')
    await choose(page, 'Experience level', 'Beginner')
    await choose(page, 'Training location', 'Home')
    await page.getByRole('group', { name: 'Exact training days' }).getByText('Monday', { exact: true }).click()
    await page.getByRole('group', { name: 'Exact training days' }).getByText('Wednesday', { exact: true }).click()
    await page.getByRole('combobox', { name: /Usual training start time/ }).click()
    await page.getByRole('listbox', { name: 'Hour' }).getByRole('option', { name: '18', exact: true }).click()
    await page.getByLabel('Time constraints and fallback training days', { exact: true }).fill('Monday and Wednesday evenings')
    await page.getByLabel('Available equipment', { exact: true }).fill('Dumbbells')
  }
  await page.getByLabel('Work schedule and cooking limitations', { exact: true }).fill('Weekdays 9–5')
  await continueStep(page, 'body')
  await page.getByRole('button', { name: 'Skip this step' }).click()
  await expect(page).toHaveURL(/\/en\/onboarding\/review$/)
}

function expectNoProviderTraffic(state: MockState) {
  expect(state.providerCalls).toEqual([])
}

test('sign-up reaches the durable verification page without touching a live backend', async ({ context, page }) => {
  const state = await installMocks(context)
  await page.goto('/en')
  await page.getByRole('link', { name: 'Build my plan' }).first().click()
  await page.getByLabel('Email', { exact: true }).fill('new.audit@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Audit-only-pass1!')
  for (const checkbox of await page.locator('.auth-consent input').all()) await checkbox.check({ force: true })
  await page.getByRole('button', { name: /create secure account/i }).click()
  await expect(page).toHaveURL(/\/en\/auth\/verify/)
  await expect(page.getByRole('heading', { name: 'Verification status' })).toBeVisible()
  expectNoProviderTraffic(state)
})

for (const scenario of [
  { source: 'momentum' as const, viewport: { width: 390, height: 844 } },
  { source: 'external' as const, viewport: { width: 1280, height: 900 } },
]) {
  test(`full ${scenario.source} journey reaches and completes review`, async ({ context, page }) => {
    await page.setViewportSize(scenario.viewport)
    const state = await installMocks(context)
    await signIn(page)
    await fillFullJourney(page, scenario.source, scenario.source === 'momentum')
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(axe.violations).toEqual([])
    await page.getByRole('button', { name: 'Confirm and continue' }).click()
    await expect(page).toHaveURL(scenario.source === 'external' ? /\/en\/app\/import-plan/ : /\/en\/app\/today/)
    expect(state.actions).toContain('complete-onboarding')
    expect(state.actions).not.toContain('create-starter-plan')
    expectNoProviderTraffic(state)
  })
}

test('refresh resumes at the server-owned current step with saved answers', async ({ context, page }) => {
  const state = await installMocks(context, {
    current_step: 'goal',
    payload: { ...basicsPayload, ...healthPayload, termsAccepted: 'yes', privacyAccepted: 'yes', healthDataConsent: 'yes', planSource: 'external' },
  })
  await signIn(page)
  await page.goto('/en/onboarding')
  await page.getByRole('link', { name: 'Continue setup' }).click()
  await expect(page).toHaveURL(/\/en\/onboarding\/goal$/)
  await page.reload()
  await expect(page).toHaveURL(/\/en\/onboarding\/goal$/)
  await expect(page.getByText('Audit', { exact: true })).toHaveCount(0)
  expectNoProviderTraffic(state)
})

test('urgent answer stops optional collection immediately and offers safety guidance', async ({ context, page }) => {
  const state = await installMocks(context, { current_step: 'health', payload: basicsPayload })
  await signIn(page)
  await page.goto('/en/onboarding/health')
  await choose(page, 'Severe or sudden symptoms that need urgent help', 'Yes')
  await expect(page.getByText('Get urgent help before continuing')).toBeVisible()
  await expect(page.getByRole('link', { name: 'View safety guidance' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  expectNoProviderTraffic(state)
})

test('offline review preserves the draft and never attempts completion', async ({ context, page }) => {
  const state = await installMocks(context)
  await signIn(page)
  await fillFullJourney(page, 'external')
  const savesBeforeOffline = state.calls.filter((call) => call.includes('onboarding_drafts')).length
  await context.setOffline(true)
  await expect(page.getByText(/Final review is preserved on this device/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm and continue' })).toBeDisabled()
  expect(state.actions).not.toContain('complete-onboarding')
  expect(state.calls.filter((call) => call.includes('onboarding_drafts'))).toHaveLength(savesBeforeOffline)
  expectNoProviderTraffic(state)
})

test('failed save keeps edits and browser Back returns safely', async ({ context, page }) => {
  const state = await installMocks(context, { current_step: 'basics', payload: basicsPayload })
  await signIn(page)
  await page.goto('/en/onboarding/basics')
  await page.getByLabel('Name', { exact: true }).fill('Still here')
  state.failNextDraftSave = true
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not save')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Still here')
  await page.goBack()
  await expect(page).toHaveURL(/\/en\/app\/today$/)
  expectNoProviderTraffic(state)
})

test('open date, country, and time controls have no axe violations', async ({ context, page }) => {
  const state = await installMocks(context, { current_step: 'basics', payload: basicsPayload })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await signIn(page)
  await page.goto('/en/onboarding/basics')
  await page.getByRole('combobox', { name: /Date of birth/ }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Country of use' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  state.draft = { current_step: 'training', payload: { ...basicsPayload, ...healthPayload, termsAccepted: 'yes', privacyAccepted: 'yes', healthDataConsent: 'yes', planSource: 'external', goalType: 'maintenance', dietStyle: 'omnivore', trainingDays: '1', trainingDurationPreset: '45', trainingDuration: '45', primaryActivity: 'strength', trainingExperience: 'beginner', trainingLocation: 'home', trainingWeekdays: '1', trainingStartTime: '18:00', trainingAvailability: 'Evenings' } }
  await page.goto('/en/onboarding/training')
  await page.reload()
  await page.getByRole('combobox', { name: /Usual training start time/ }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  expectNoProviderTraffic(state)
})

test('Persian 320px review completes the same external journey before any provider call', async ({ context, page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  const state = await installMocks(context)
  await signIn(page)
  await fillPersianJourney(page)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: '/tmp/momentum-final-fa-review.png', fullPage: true })
  await page.getByRole('button', { name: 'تأیید و ادامه' }).click()
  await expect(page).toHaveURL(/\/fa\/app\/import-plan/)
  expect(state.actions).toContain('complete-onboarding')
  expectNoProviderTraffic(state)
})
