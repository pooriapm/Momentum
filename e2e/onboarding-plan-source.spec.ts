import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
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

test.describe('authenticated onboarding plan-source UI', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(
    process.env.R2_AUTHENTICATED_E2E !== '1',
    'Requires the isolated local Supabase release fixture.',
  )
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Runs only on Chromium for the authenticated fixture.')
  })

  let admin: ReturnType<typeof createClient>
  let email = ''
  let password = ''
  let userId = ''

  test.beforeAll(async () => {
    const environment = localEnvironment()
    admin = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    email = `onb-plan-${randomUUID()}@example.test`
    password = `Onb-Plan-${randomUUID()}-aA1!`
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
        '${userId}','plan-source',jsonb_build_object(
          'firstName','Plan Source','birthDate','1992-04-12','sex','undisclosed',
          'heightCm','170','weightKg','75','country','US','planSource','',
          'adultConfirmed','yes','pregnancyOrBreastfeeding','no',
          'eatingDisorderHistory','no','highRiskCondition','no','urgentSymptoms','no',
          'injuryLimitation','no','medicalNotes','','medications','','supplements','',
          'termsAccepted','yes','privacyAccepted','yes','healthDataConsent','yes',
          'locale','en-US','timezone','UTC'
        )
      );
    `)
  })

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  test('ONB-29 requires an explicit card selection before Continue and persists it', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/en/auth/sign-in')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in to Momentum' }).click()
    await page.goto('/en/onboarding/plan-source')

    const external = page.getByRole('radio', { name: /use my own plan/i })
    const momentum = page.getByRole('radio', { name: /create my plan/i })
    const continueButton = page.getByRole('button', { name: 'Continue' })

    await expect(external).toBeVisible()
    await expect(momentum).toBeVisible()
    await expect(continueButton).toBeDisabled()
    await expect(page.getByText('Choose one option to continue.')).toBeVisible()

    await page.getByText('Use my own plan', { exact: true }).click()
    await expect(external).toBeChecked()
    await expect(momentum).not.toBeChecked()
    await expect(continueButton).toBeEnabled()
    await expect(page.getByText('Selected: Use my own plan')).toBeVisible()

    await page.getByText('Create my plan', { exact: true }).click()
    await expect(momentum).toBeChecked()
    await expect(external).not.toBeChecked()
    await expect(page.getByText('Selected: Create my plan')).toBeVisible()

    await continueButton.click()
    await expect(page).toHaveURL(/\/en\/onboarding\/goal/)

    await page.goto('/en/onboarding/plan-source')
    await expect(page.getByRole('radio', { name: /create my plan/i })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })
})
