import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const supabaseCli = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url))

interface GenerationBody {
  job?: { id: string; status: string; period_id: string }
  error?: { code: string; message?: string }
  idempotent_replay?: boolean
}

function localEnvironment() {
  const output = execFileSync(supabaseCli, ['status', '-o', 'json'], { encoding: 'utf8' })
  return JSON.parse(output.slice(output.indexOf('{'))) as Record<string, string>
}

function sql(value: string) {
  execFileSync('docker', [
    'exec', '-i', 'supabase_db_momentum', 'psql', '-U', 'postgres', '-d', 'postgres',
    '-v', 'ON_ERROR_STOP=1',
  ], { input: value, stdio: ['pipe', 'ignore', 'pipe'] })
}

test.describe('authenticated R3 month-one/month-two lifecycle', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(
    process.env.R3_AUTHENTICATED_E2E !== '1',
    'Requires the isolated local Supabase R3 fixture.',
  )
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Runs only on desktop/mobile Chromium.')
  })

  let environment: Record<string, string>
  let admin: ReturnType<typeof createClient>
  let authenticated: ReturnType<typeof createClient>
  let email = ''
  let password = ''
  let userId = ''
  let accessToken = ''
  let browserSession = ''
  let authStorageKey = ''

  test.beforeAll(async () => {
    environment = localEnvironment()
    admin = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    email = `r3-lifecycle-${randomUUID()}@example.test`
    password = `R3-Lifecycle-${randomUUID()}-aA1!`
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { locale: 'en-US', country_code: 'US', product_region: 'intl' },
    })
    if (created.error || !created.data.user) throw created.error ?? new Error('fixture_user_missing')
    userId = created.data.user.id

    sql(`
      update public.first_plan_campaigns
      set enabled=true,total_budget_usd=100,remaining_budget_usd=100,
          reservation_cost_usd=2.50,min_remaining_usd=0,
          starts_at=null,ends_at=null
      where id='20000000-0000-4000-8000-000000000001';
      insert into public.onboarding_drafts(user_id,current_step,payload) values (
        '${userId}','review',jsonb_build_object(
          'firstName','R3 Lifecycle','birthDate','1992-04-12','sex','undisclosed',
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

    authenticated = createClient(environment.API_URL, environment.ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const signedIn = await authenticated.auth.signInWithPassword({ email, password })
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('session_missing')
    accessToken = signedIn.data.session.access_token
    browserSession = JSON.stringify(signedIn.data.session)
    authStorageKey = `sb-${new URL(environment.API_URL).hostname.split('.')[0]}-auth-token`
    const completion = await authenticated.functions.invoke('account-data', {
      body: { action: 'complete-onboarding' },
      headers: { 'Idempotency-Key': `r3-onboarding-${randomUUID()}` },
    })
    if (completion.error) throw completion.error
  })

  test.afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
    sql(`
      update public.first_plan_campaigns
      set enabled=false,total_budget_usd=0,remaining_budget_usd=0,
          starts_at=null,ends_at=null
      where id='20000000-0000-4000-8000-000000000001';
    `)
  })

  async function generate(key: string) {
    const response = await fetch(`${environment.API_URL}/functions/v1/generate-monthly-plan`, {
      method: 'POST',
      headers: {
        apikey: environment.ANON_KEY,
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'idempotency-key': key,
        origin: 'http://127.0.0.1:4173',
      },
      body: JSON.stringify({ locale: 'en-US' }),
    })
    return { status: response.status, body: await response.json() as GenerationBody }
  }

  test('reserves the final gift atomically under concurrent accounts', async () => {
    const auxiliaryIds: string[] = []
    try {
      for (const suffix of ['a', 'b']) {
        const created = await admin.auth.admin.createUser({
          email: `r3-gift-${suffix}-${randomUUID()}@example.test`,
          email_confirm: true,
          user_metadata: { locale: 'en-US', country_code: 'US', product_region: 'intl' },
        })
        if (created.error || !created.data.user) throw created.error ?? new Error('gift_user_missing')
        auxiliaryIds.push(created.data.user.id)
      }
      sql(`
        update public.profiles set onboarding_status='complete',product_region='intl'
        where user_id in ('${auxiliaryIds[0]}','${auxiliaryIds[1]}');
        update public.first_plan_campaigns
        set enabled=true,total_budget_usd=2.50,remaining_budget_usd=2.50,
            reservation_cost_usd=2.50,min_remaining_usd=0
        where id='20000000-0000-4000-8000-000000000001';
      `)
      const results = await Promise.all(auxiliaryIds.map((id) => admin.rpc('reserve_first_plan_gift', {
        p_user_id: id,
      })))
      expect(results.filter((result) => !result.error)).toHaveLength(1)
      expect(results.filter((result) => result.error?.message.includes('gift_budget_unavailable')))
        .toHaveLength(1)
      const { count } = await admin.from('gift_reservations').select('id', { count: 'exact', head: true })
        .in('user_id', auxiliaryIds)
      expect(count).toBe(1)
    } finally {
      await Promise.all(auxiliaryIds.map((id) => admin.auth.admin.deleteUser(id)))
      sql(`
        update public.first_plan_campaigns
        set enabled=true,total_budget_usd=100,remaining_budget_usd=100,
            reservation_cost_usd=2.50,min_remaining_usd=0
        where id='20000000-0000-4000-8000-000000000001';
      `)
    }
  })

  test('completes gift cycle one, stable payment recovery, and paid cycle two', async ({ page }) => {
    test.setTimeout(120_000)
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: authStorageKey,
      value: browserSession,
    })
    await page.goto('/en/app/today')
    await expect(page).toHaveURL(/\/en\/app\/today/)
    await expect(page.locator('a[href="/en/app/today"]:visible').first()).toBeVisible()

    const monthOneKey = `r3-month-one-${randomUUID()}`
    const monthOne = await generate(monthOneKey)
    expect(monthOne.status, JSON.stringify(monthOne.body)).toBe(201)
    expect(monthOne.body.job?.status).toBe('ready')
    const monthOneJobId = monthOne.body.job!.id

    const retry = await generate(monthOneKey)
    expect(retry.status, JSON.stringify(retry.body)).toBe(200)
    expect(retry.body.job?.id).toBe(monthOneJobId)
    expect(retry.body.idempotent_replay).toBe(true)

    const early = await generate(`r3-too-early-${randomUUID()}`)
    expect(early.status).toBe(409)
    expect(early.body.error?.code).toBe('PERIOD_ALREADY_CONSUMED')

    const { data: firstPeriod } = await admin.from('monthly_plan_periods')
      .select('id,ready_at,starts_at,ends_at,imported_plan_version_id')
      .eq('user_id', userId).eq('cycle_index', 1).single()
    expect(firstPeriod?.ready_at).toBe(firstPeriod?.starts_at)
    expect(Date.parse(firstPeriod!.ends_at)).toBeGreaterThan(Date.parse(firstPeriod!.ready_at))

    sql(`
      update public.monthly_plan_periods
      set ready_at=statement_timestamp()-interval '31 days',
          starts_at=statement_timestamp()-interval '31 days'
      where user_id='${userId}' and cycle_index=1;
      update public.entitlements set status='expired',period_end=statement_timestamp()-interval '1 day'
      where user_id='${userId}' and source='gift';
      insert into public.entitlements(user_id,source,status,period_start,period_end,plan_generation_limit)
      values ('${userId}','subscription','active',statement_timestamp()-interval '1 minute',statement_timestamp()+interval '40 days',1);
      update public.profiles set payment_method_status='not_collected' where user_id='${userId}';
    `)

    const monthTwoKey = `r3-month-two-${randomUUID()}`
    const paymentRequired = await generate(monthTwoKey)
    expect(paymentRequired.status).toBe(402)
    expect(paymentRequired.body.error?.code).toBe('PAYMENT_METHOD_REQUIRED')

    const { count: jobsBeforeRecovery } = await admin.from('ai_generation_jobs')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId)
    expect(jobsBeforeRecovery).toBe(1)

    sql(`update public.profiles set payment_method_status='stub_recorded' where user_id='${userId}';`)
    const monthTwo = await generate(monthTwoKey)
    expect(monthTwo.status, JSON.stringify(monthTwo.body)).toBe(201)
    expect(monthTwo.body.job?.status).toBe('ready')
    expect(monthTwo.body.job?.id).not.toBe(monthOneJobId)

    const [{ count: jobs }, { count: versions }, { count: periods }, { count: plans }] = await Promise.all([
      admin.from('ai_generation_jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.from('plan_versions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.from('monthly_plan_periods').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.from('plans').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    expect({ jobs, versions, periods, plans }).toEqual({ jobs: 2, versions: 2, periods: 2, plans: 2 })

    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)))
    })
    const dashboardResponse = page.waitForResponse((response) =>
      response.url().includes('/functions/v1/account-data') &&
      response.request().postData()?.includes('dashboard') === true
    )
    await page.reload()
    const dashboardHttp = await dashboardResponse
    expect(dashboardHttp.status(), await dashboardHttp.text()).toBe(200)
    await expect(page.getByRole('heading', { name: /good morning, r3 lifecycle/i }))
      .toBeVisible({ timeout: 20_000 })
    await page.locator('a[href="/en/app/plan"]:visible').first().click()
    await expect(page).toHaveURL(/\/en\/app\/plan/)
    await expect(page.getByText(/cycle 2 imported/i)).toBeVisible()
  })
})
