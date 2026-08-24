import { authenticate } from '../_shared/auth.ts'
import { integerEnv, optionalEnv } from '../_shared/config.ts'
import { canonicalJson, sha256 } from '../_shared/crypto.ts'
import {
  assertAllowedOrigin,
  errorResponse,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  requireIdempotencyKey,
} from '../_shared/http.ts'
import { enforceRateLimit } from '../_shared/limits.ts'
import { assertCatalogGenerationGate } from '../_shared/catalog-gate.ts'
import {
  loadPlanCatalog,
  planCatalogPromptContext,
  resolveDeclaredAllergenIds,
} from '../_shared/plan-catalog.ts'
import { assertGeneratedPlan, generatedPlanJsonSchema } from '../_shared/plan-contract.ts'
import { MONTHLY_PLAN_DAYS, PLAN_SCHEMA_VERSION } from '../_shared/plan-provider.ts'
import {
  buildValidatedDeterministicStarter,
  STARTER_TEMPLATE_VERSION,
} from '../_shared/deterministic-starter.ts'
import {
  accountHash,
  beginDeletionRow,
  failDeletionRow,
  failExportRow,
  finalizeExportRow,
  getDeletionRow,
  getExportRow,
  loadCurrentLegalVersions,
  markDeletionSessionsRevoked,
  recordDeletionReceipt,
  requestExportRow,
  revokeAccountSessions,
} from './privacy.ts'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface AccountDataBody {
  action?: unknown
  confirmation?: unknown
  local_date?: unknown
  slot_key?: unknown
  option_key?: unknown
  measurement_id?: unknown
  plan?: unknown
  source_kind?: unknown
  note?: unknown
}

const EXPORT_TABLES = [
  'profiles',
  'onboarding_drafts',
  'goals',
  'dietary_preferences',
  'health_context',
  'body_composition_measurements',
  'training_schedule_items',
  'subscriptions',
  'entitlements',
  'usage_ledger',
  'ai_generation_jobs',
  'plans',
  'plan_versions',
  'starter_plan_activations',
  'external_plan_imports',
  'gift_reservations',
  'monthly_plan_periods',
  'monthly_plan_snapshots',
  'next_cycle_inputs',
  'daily_checkins',
  'weekly_checkins',
  'daily_meal_status',
  'extra_food_logs',
  'workout_sessions',
  'workout_exercise_logs',
  'workout_set_logs',
  'ai_safety_reports',
  'export_requests',
  'deletion_requests',
] as const

const EXPORT_PAGE_SIZE = 500
const MAX_EXPORT_ROWS_PER_TABLE = 50_000
const MAX_ACCOUNT_FILES = 5_000

async function selectAllOwnedRows(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  table: typeof EXPORT_TABLES[number],
  userId: string,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let offset = 0; offset < MAX_EXPORT_ROWS_PER_TABLE; offset += EXPORT_PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + EXPORT_PAGE_SIZE - 1)
    if (error) {
      throw new HttpError(503, 'account_export_failed', 'Account export is unavailable.')
    }
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < EXPORT_PAGE_SIZE) return rows
  }
  throw new HttpError(
    413,
    'account_export_requires_async_job',
    'This account is too large for a synchronous export.',
  )
}

async function listAllAccountFiles(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
): Promise<string[]> {
  const folders = [userId]
  const paths: string[] = []
  while (folders.length) {
    const folder = folders.shift()!
    for (let offset = 0;; offset += 100) {
      const { data, error } = await admin.storage
        .from('body-composition')
        .list(folder, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) {
        throw new HttpError(503, 'account_storage_list_failed', 'Private files are unavailable.')
      }
      for (const item of data ?? []) {
        const path = `${folder}/${item.name}`
        if (item.id) paths.push(path)
        else folders.push(path)
        if (paths.length + folders.length > MAX_ACCOUNT_FILES) {
          throw new HttpError(
            413,
            'account_files_require_async_job',
            'This account has too many private files for a synchronous operation.',
          )
        }
      }
      if ((data?.length ?? 0) < 100) break
    }
  }
  return paths
}

async function createPortableFileLinks(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  paths: string[],
) {
  const result: Array<{ path: string; signed_url: string; expires_in_seconds: number }> = []
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100)
    const { data, error } = await admin.storage
      .from('body-composition')
      .createSignedUrls(batch, 600)
    if (error) {
      throw new HttpError(503, 'account_export_failed', 'Private file export is unavailable.')
    }
    for (const item of data ?? []) {
      if (item.signedUrl && item.path) {
        result.push({ path: item.path, signed_url: item.signedUrl, expires_in_seconds: 600 })
      }
    }
  }
  return result
}

async function hydratePortableFileLinks(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const paths = Array.isArray(payload.private_files)
    ? payload.private_files.flatMap((item) =>
      isRecord(item) && typeof item.path === 'string' ? [item.path] : []
    )
    : []
  return {
    ...payload,
    private_files: await createPortableFileLinks(admin, paths),
    note: paths.length
      ? 'Private file links are generated when this archive is downloaded and expire after 10 minutes.'
      : 'This archive contains no private report files.',
  }
}

async function exportAccountData(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  email: string | undefined,
): Promise<Record<string, unknown>> {
  const results = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      return [table, await selectAllOwnedRows(admin, table, userId)] as const
    }),
  )
  const privateFiles = (await listAllAccountFiles(admin, userId)).map((path) => ({ path }))
  return {
    schema_version: 'momentum-account-export-v1',
    generated_at: new Date().toISOString(),
    account: { id: userId, email: email ?? null },
    data: Object.fromEntries(results),
    private_files: privateFiles,
    note: 'Private file links are generated only when the archive is downloaded.',
  }
}

async function latestNextCycleNote(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
): Promise<{ period_id: string | null; note: string }> {
  const { data: period, error: periodError } = await admin
    .from('monthly_plan_periods')
    .select('id')
    .eq('user_id', userId)
    .order('cycle_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (periodError) throw new HttpError(503, 'next_cycle_note_failed', 'The next-cycle note is unavailable.')
  if (!period) return { period_id: null, note: '' }
  const { data: input, error: inputError } = await admin
    .from('next_cycle_inputs')
    .select('note')
    .eq('period_id', period.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (inputError) throw new HttpError(503, 'next_cycle_note_failed', 'The next-cycle note is unavailable.')
  return { period_id: period.id, note: typeof input?.note === 'string' ? input.note : '' }
}

async function saveNextCycleNote(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  note: unknown,
): Promise<{ saved: true; note: string }> {
  if (typeof note !== 'string' || note.length > 500) {
    throw new HttpError(400, 'invalid_next_cycle_note', 'The next-cycle note is invalid.')
  }
  const current = await latestNextCycleNote(admin, userId)
  if (!current.period_id) {
    throw new HttpError(409, 'next_cycle_period_unavailable', 'No plan period is available for this note.')
  }
  const { data: updated, error: updateError } = await admin
    .from('next_cycle_inputs')
    .update({ note: note || null })
    .eq('period_id', current.period_id)
    .eq('user_id', userId)
    .select('period_id')
    .maybeSingle()
  if (updateError) throw new HttpError(503, 'next_cycle_note_failed', 'The next-cycle note could not be saved.')
  if (!updated) {
    const { error: insertError } = await admin.from('next_cycle_inputs').insert({
      period_id: current.period_id,
      user_id: userId,
      note: note || null,
    })
    if (insertError) throw new HttpError(503, 'next_cycle_note_failed', 'The next-cycle note could not be saved.')
  }
  return { saved: true, note }
}

async function deleteAccountStorageAndIdentity(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
): Promise<void> {
  const paths = await listAllAccountFiles(admin, userId)
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error: removeError } = await admin.storage
      .from('body-composition')
      .remove(paths.slice(offset, offset + 100))
    if (removeError) {
      throw new HttpError(
        503,
        'account_delete_storage_failed',
        'Private files could not be removed.',
      )
    }
  }
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    throw new HttpError(503, 'account_delete_failed', 'Account deletion could not be completed.')
  }
}

async function completeAccountDeletion(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
): Promise<void> {
  const hash = await accountHash(userId)
  try {
    await revokeAccountSessions(admin, userId)
    await markDeletionSessionsRevoked(admin, userId)
    await deleteAccountStorageAndIdentity(admin, userId)
  } catch (error) {
    await failDeletionRow(
      admin,
      userId,
      error instanceof HttpError ? error.code : 'account_delete_failed',
    ).catch(() => undefined)
    await recordDeletionReceipt(admin, hash, 'failed').catch(() => undefined)
    throw error
  }
  await recordDeletionReceipt(admin, hash, 'completed')
}

interface DashboardInput {
  action: 'dashboard'
  localDate: string
}

interface DashboardRequest {
  action: 'dashboard'
  requestedLocalDate?: string
}

type MealMutationAction = 'select-meal' | 'complete-meal' | 'undo-meal'

interface MealMutationRequest {
  action: MealMutationAction
  requestedLocalDate?: string
  slotKey: string
  optionKey: string
}

function parseLocalDate(value: unknown): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    throw new HttpError(400, 'invalid_local_date', 'Local date must use YYYY-MM-DD.')
  }
  const parsedDate = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, 'invalid_local_date', 'Local date is invalid.')
  }
  return value
}

function parseMealMutation(
  body: AccountDataBody,
  action: MealMutationAction,
): MealMutationRequest {
  if (body.action !== action) {
    throw new HttpError(400, 'unsupported_action', 'Meal action is unsupported.')
  }
  const requestedLocalDate = body.local_date === undefined
    ? undefined
    : parseLocalDate(body.local_date)
  if (typeof body.slot_key !== 'string' || !KEY_PATTERN.test(body.slot_key)) {
    throw new HttpError(400, 'invalid_slot_key', 'Meal slot key is invalid.')
  }
  if (typeof body.option_key !== 'string' || !KEY_PATTERN.test(body.option_key)) {
    throw new HttpError(400, 'invalid_option_key', 'Meal option key is invalid.')
  }
  return {
    action,
    requestedLocalDate,
    slotKey: body.slot_key,
    optionKey: body.option_key,
  }
}

function parseDashboard(body: AccountDataBody): DashboardRequest {
  if (body.action !== 'dashboard') {
    throw new HttpError(400, 'unsupported_action', 'Action is unsupported.')
  }
  return {
    action: 'dashboard',
    requestedLocalDate: body.local_date === undefined ? undefined : parseLocalDate(body.local_date),
  }
}

function isoDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

async function resolveCurrentLocalDate(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  requestedLocalDate?: string,
): Promise<string> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('timezone')
    .eq('user_id', userId)
    .single()
  if (error || typeof profile?.timezone !== 'string') {
    throw new HttpError(
      409,
      'profile_timezone_unavailable',
      'Set a valid profile timezone before using day-based features.',
    )
  }

  let localDate: string
  try {
    localDate = isoDateInTimezone(profile.timezone)
  } catch {
    throw new HttpError(
      409,
      'invalid_profile_timezone',
      'The saved profile timezone is invalid.',
    )
  }
  if (requestedLocalDate && requestedLocalDate !== localDate) {
    throw new HttpError(
      409,
      'local_date_mismatch',
      'The requested date is not the current date in the saved profile timezone.',
    )
  }
  return localDate
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function projectPlanAiAccess(
  profile: Record<string, unknown> | null,
  emailConfirmed: boolean,
): {
  state: 'ready' | 'pending_verification' | 'disabled' | 'safety_blocked'
  reason: string
} {
  if (profile?.onboarding_status === 'automation_blocked') {
    return { state: 'safety_blocked', reason: 'human_review_required' }
  }
  if (!emailConfirmed) {
    return { state: 'pending_verification', reason: 'email_confirmation_required' }
  }
  if (
    optionalEnv('AI_MASTER_ENABLED')?.toLowerCase() !== 'true' ||
    optionalEnv('AI_PLAN_ENABLED')?.toLowerCase() !== 'true'
  ) {
    return { state: 'disabled', reason: 'feature_switch_off' }
  }
  return { state: 'ready', reason: 'eligible' }
}

function projectNutrition(value: unknown): Record<string, number | string> | null {
  if (!isRecord(value)) return null
  const projected: Record<string, number | string> = {}
  for (const key of ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g']) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) return null
    projected[key] = value[key] as number
  }
  if (!['low', 'medium', 'high'].includes(String(value.confidence))) return null
  const source = String(value.source)
  if (
    ![
      'model_estimate',
      'catalog_reference',
      'food_label',
      'verified_database',
      'user_provided',
    ].includes(source)
  ) return null
  projected.confidence = String(value.confidence)
  projected.source = source
  return projected
}

function projectIngredients(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.name !== 'string' ||
      typeof item.amount !== 'number' ||
      typeof item.unit !== 'string'
    ) return []
    return [{
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      note: typeof item.note === 'string' ? item.note : null,
    }]
  })
}

function projectRecipe(value: unknown): Record<string, unknown> | null {
  if (value === null) return null
  if (
    !isRecord(value) ||
    !Number.isInteger(value.prep_minutes) ||
    !Number.isInteger(value.cook_minutes) ||
    !Array.isArray(value.steps)
  ) return null
  return {
    prep_minutes: value.prep_minutes,
    cook_minutes: value.cook_minutes,
    steps: value.steps.filter((item): item is string => typeof item === 'string'),
  }
}

function projectTargets(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null
  const projected: Record<string, number> = {}
  for (const key of ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'water_ml']) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) return null
    projected[key] = value[key] as number
  }
  return projected
}

function projectWorkout(value: unknown): Record<string, unknown> | null {
  if (value === null) return null
  if (
    !isRecord(value) ||
    typeof value.title !== 'string' ||
    !Number.isInteger(value.duration_minutes) ||
    typeof value.intensity !== 'string' ||
    !Array.isArray(value.exercises)
  ) return null
  const exercises = value.exercises.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.exercise_key !== 'string' ||
      typeof item.name !== 'string' ||
      !Number.isInteger(item.sets) ||
      typeof item.reps !== 'string' ||
      !Number.isInteger(item.rest_seconds)
    ) return []
    return [{
      exercise_key: item.exercise_key,
      name: item.name,
      sets: item.sets,
      reps: item.reps,
      rest_seconds: item.rest_seconds,
      equipment: Array.isArray(item.equipment)
        ? item.equipment.filter((entry): entry is string => typeof entry === 'string')
        : [],
      intensity_note: typeof item.intensity_note === 'string' ? item.intensity_note : null,
      substitution: typeof item.substitution === 'string' ? item.substitution : null,
    }]
  })
  if (exercises.length === 0) return null
  return {
    title: value.title,
    duration_minutes: value.duration_minutes,
    intensity: value.intensity,
    warmup: Array.isArray(value.warmup)
      ? value.warmup.filter((item): item is string => typeof item === 'string')
      : [],
    exercises,
    cooldown: Array.isArray(value.cooldown)
      ? value.cooldown.filter((item): item is string => typeof item === 'string')
      : [],
    safety_note: typeof value.safety_note === 'string' ? value.safety_note : null,
  }
}

function projectGroceryList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.flatMap((group) => {
    if (!isRecord(group) || typeof group.category !== 'string') return []
    const items = projectIngredients(group.items)
    if (items.length === 0) return []
    return [{ category: group.category, items }]
  })
}

function differenceInDays(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  )
}

function addIsoDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function catalogReleaseFromContent(content: unknown): string | null {
  if (!isRecord(content)) return null
  if (typeof content.catalog_release_id === 'string' && content.catalog_release_id.length > 0) {
    return content.catalog_release_id
  }
  const days = Array.isArray(content.days) ? content.days : []
  for (const day of days) {
    if (!isRecord(day) || !Array.isArray(day.meals)) continue
    for (const meal of day.meals) {
      if (!isRecord(meal) || !Array.isArray(meal.options)) continue
      for (const option of meal.options) {
        if (!isRecord(option) || typeof option.food_id !== 'string') continue
        const marker = option.food_id.lastIndexOf('@')
        if (marker >= 0 && marker < option.food_id.length - 1) {
          return `momentum-core@${option.food_id.slice(marker + 1)}`
        }
      }
    }
  }
  return null
}

function projectPlanVersionChanges(input: {
  cycle: number
  locale: string
  catalogRelease: string | null
  source: string
}): Array<{ label: string; detail: string }> {
  const changes = [{
    label: `cycle ${input.cycle} imported`,
    detail: `${input.source} · locale ${input.locale}`,
  }]
  if (input.catalogRelease) {
    changes.push({
      label: 'catalog release',
      detail: input.catalogRelease,
    })
  }
  return changes
}

function projectPlanHistory(options: {
  plans: Array<Record<string, unknown>>
  versions: Array<Record<string, unknown>>
  periods: Array<Record<string, unknown>>
}): Array<Record<string, unknown>> {
  const plans = new Map(
    options.plans
      .filter((plan) => typeof plan.id === 'string')
      .map((plan) => [plan.id as string, plan]),
  )
  const periodsByVersion = new Map<string, Record<string, unknown>>()
  for (const period of options.periods) {
    if (typeof period.imported_plan_version_id !== 'string') continue
    periodsByVersion.set(period.imported_plan_version_id, period)
  }
  const activeVersionIds = new Set(
    options.plans
      .filter((plan) => plan.status === 'active' && typeof plan.active_version_id === 'string')
      .map((plan) => plan.active_version_id as string),
  )

  return options.versions.flatMap((version) => {
    if (typeof version.id !== 'string' || typeof version.plan_id !== 'string') return []
    const plan = plans.get(version.plan_id)
    if (!plan || typeof plan.valid_from !== 'string' || typeof plan.valid_to !== 'string') return []
    const period = periodsByVersion.get(version.id)
    const cycle = typeof period?.cycle_index === 'number' && period.cycle_index > 0
      ? period.cycle_index
      : typeof version.version === 'number' && version.version > 0
      ? version.version
      : 1
    const locale = plan.locale === 'fa-IR' ? 'fa-IR' : 'en-US'
    const catalogRelease = catalogReleaseFromContent(version.content)
    const source = typeof version.source === 'string' ? version.source : 'imported'
    const readyAt = typeof period?.ready_at === 'string'
      ? period.ready_at
      : typeof version.created_at === 'string'
      ? version.created_at
      : null
    return [{
      id: version.id,
      cycle,
      valid_from: plan.valid_from,
      valid_to: plan.valid_to,
      ready_at: readyAt,
      active: activeVersionIds.has(version.id),
      locale,
      catalog_release: catalogRelease,
      source,
      schema_version: typeof version.schema_version === 'string' ? version.schema_version : '1.0.0',
      changes: projectPlanVersionChanges({
        cycle,
        locale,
        catalogRelease,
        source,
      }),
    }]
  })
}

function projectPlanDay(options: {
  plan: Record<string, unknown>
  version: Record<string, unknown>
  localDate: string
  statuses: Array<Record<string, unknown>>
}): Record<string, unknown> | null {
  const content = options.version.content
  if (!isRecord(content) || !Array.isArray(content.days)) return null
  if (content.content_locale !== 'fa-IR' && content.content_locale !== 'en-US') return null
  if (typeof options.plan.valid_from !== 'string') return null
  const dayOffset = differenceInDays(options.plan.valid_from, options.localDate)
  if (dayOffset < 0) return null
  const templateLength = content.days.length
  const wrappedIndex = templateLength > 0 ? dayOffset % templateLength : dayOffset
  const rawDay = content.days.find(
    (item) => isRecord(item) && item.day_index === wrappedIndex,
  )
  if (!isRecord(rawDay) || !Array.isArray(rawDay.meals)) return null
  const statuses = new Map(
    options.statuses
      .filter((item) => typeof item.slot_key === 'string')
      .map((item) => [item.slot_key as string, item]),
  )

  const meals = rawDay.meals.flatMap((rawMeal) => {
    if (
      !isRecord(rawMeal) ||
      typeof rawMeal.slot_key !== 'string' ||
      typeof rawMeal.title !== 'string' ||
      !Array.isArray(rawMeal.options)
    ) return []

    const projectedOptions = rawMeal.options.flatMap((rawOption) => {
      if (
        !isRecord(rawOption) ||
        typeof rawOption.option_key !== 'string' ||
        typeof rawOption.title !== 'string'
      ) return []
      const nutrition = projectNutrition(rawOption.nutrition)
      if (!nutrition) return []
      return [{
        option_key: rawOption.option_key,
        title: rawOption.title,
        ingredients: projectIngredients(rawOption.ingredients),
        nutrition,
        recipe: projectRecipe(rawOption.recipe),
        portable: rawOption.portable === true,
        warnings: Array.isArray(rawOption.warnings)
          ? rawOption.warnings.filter((item): item is string => typeof item === 'string')
          : [],
      }]
    })
    if (projectedOptions.length === 0) return []
    const status = statuses.get(rawMeal.slot_key)
    return [{
      slot_key: rawMeal.slot_key,
      type: typeof rawMeal.type === 'string' ? rawMeal.type : 'meal',
      title: rawMeal.title,
      scheduled_time: typeof rawMeal.scheduled_time === 'string' ? rawMeal.scheduled_time : null,
      default_option_key: typeof rawMeal.default_option_key === 'string'
        ? rawMeal.default_option_key
        : projectedOptions[0]?.option_key,
      selected_option_key: typeof status?.option_key === 'string' ? status.option_key : null,
      completion_status: typeof status?.status === 'string' ? status.status : 'planned',
      completed_at: typeof status?.completed_at === 'string' ? status.completed_at : null,
      options: projectedOptions,
    }]
  })
  if (meals.length === 0) return null

  return {
    id: options.plan.id,
    version_id: options.version.id,
    schema_version: options.version.schema_version,
    content_locale: content.content_locale,
    name: options.plan.name,
    valid_from: options.plan.valid_from,
    valid_to: options.plan.valid_to,
    locale: options.plan.locale,
    summary: typeof content.summary === 'string' ? content.summary : null,
    grocery_list: projectGroceryList(content.grocery_list),
    health_safety_notes: Array.isArray(content.health_safety_notes)
      ? content.health_safety_notes.flatMap((item) => {
        if (
          !isRecord(item) ||
          typeof item.category !== 'string' ||
          typeof item.level !== 'string' ||
          typeof item.note !== 'string'
        ) return []
        return [{ category: item.category, level: item.level, note: item.note }]
      })
      : [],
    day: {
      local_date: options.localDate,
      day_index: dayOffset,
      title: typeof rawDay.title === 'string' ? rawDay.title : null,
      training_type: typeof rawDay.training_type === 'string' ? rawDay.training_type : 'rest',
      target_strategy: isRecord(rawDay.target_strategy) &&
          typeof rawDay.target_strategy.mode === 'string' &&
          typeof rawDay.target_strategy.rationale === 'string'
        ? {
          mode: rawDay.target_strategy.mode,
          rationale: rawDay.target_strategy.rationale,
        }
        : null,
      targets: projectTargets(rawDay.targets),
      workout: projectWorkout(rawDay.workout),
      meals,
    },
  }
}

async function loadDashboard(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  input: DashboardInput,
  emailConfirmed: boolean,
): Promise<Record<string, unknown>> {
  const now = new Date().toISOString()
  const [
    profileResult,
    goalResult,
    checkinResult,
    recentCheckinsResult,
    latestBodyResult,
    entitlementResult,
    usageResult,
    statusesResult,
    planResult,
    ownedPlansResult,
    versionHistoryResult,
    periodHistoryResult,
    progressSeriesResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'display_name,date_of_birth,sex,height_cm,locale,timezone,country_code,pricing_market,product_region,unit_system,onboarding_status,automation_block_reason,plan_source_preference,ai_billing_country_code,ai_country_verified_at,ai_country_verification_method,payment_method_status,terms_version,privacy_version,health_consent_version,health_data_consent_at',
      )
      .eq('user_id', userId)
      .single(),
    admin
      .from('goals')
      .select(
        'id,goal_type,custom_goal,start_weight_kg,target_weight_kg,journey_start_date,target_date,status',
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    admin
      .from('daily_checkins')
      .select(
        'local_date,weight_kg,waist_cm,sleep_minutes,hunger_score,mood_score,energy_score,water_ml,steps,adherence_percent',
      )
      .eq('user_id', userId)
      .eq('local_date', input.localDate)
      .maybeSingle(),
    admin
      .from('daily_checkins')
      .select(
        'local_date,weight_kg,waist_cm,sleep_minutes,hunger_score,mood_score,energy_score,water_ml,steps,adherence_percent',
      )
      .eq('user_id', userId)
      .lte('local_date', input.localDate)
      .order('local_date', { ascending: false })
      .limit(14),
    admin
      .from('body_composition_measurements')
      .select('id,measured_at,weight_kg,extraction_status')
      .eq('user_id', userId)
      .in('extraction_status', ['confirmed', 'not_requested'])
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('entitlements')
      .select(
        'id,source,status,period_start,period_end,plan_generation_limit',
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('period_start', now)
      .gt('period_end', now)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('usage_ledger')
      .select('entitlement_id,feature,status,units')
      .eq('user_id', userId)
      .in('status', ['reserved', 'completed']),
    admin
      .from('daily_meal_status')
      .select('slot_key,option_key,status,completed_at')
      .eq('user_id', userId)
      .eq('local_date', input.localDate),
    admin
      .from('plans')
      .select('id,name,valid_from,valid_to,locale,active_version_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('valid_from', input.localDate)
      .gte('valid_to', input.localDate)
      .limit(1)
      .maybeSingle(),
    admin
      .from('plans')
      .select('id,name,valid_from,valid_to,locale,status,active_version_id')
      .eq('user_id', userId)
      .order('valid_from', { ascending: false })
      .limit(24),
    admin
      .from('plan_versions')
      .select('id,plan_id,version,schema_version,source,created_at,content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24),
    admin
      .from('monthly_plan_periods')
      .select('cycle_index,ready_at,imported_plan_version_id,status')
      .eq('user_id', userId)
      .order('cycle_index', { ascending: false })
      .limit(24),
    admin.rpc('get_progress_series', {
      p_user_id: userId,
      p_as_of: input.localDate,
    }),
  ])
  if (
    profileResult.error ||
    goalResult.error ||
    checkinResult.error ||
    recentCheckinsResult.error ||
    latestBodyResult.error ||
    entitlementResult.error ||
    usageResult.error ||
    statusesResult.error ||
    planResult.error ||
    ownedPlansResult.error ||
    versionHistoryResult.error ||
    periodHistoryResult.error ||
    progressSeriesResult.error
  ) {
    throw new HttpError(503, 'dashboard_unavailable', 'Dashboard data is unavailable.')
  }

  let planProjection: Record<string, unknown> | null = null
  const activePlan = planResult.data
  if (activePlan?.active_version_id) {
    const { data: version, error } = await admin
      .from('plan_versions')
      .select('id,schema_version,content')
      .eq('id', activePlan.active_version_id)
      .eq('user_id', userId)
      .single()
    if (!error && version) {
      const currentProjection = projectPlanDay({
        plan: activePlan,
        version,
        localDate: input.localDate,
        statuses: statusesResult.data ?? [],
      })
      if (currentProjection) {
        const validFrom = String(activePlan.valid_from)
        const validTo = String(activePlan.valid_to)
        const dayCount = Math.min(31, differenceInDays(validFrom, validTo) + 1)
        const days = Array.from({ length: Math.max(0, dayCount) }, (_, index) => {
          const localDate = addIsoDays(validFrom, index)
          const projection = projectPlanDay({
            plan: activePlan,
            version,
            localDate,
            statuses: localDate === input.localDate ? (statusesResult.data ?? []) : [],
          })
          return projection && isRecord(projection.day) ? projection.day : null
        }).filter((day): day is Record<string, unknown> => day !== null)
        planProjection = { ...currentProjection, days }
      }
    }
  }

  const planHistory = projectPlanHistory({
    plans: (ownedPlansResult.data ?? []) as Array<Record<string, unknown>>,
    versions: (versionHistoryResult.data ?? []) as Array<Record<string, unknown>>,
    periods: (periodHistoryResult.data ?? []) as Array<Record<string, unknown>>,
  })
  if (planProjection) {
    planProjection = { ...planProjection, history: planHistory }
  }

  const entitlement = entitlementResult.data
  const usageRows = (usageResult.data ?? []).filter((row) =>
    entitlement && row.entitlement_id === entitlement.id
  )
  const used = (feature: 'plan_generation'): number =>
    usageRows
      .filter((row) => row.feature === feature)
      .reduce((sum, row) => sum + Number(row.units ?? 0), 0)
  const entitlementUsage = entitlement
    ? {
      entitlement: {
        id: entitlement.id,
        source: entitlement.source,
        status: entitlement.status,
        period_start: entitlement.period_start,
        period_end: entitlement.period_end,
      },
      plan_generation: {
        used: used('plan_generation'),
        limit: entitlement.plan_generation_limit,
        remaining: Math.max(
          0,
          Number(entitlement.plan_generation_limit) - used('plan_generation'),
        ),
      },
    }
    : null

  return {
    local_date: input.localDate,
    profile: profileResult.data
      ? {
        display_name: profileResult.data.display_name,
        date_of_birth: profileResult.data.date_of_birth,
        sex: profileResult.data.sex,
        height_cm: profileResult.data.height_cm,
        locale: profileResult.data.locale,
        timezone: profileResult.data.timezone,
        country_code: profileResult.data.country_code,
        pricing_market: profileResult.data.pricing_market,
        product_region: profileResult.data.product_region ?? (
          profileResult.data.pricing_market === 'ir' ? 'ir' : 'intl'
        ),
        unit_system: profileResult.data.unit_system,
        onboarding_status: profileResult.data.onboarding_status,
        automation_block_reason: profileResult.data.automation_block_reason,
        plan_source_preference: profileResult.data.plan_source_preference ?? 'momentum',
        email_confirmed: emailConfirmed,
        ai_country_verified: Boolean(
          profileResult.data.ai_billing_country_code &&
            profileResult.data.ai_country_verified_at &&
            profileResult.data.ai_country_verification_method,
        ),
        payment_method_status: profileResult.data.payment_method_status ?? 'not_collected',
        consent_versions: {
          terms: profileResult.data.terms_version ?? null,
          privacy: profileResult.data.privacy_version ?? null,
          health: profileResult.data.health_consent_version ?? null,
        },
        health_data_consent_at: profileResult.data.health_data_consent_at ?? null,
      }
      : null,
    active_goal: goalResult.data,
    checkin: checkinResult.data,
    recent_checkins: recentCheckinsResult.data ?? [],
    latest_body_weight: latestBodyResult.data,
    entitlement_usage: entitlementUsage,
    ai_access: { plan: projectPlanAiAccess(profileResult.data, emailConfirmed) },
    plan: planProjection,
    plan_history: planHistory,
    progress_series: Array.isArray(progressSeriesResult.data) ? progressSeriesResult.data : [],
  }
}

async function loadExternalPlanContext(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
): Promise<Record<string, unknown>> {
  const [profile, goal, dietary, health, training] = await Promise.all([
    admin.from('profiles')
      .select(
        'date_of_birth,sex,height_cm,locale,timezone,country_code,onboarding_status,automation_block_reason,plan_source_preference',
      )
      .eq('user_id', userId).single(),
    admin.from('goals')
      .select('goal_type,start_weight_kg,target_weight_kg,target_date')
      .eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle(),
    admin.from('dietary_preferences')
      .select(
        'dietary_pattern,favorite_foods,disliked_foods,allergies,requested_meal_pattern,preferred_option_count,cooking_constraints,available_equipment,work_schedule,budget_tier,restaurant_meals_per_week,restaurant_preferences,grocery_preferences,cuisine_region',
      )
      .eq('user_id', userId).single(),
    admin.from('health_context')
      .select('medical_considerations,medications,supplements,clinician_notes')
      .eq('user_id', userId).maybeSingle(),
    admin.from('training_schedule_items')
      .select('weekday,activity_type,local_start_time,duration_minutes,intensity,notes')
      .eq('user_id', userId).order('weekday'),
  ])
  if (profile.error || goal.error || dietary.error || health.error || training.error) {
    throw new HttpError(503, 'external_plan_context_unavailable', 'Plan context is unavailable.')
  }
  if (profile.data.onboarding_status !== 'complete') {
    throw new HttpError(
      409,
      'onboarding_incomplete',
      'Complete onboarding before creating an external plan.',
    )
  }
  if (profile.data.plan_source_preference !== 'external') {
    throw new HttpError(
      409,
      'external_plan_path_not_selected',
      'Select the free external-plan path first.',
    )
  }
  const catalog = await loadPlanCatalog(admin)
  assertCatalogGenerationGate(catalog)
  const declaredAllergenIds = resolveDeclaredAllergenIds(
    catalog,
    Array.isArray(dietary.data.allergies) ? dietary.data.allergies : [],
  )
  const birthDate = new Date(`${profile.data.date_of_birth}T00:00:00Z`)
  const today = new Date()
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear()
  if (
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())
  ) age -= 1
  const minimizedProfile = {
    sex: profile.data.sex,
    height_cm: profile.data.height_cm,
    locale: profile.data.locale,
    timezone: profile.data.timezone,
    country_code: profile.data.country_code,
  }
  return {
    schema_version: PLAN_SCHEMA_VERSION,
    requested_days: MONTHLY_PLAN_DAYS,
    output_schema: generatedPlanJsonSchema,
    catalog: planCatalogPromptContext(catalog),
    declared_allergen_ids: [...declaredAllergenIds],
    profile: { ...minimizedProfile, age },
    goal: goal.data,
    dietary: dietary.data,
    health: health.data,
    training: training.data ?? [],
  }
}

async function importExternalPlan(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  body: AccountDataBody,
  idempotencyKey: string,
) {
  if (!isRecord(body.plan)) {
    throw new HttpError(
      400,
      'invalid_external_plan',
      'Import a JSON object using the Momentum plan contract.',
    )
  }
  if (body.source_kind !== 'external_ai' && body.source_kind !== 'existing_plan') {
    throw new HttpError(400, 'invalid_external_source', 'External plan source is invalid.')
  }
  const [profile, dietary, goal] = await Promise.all([
    admin.from('profiles')
      .select('locale,timezone,onboarding_status,automation_block_reason,plan_source_preference')
      .eq('user_id', userId).single(),
    admin.from('dietary_preferences').select('allergies').eq('user_id', userId).single(),
    admin.from('goals').select('id').eq('user_id', userId).eq('status', 'active').limit(1).single(),
  ])
  if (profile.error || dietary.error || goal.error) {
    throw new HttpError(
      503,
      'external_plan_import_unavailable',
      'External plan import is unavailable.',
    )
  }
  if (profile.data.onboarding_status !== 'complete' || profile.data.automation_block_reason) {
    throw new HttpError(
      409,
      'external_plan_safety_blocked',
      'This profile is not eligible for automated plan import.',
    )
  }
  if (profile.data.plan_source_preference !== 'external') {
    throw new HttpError(
      409,
      'external_plan_path_not_selected',
      'Select the free external-plan path first.',
    )
  }
  const locale = profile.data.locale === 'fa-IR' ? 'fa-IR' : 'en-US'
  const catalog = await loadPlanCatalog(admin)
  assertCatalogGenerationGate(catalog)
  const declaredAllergenIds = resolveDeclaredAllergenIds(
    catalog,
    Array.isArray(dietary.data.allergies) ? dietary.data.allergies : [],
  )
  assertGeneratedPlan(body.plan, MONTHLY_PLAN_DAYS, locale, { catalog, declaredAllergenIds })
  const contentSha256 = await sha256(canonicalJson(body.plan))
  const validFrom = isoDateInTimezone(profile.data.timezone || 'UTC')
  const validTo = addIsoDays(validFrom, MONTHLY_PLAN_DAYS - 1)
  const { data, error } = await admin.rpc('persist_external_plan', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_goal_id: goal.data.id,
    p_plan_name: String(body.plan.plan_name),
    p_valid_from: validFrom,
    p_valid_to: validTo,
    p_locale: locale,
    p_schema_version: PLAN_SCHEMA_VERSION,
    p_catalog_release: catalog.releaseId,
    p_source_kind: body.source_kind,
    p_content: body.plan,
    p_content_sha256: contentSha256,
  })
  if (error) {
    if (error.message.includes('idempotency_key_reused')) {
      throw new HttpError(
        409,
        'idempotency_key_reused',
        'Idempotency key was used for a different plan.',
      )
    }
    throw new HttpError(
      503,
      'external_plan_import_failed',
      'The validated plan could not be saved.',
    )
  }
  return data
}

async function createDeterministicStarterPlan(
  admin: Awaited<ReturnType<typeof authenticate>>['admin'],
  userId: string,
  idempotencyKey: string,
) {
  const [profile, dietary, goal] = await Promise.all([
    admin.from('profiles').select(
      'date_of_birth,locale,timezone,country_code,product_region,onboarding_status,automation_block_reason,plan_source_preference,terms_accepted_at,terms_version,privacy_accepted_at,privacy_version,health_data_consent_at,health_consent_version',
    ).eq('user_id', userId).single(),
    admin.from('dietary_preferences').select('allergies').eq('user_id', userId).single(),
    admin.from('goals').select('id').eq('user_id', userId).eq('status', 'active').limit(1).single(),
  ])
  if (
    profile.error || dietary.error || goal.error || !profile.data.date_of_birth ||
    !profile.data.country_code
  ) {
    throw new HttpError(
      409,
      'starter_plan_profile_incomplete',
      'Complete onboarding before creating a plan.',
    )
  }

  const catalog = await loadPlanCatalog(admin)
  const declaredAllergenIds = resolveDeclaredAllergenIds(
    catalog,
    Array.isArray(dietary.data.allergies) ? dietary.data.allergies : [],
  )
  const content = await buildValidatedDeterministicStarter({
    profile: {
      dateOfBirth: profile.data.date_of_birth,
      locale: profile.data.locale === 'fa-IR' ? 'fa-IR' : 'en-US',
      countryCode: profile.data.country_code,
      productRegion: profile.data.product_region === 'ir' ? 'ir' : 'intl',
      onboardingStatus: profile.data.onboarding_status,
      automationBlockReason: profile.data.automation_block_reason,
      planSourcePreference: profile.data.plan_source_preference,
      termsAcceptedAt: profile.data.terms_accepted_at,
      termsVersion: profile.data.terms_version,
      privacyAcceptedAt: profile.data.privacy_accepted_at,
      privacyVersion: profile.data.privacy_version,
      healthDataConsentAt: profile.data.health_data_consent_at,
      healthConsentVersion: profile.data.health_consent_version,
    },
    catalog,
    declaredAllergenIds,
    consentAdmin: admin,
  })
  const versions = await loadCurrentLegalVersions(admin)
  const contentSha256 = await sha256(canonicalJson(content))
  const validFrom = isoDateInTimezone(profile.data.timezone || 'UTC')
  const validTo = addIsoDays(validFrom, MONTHLY_PLAN_DAYS - 1)
  const { data, error } = await admin.rpc('persist_deterministic_starter_plan', {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_goal_id: goal.data.id,
    p_plan_name: String(content.plan_name),
    p_valid_from: validFrom,
    p_valid_to: validTo,
    p_locale: profile.data.locale === 'fa-IR' ? 'fa-IR' : 'en-US',
    p_schema_version: PLAN_SCHEMA_VERSION,
    p_catalog_release: catalog.releaseId,
    p_template_version: STARTER_TEMPLATE_VERSION,
    p_terms_version: versions.terms,
    p_privacy_version: versions.privacy,
    p_health_consent_version: versions.health,
    p_content: content,
    p_content_sha256: contentSha256,
  })
  if (error) {
    if (error.message.includes('idempotency_key_reused')) {
      throw new HttpError(
        409,
        'idempotency_key_reused',
        'Idempotency key was used for a different plan.',
      )
    }
    if (error.message.includes('starter_plan_gate_failed')) {
      throw new HttpError(
        409,
        'starter_plan_gate_failed',
        'Starter-plan eligibility changed before activation.',
      )
    }
    throw new HttpError(
      503,
      'starter_plan_persist_failed',
      'The validated starter plan could not be saved.',
    )
  }
  return data
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse(request)

  try {
    assertAllowedOrigin(request)
    if (request.method !== 'POST') {
      throw new HttpError(405, 'method_not_allowed', 'Only POST is supported.')
    }

    const auth = await authenticate(request)
    const body = await readJsonBody<AccountDataBody>(request, 2_000_000)
    await enforceRateLimit(
      auth.admin,
      auth.user.id,
      'account-data',
      integerEnv('ACCOUNT_DATA_RATE_LIMIT', 120, { min: 1, max: 600 }),
      integerEnv('ACCOUNT_DATA_RATE_WINDOW_SECONDS', 3600, { min: 60, max: 86_400 }),
    )

    if (body.action === 'dashboard') {
      const dashboardRequest = parseDashboard(body)
      const localDate = await resolveCurrentLocalDate(
        auth.admin,
        auth.user.id,
        dashboardRequest.requestedLocalDate,
      )
      const dashboard = await loadDashboard(
        auth.admin,
        auth.user.id,
        { action: 'dashboard', localDate },
        Boolean(auth.user.email_confirmed_at),
      )
      return jsonResponse(request, { dashboard })
    }

    if (body.action === 'legal-versions') {
      return jsonResponse(request, {
        legal_document_versions: await loadCurrentLegalVersions(auth.admin),
      })
    }

    if (body.action === 'external-plan-context') {
      return jsonResponse(request, {
        external_plan_context: await loadExternalPlanContext(auth.admin, auth.user.id),
      })
    }

    if (body.action === 'export-status') {
      return jsonResponse(request, await getExportRow(auth.admin, auth.user.id, false))
    }

    if (body.action === 'export-download') {
      const current = await getExportRow(auth.admin, auth.user.id, true)
      if (!current.export_request || current.export_request.status === 'pending') {
        throw new HttpError(409, 'export_pending', 'The export is still being prepared.')
      }
      if (current.export_request.status !== 'ready' || !current.export) {
        throw new HttpError(409, 'export_not_ready', 'The export is not ready to download.')
      }
      return jsonResponse(request, {
        ...current,
        export: await hydratePortableFileLinks(auth.admin, current.export),
      })
    }

    if (body.action === 'export-account') {
      const requested = await requestExportRow(auth.admin, auth.user.id)
      if (requested.status === 'ready') {
        const current = await getExportRow(auth.admin, auth.user.id, true)
        return jsonResponse(request, {
          ...current,
          export: current.export
            ? await hydratePortableFileLinks(auth.admin, current.export)
            : null,
        })
      }
      try {
        const payload = await exportAccountData(auth.admin, auth.user.id, auth.user.email)
        const exportRequest = await finalizeExportRow(
          auth.admin,
          auth.user.id,
          requested.id,
          payload,
        )
        return jsonResponse(request, {
          export_request: exportRequest,
          export: await hydratePortableFileLinks(auth.admin, payload),
        })
      } catch (error) {
        await failExportRow(
          auth.admin,
          auth.user.id,
          requested.id,
          error instanceof HttpError ? error.code : 'account_export_failed',
        ).catch(() => undefined)
        throw error
      }
    }

    if (body.action === 'deletion-status') {
      return jsonResponse(request, {
        deletion_request: await getDeletionRow(auth.admin, auth.user.id),
      })
    }

    if (body.action === 'next-cycle-note') {
      return jsonResponse(request, { next_cycle_note: await latestNextCycleNote(auth.admin, auth.user.id) })
    }

    const idempotencyKey = requireIdempotencyKey(request)
    if (body.action === 'import-external-plan') {
      return jsonResponse(request, {
        external_plan_import: await importExternalPlan(
          auth.admin,
          auth.user.id,
          body,
          idempotencyKey,
        ),
      })
    }
    if (body.action === 'save-next-cycle-note') {
      return jsonResponse(request, {
        next_cycle_note: await saveNextCycleNote(auth.admin, auth.user.id, body.note),
      })
    }
    if (body.action === 'delete-account') {
      if (body.confirmation !== 'DELETE') {
        throw new HttpError(
          400,
          'delete_confirmation_required',
          'Type DELETE to confirm account deletion.',
        )
      }
      const lastSignIn = auth.user.last_sign_in_at
        ? Date.parse(auth.user.last_sign_in_at)
        : Number.NaN
      if (!Number.isFinite(lastSignIn) || Date.now() - lastSignIn > 15 * 60 * 1_000) {
        throw new HttpError(
          403,
          'recent_authentication_required',
          'Sign in again before deleting your account.',
        )
      }
      const deletion = await beginDeletionRow(auth.admin, auth.user.id, 'DELETE')
      if (deletion.status === 'pending') {
        await completeAccountDeletion(auth.admin, auth.user.id)
      }
      return jsonResponse(request, { deleted: true, deletion_request: { status: 'completed' } })
    }
    if (body.action === 'complete-onboarding') {
      if (!auth.user.email_confirmed_at) {
        throw new HttpError(
          403,
          'email_confirmation_required',
          'Confirm your email before completing onboarding.',
        )
      }
      const versions = await loadCurrentLegalVersions(auth.admin)
      const { data, error } = await auth.admin.rpc('complete_onboarding', {
        p_user_id: auth.user.id,
        p_idempotency_key: idempotencyKey,
        p_terms_version: versions.terms,
        p_privacy_version: versions.privacy,
        p_health_consent_version: versions.health,
      })
      if (error) {
        if (error.message.includes('idempotency_key_reused')) {
          throw new HttpError(
            409,
            'idempotency_key_reused',
            'Idempotency key was used for a different draft.',
          )
        }
        if (error.message.includes('onboarding_draft_not_found')) {
          throw new HttpError(404, 'onboarding_draft_not_found', 'Onboarding draft was not found.')
        }
        if (error.message.includes('email_confirmation_required')) {
          throw new HttpError(
            403,
            'email_confirmation_required',
            'Confirm your email before completing onboarding.',
          )
        }
        if (error.message.includes('consent_version_stale')) {
          throw new HttpError(
            409,
            'consent_update_required',
            'Current terms, privacy policy, and health-data consent must be accepted.',
          )
        }
        if (
          error.message.includes('onboarding_draft_invalid') ||
          error.message.includes('verified_country_required')
        ) {
          throw new HttpError(
            422,
            'onboarding_draft_invalid',
            'Onboarding draft is incomplete or invalid.',
          )
        }
        throw new HttpError(
          503,
          'onboarding_completion_failed',
          'Onboarding could not be completed.',
        )
      }
      return jsonResponse(request, { onboarding: data })
    }

    if (body.action === 'create-starter-plan') {
      return jsonResponse(request, {
        starter_plan: await createDeterministicStarterPlan(
          auth.admin,
          auth.user.id,
          idempotencyKey,
        ),
      }, 201)
    }

    if (body.action === 'confirm-body-composition') {
      if (
        typeof body.measurement_id !== 'string' ||
        !UUID_PATTERN.test(body.measurement_id)
      ) {
        throw new HttpError(400, 'invalid_measurement_id', 'Measurement ID is invalid.')
      }
      const confirmationInput = {
        action: 'confirm-body-composition',
        measurement_id: body.measurement_id,
      }
      const requestHash = await sha256(canonicalJson(confirmationInput))
      const { data, error } = await auth.admin.rpc('confirm_body_composition', {
        p_user_id: auth.user.id,
        p_measurement_id: body.measurement_id,
        p_idempotency_key: idempotencyKey,
        p_request_sha256: requestHash,
      })
      if (error) {
        if (error.message.includes('idempotency_key_reused')) {
          throw new HttpError(
            409,
            'idempotency_key_reused',
            'Idempotency key was used for different input.',
          )
        }
        if (error.message.includes('body_measurement_not_found')) {
          throw new HttpError(
            404,
            'body_measurement_not_found',
            'Body-composition measurement was not found.',
          )
        }
        if (error.message.includes('body_measurement_not_confirmable')) {
          throw new HttpError(
            409,
            'body_measurement_not_confirmable',
            'This extraction is not awaiting confirmation.',
          )
        }
        throw new HttpError(
          503,
          'body_confirmation_failed',
          'Body-composition values could not be confirmed.',
        )
      }
      return jsonResponse(request, { body_composition: data })
    }

    if (
      body.action !== 'select-meal' &&
      body.action !== 'complete-meal' &&
      body.action !== 'undo-meal'
    ) {
      throw new HttpError(400, 'unsupported_action', 'Action is unsupported.')
    }
    const mealRequest = parseMealMutation(body, body.action)
    const localDate = await resolveCurrentLocalDate(
      auth.admin,
      auth.user.id,
      mealRequest.requestedLocalDate,
    )
    const input = {
      action: mealRequest.action,
      localDate,
      slotKey: mealRequest.slotKey,
      optionKey: mealRequest.optionKey,
    }
    const requestHash = await sha256(canonicalJson(input))
    const rpcName = input.action === 'complete-meal'
      ? 'complete_meal_option'
      : input.action === 'undo-meal'
      ? 'undo_meal_option'
      : 'select_meal_option'
    const { data, error } = await auth.admin.rpc(rpcName, {
      p_user_id: auth.user.id,
      p_local_date: input.localDate,
      p_slot_key: input.slotKey,
      p_option_key: input.optionKey,
      p_idempotency_key: idempotencyKey,
      p_request_sha256: requestHash,
    })

    if (error) {
      if (error.message.includes('idempotency_key_reused')) {
        throw new HttpError(
          409,
          'idempotency_key_reused',
          'Idempotency key was used for different input.',
        )
      }
      if (error.message.includes('completed_meal_locked')) {
        throw new HttpError(
          409,
          'completed_meal_locked',
          'A completed meal selection cannot be changed.',
        )
      }
      if (error.message.includes('meal_not_completed')) {
        throw new HttpError(
          409,
          'meal_not_completed',
          'Only a completed meal on the current day can be undone.',
        )
      }
      if (error.message.includes('meal_date_not_current')) {
        throw new HttpError(
          409,
          'local_date_mismatch',
          'Meal changes are limited to the current date in the saved profile timezone.',
        )
      }
      if (
        error.message.includes('active_plan_not_found') ||
        error.message.includes('plan_day_not_found') ||
        error.message.includes('meal_slot_not_found') ||
        error.message.includes('meal_option_not_found')
      ) {
        throw new HttpError(
          404,
          'plan_option_not_found',
          'The selected option is not in the active plan.',
        )
      }
      throw new HttpError(503, 'account_mutation_failed', 'Meal selection could not be saved.')
    }

    if (input.action === 'complete-meal') return jsonResponse(request, { completion: data })
    if (input.action === 'undo-meal') return jsonResponse(request, { undo: data })
    return jsonResponse(request, { selection: data })
  } catch (error) {
    return errorResponse(request, error)
  }
})
