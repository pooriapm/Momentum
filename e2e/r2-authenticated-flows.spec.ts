import { execFileSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const supabaseCli = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  const output = execFileSync(supabaseCli, ['status', '-o', 'json'], { encoding: 'utf8' })
  return JSON.parse(output.slice(output.indexOf('{'))) as Record<string, string>
}

function sql(value: string) {
  execFileSync('docker', ['exec', '-i', 'supabase_db_momentum', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: value,
    stdio: ['pipe', 'ignore', 'pipe'],
  })
}

test.describe('authenticated R2 release flows', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(
    process.env.R2_AUTHENTICATED_E2E !== '1',
    'Requires the isolated local Supabase release fixture.',
  )
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Runs only on desktop/mobile Chromium.')
  })
  let admin: ReturnType<typeof createClient>
  let email = ''
  let password = ''
  let userId = ''

  test.beforeAll(async () => {
    const environment = localEnvironment()
    admin = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    email = `r2-browser-${randomUUID()}@example.test`
    password = `R2-Browser-${randomUUID()}-aA1!`
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { locale: 'en-US', country_code: 'US', product_region: 'intl' },
    })
    if (created.error || !created.data.user) throw created.error ?? new Error('fixture_user_missing')
    userId = created.data.user.id

    sql(`
      insert into public.onboarding_drafts(user_id,current_step,payload) values (
        '${userId}','review',jsonb_build_object(
          'firstName','R2 Browser','birthDate','1992-04-12','sex','undisclosed',
          'heightCm','170','weightKg','75','country','US','planSource','momentum',
          'goalType','maintenance','adultConfirmed','yes','pregnancyOrBreastfeeding','no',
          'eatingDisorderHistory','no','highRiskCondition','no','medicalNotes','none',
          'medications','','supplements','','dietStyle','omnivore','favoriteFoods','rice',
          'dislikedFoods','','allergies','','requestedMealPattern','three meals',
          'preferredOptionCount','1','cookingConstraints','simple meals','foodBudget','standard',
          'restaurantMealsPerWeek','0','restaurantPreferences','','groceryPreferences','weekly',
          'trainingDays','0','workSchedule','weekdays','termsAccepted','yes',
          'privacyAccepted','yes','healthDataConsent','yes','locale','en-US','timezone','UTC'
        )
      );
    `)
    const authenticated = createClient(environment.API_URL, environment.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const signedIn = await authenticated.auth.signInWithPassword({ email, password })
    if (signedIn.error) throw signedIn.error
    const completion = await authenticated.functions.invoke('account-data', {
      body: { action: 'complete-onboarding' },
      headers: { 'Idempotency-Key': `browser-onboarding-${randomUUID()}` },
    })
    if (completion.error) throw completion.error
    const starter = await authenticated.functions.invoke('account-data', {
      body: { action: 'create-starter-plan' },
      headers: { 'Idempotency-Key': `browser-starter-${randomUUID()}` },
    })
    if (starter.error) throw starter.error
    const key = `browser-consent-${randomUUID()}`
    const consent = await admin.rpc('set_analytics_consent', {
      p_user_id: userId,
      p_enabled: true,
      p_idempotency_key: key,
      p_request_sha256: createHash('sha256').update(JSON.stringify({ enabled: true })).digest('hex'),
    })
    if (consent.error) throw consent.error
  })

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  test('FLOW-02 terminal, FLOW-03 navigation, and FLOW-04 adherence work on authenticated UI', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/en/auth/sign-in')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    const dashboardResponse = page.waitForResponse((response) => response.url().includes('/functions/v1/account-data') && response.request().postData()?.includes('dashboard') === true)
    await page.getByRole('button', { name: 'Sign in to Momentum' }).click()
    const dashboardHttp = await dashboardResponse
    expect(dashboardHttp.status(), await dashboardHttp.text()).toBe(200)
    await expect(page).toHaveURL(/\/en\/app\/today/)
    await expect(page.getByRole('heading', { name: /good morning, r2 browser/i })).toBeVisible()

    for (const route of ['plan', 'progress', 'me'] as const) {
      await page.locator(`a[href="/en/app/${route}"]:visible`).first().click()
      await expect(page).toHaveURL(new RegExp(`/en/app/${route}`))
      await expect(page.getByRole('main')).toBeVisible()
    }

    await page.locator('a[href="/en/app/settings"]:visible').click()
    await expect(page.getByRole('heading', { name: 'Optional product analytics' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /help improve activation and adherence/i })).toBeChecked()

    await page.getByRole('link', { name: /back to me/i }).click()
    await page.locator('a[href="/en/app/account"]:visible').click()
    await expect(page.getByRole('main')).toBeVisible()

    await page.goto('/en/app/today')
    const completeMeal = page.getByRole('button', { name: /^complete$/i }).first()
    await expect(completeMeal).toBeEnabled()
    await completeMeal.click()
    await expect(page.getByRole('button', { name: /undo log/i }).first()).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /daily check-in · optional/i }).first().click()
    await page.getByLabel('Sleep last night (hours)').fill('7.5')
    await page.getByRole('button', { name: 'Save check-in' }).click()
    await expect(page.getByText(/check-in saved\. no ai was called/i)).toBeVisible({ timeout: 20_000 })
  })
})
