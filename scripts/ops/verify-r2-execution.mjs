import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))

function localEnvironment() {
  let output
  try {
    output = execFileSync(supabaseCli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Local Supabase is not running.')
  }
  const environment = JSON.parse(output.slice(output.indexOf('{')))
  for (const key of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
    if (!environment[key]) throw new Error(`Local Supabase did not expose ${key}.`)
  }
  return environment
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function success(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`)
  return result.data
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function monday(value) {
  const date = new Date(`${value}T12:00:00Z`)
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1))
  return date.toISOString().slice(0, 10)
}

const environment = localEnvironment()
const admin = client(environment.API_URL, environment.SERVICE_ROLE_KEY)
const email = `r2-execution-${randomUUID()}@example.test`
const password = `R2-Execution-${randomUUID()}-aA1!`
const today = new Date().toISOString().slice(0, 10)
const planId = randomUUID()
const versionId = randomUUID()
let userId

try {
  const created = success(await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { locale: 'en-US', country_code: 'US', product_region: 'intl' },
  }), 'Could not create the execution smoke user')
  userId = created.user.id

  const content = {
    plan_name: 'R2 execution smoke',
    default_targets: { calories: 2000, protein_g: 120, carbs_g: 220, fat_g: 70 },
    days: [{
      day_index: 0,
      meals: [{
        slot_key: 'lunch',
        title: 'Lunch',
        options: [{
          option_key: 'smoke-lunch',
          title: 'Smoke lunch',
          nutrition: { calories: 500, protein_g: 35, carbs_g: 55, fat_g: 15 },
        }],
      }],
      workout: {
        title: 'Strength',
        exercises: [
          {
            exercise_id: 'exercise:bodyweight-squat@v2',
            exercise_key: 'squat',
            name: 'Bodyweight squat',
            sets: 1,
            reps: '8',
            rest_seconds: 60,
            substitution_exercise_id: 'exercise:sit-to-stand@v2',
            substitution: 'Sit to stand',
          },
          {
            exercise_id: 'exercise:wall-pushup@v2',
            exercise_key: 'push',
            name: 'Wall push-up',
            sets: 1,
            reps: '8',
            rest_seconds: 60,
            substitution_exercise_id: 'exercise:knee-pushup@v2',
            substitution: 'Knee push-up',
          },
        ],
      },
    }],
  }
  const fixtureSql = `
    begin;
    update public.profiles set timezone = 'UTC', locale = 'en-US' where user_id = '${userId}';
    insert into public.plans(id,user_id,name,status,valid_from,valid_to,locale,active_version_id)
    values ('${planId}','${userId}','R2 execution smoke','active','${today}','${today}','en-US','${versionId}');
    insert into public.plan_versions(id,plan_id,user_id,version,schema_version,source,content,content_sha256)
    values ('${versionId}','${planId}','${userId}',1,'1.0.0','admin','${JSON.stringify(content).replaceAll("'", "''")}'::jsonb,'${'a'.repeat(64)}');
    commit;
  `
  execFileSync('docker', ['exec', '-i', 'supabase_db_momentum', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: fixtureSql,
    stdio: ['pipe', 'ignore', 'pipe'],
  })

  const authenticated = client(environment.API_URL, environment.ANON_KEY)
  success(await authenticated.auth.signInWithPassword({ email, password }), 'Smoke user sign-in failed')

  const mealKey = `meal-select-${randomUUID()}`
  const mealBody = { action: 'select-meal', local_date: today, slot_key: 'lunch', option_key: 'smoke-lunch' }
  success(await authenticated.functions.invoke('account-data', { body: mealBody, headers: { 'Idempotency-Key': mealKey } }), 'Meal selection failed')
  success(await authenticated.functions.invoke('account-data', { body: mealBody, headers: { 'Idempotency-Key': mealKey } }), 'Meal selection replay failed')
  success(await authenticated.functions.invoke('account-data', { body: { ...mealBody, action: 'complete-meal' }, headers: { 'Idempotency-Key': `meal-complete-${randomUUID()}` } }), 'Meal completion failed')
  success(await authenticated.functions.invoke('account-data', { body: { ...mealBody, action: 'undo-meal' }, headers: { 'Idempotency-Key': `meal-undo-${randomUUID()}` } }), 'Meal undo failed')

  const workoutKey = `${planId}-0`
  const session = success(await authenticated.rpc('start_workout_session', { p_local_date: today, p_workout_key: workoutKey }), 'Workout start failed')
  const mutate = (action, exerciseKey, setNumber, values, key) => authenticated.rpc('mutate_workout_session', {
    p_session_id: session.id,
    p_action: action,
    p_exercise_key: exerciseKey,
    p_set_number: setNumber,
    p_values: values,
    p_idempotency_key: key,
  })
  const pauseKey = `workout-pause-${randomUUID()}`
  success(await mutate('pause', null, null, {}, pauseKey), 'Workout pause failed')
  const pauseReplay = success(await mutate('pause', null, null, {}, pauseKey), 'Workout pause replay failed')
  assert(pauseReplay.status === 'paused', 'Pause replay returned the wrong state.')
  success(await mutate('resume', null, null, {}, `workout-resume-${randomUUID()}`), 'Workout resume failed')
  success(await mutate('update_set', 'squat', 1, { completed: true, reps: 8, rpe: 7 }, `workout-set-${randomUUID()}`), 'Workout set failed')
  success(await mutate('report_pain', null, null, { area: 'left knee', severity: 2 }, `workout-pain-${randomUUID()}`), 'Pain log failed')
  success(await mutate('substitute_exercise', 'squat', null, { exercise_id: 'exercise:sit-to-stand@v2' }, `workout-sub-${randomUUID()}`), 'Workout substitution failed')
  success(await mutate('complete_exercise', 'squat', null, {}, `workout-complete-${randomUUID()}`), 'Exercise completion failed')
  success(await mutate('skip_exercise', 'push', null, { reason: 'equipment unavailable' }, `workout-skip-${randomUUID()}`), 'Exercise skip failed')
  const finishKey = `workout-finish-${randomUUID()}`
  success(await mutate('finish', null, null, {}, finishKey), 'Workout finish failed')
  const finishReplay = success(await mutate('finish', null, null, {}, finishKey), 'Workout finish replay failed')
  assert(finishReplay.status === 'completed', 'Finish replay returned the wrong state.')

  const dailyKey = `daily-checkin-${randomUUID()}`
  const dailyBody = {
    action: 'save-daily', local_date: today, timezone: 'UTC',
    checkin: { energyScore: 4, hungerScore: 3, moodScore: 4, sleepMinutes: 450, painScore: 0, recoveryScore: 4, redFlags: [] },
  }
  success(await authenticated.functions.invoke('checkins', { body: dailyBody, headers: { 'Idempotency-Key': dailyKey } }), 'Daily check-in failed')
  success(await authenticated.functions.invoke('checkins', { body: dailyBody, headers: { 'Idempotency-Key': dailyKey } }), 'Daily check-in replay failed')
  success(await authenticated.functions.invoke('checkins', {
    body: {
      action: 'save-weekly', week_start: monday(today), timezone: 'UTC',
      checkin: { overallScore: 4, recoveryTrend: 'stable', trainingTrend: 'same', painTrend: 'no_pain', circumstancesChanged: false, conditionChange: 'none', redFlags: [] },
    },
    headers: { 'Idempotency-Key': `weekly-checkin-${randomUUID()}` },
  }), 'Weekly check-in failed')

  const countResults = await Promise.all([
    authenticated.from('workout_sessions').select('*', { count: 'exact', head: true }),
    authenticated.from('daily_checkins').select('*', { count: 'exact', head: true }),
    authenticated.from('weekly_checkins').select('*', { count: 'exact', head: true }),
    authenticated.from('ai_generation_jobs').select('*', { count: 'exact', head: true }),
  ])
  const countError = countResults.find((result) => result.error)?.error
  if (countError) throw new Error(`Could not verify execution counts: ${countError.message}`)
  const counts = countResults.map((result) => result.count)
  assert(JSON.stringify(counts) === JSON.stringify([1, 1, 1, 0]), `Unexpected execution counts: ${JSON.stringify(counts)}`)

  console.log(JSON.stringify({ authenticated: true, meals: 'select-complete-undo', workout: finishReplay.status, daily_checkins: 1, weekly_checkins: 1, ai_jobs: 0 }))
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId)
}
