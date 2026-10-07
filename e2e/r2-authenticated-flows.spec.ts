import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const supabaseCli = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  const output = execFileSync(supabaseCli, ['status', '-o', 'json'], { encoding: 'utf8' })
  return JSON.parse(output.slice(output.indexOf('{'))) as Record<string, string>
}

test.describe('authenticated R2 release flows', () => {
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
    admin = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
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
  })

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  test('a confirmed account can sign in and reach setup', async ({ page }) => {
    await page.goto('/en/auth/sign-in')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in to Momentum' }).click()

    await expect(page).toHaveURL(/\/en\/app\/today/)
    await expect(page.getByRole('heading', { name: /finish your setup/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Continue onboarding' })).toBeVisible()
  })
})
