import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertCatalogGenerationGate,
  isApprovedGenerationCatalog,
  REQUIRED_PLAN_CATALOG_RELEASE,
} from '../supabase/functions/_shared/catalog-gate.ts'
import {
  assertCurrentConsents,
  loadRequiredConsentVersions,
} from '../supabase/functions/_shared/consent.ts'
import { reserveGiftBudget, type GiftCampaignState } from '../supabase/functions/_shared/gift-campaign.ts'
import { HttpError } from '../supabase/functions/_shared/http.ts'
import type { AiReservation } from '../supabase/functions/_shared/limits.ts'
import {
  runMonthlyGeneration,
  type EntitlementRecord,
  type GenerationJobRecord,
  type GenerationProfile,
  type GenerationStore,
  type ImportedPlan,
  type PeriodRecord,
} from '../supabase/functions/_shared/monthly-generation.ts'
import { createPlanCatalogSnapshot, type PlanCatalogRows } from '../supabase/functions/_shared/plan-catalog.ts'
import {
  generateMonthlyPlanFromProvider,
  isLiveOpenAiRequested,
} from '../supabase/functions/_shared/plan-provider.ts'
import { assertLiveOpenAiHardDisabled, createStructuredResponse } from '../supabase/functions/_shared/openai.ts'
import { buildMonthlyStubPlan } from '../supabase/functions/_shared/starter-plan.ts'

const CONSENT_VERSION = '2026-08-01-alpha'

function stubEnv(extra: Record<string, string | undefined> = {}) {
  vi.stubGlobal('Deno', {
    env: {
      get: (name: string) => {
        const values: Record<string, string | undefined> = {
          AI_MASTER_ENABLED: 'true',
          AI_PLAN_ENABLED: 'true',
          CURRENT_TERMS_VERSION: CONSENT_VERSION,
          CURRENT_PRIVACY_VERSION: CONSENT_VERSION,
          CURRENT_HEALTH_CONSENT_VERSION: CONSENT_VERSION,
          ...extra,
        }
        return values[name]
      },
    },
  })
}

const v2Ingredients = [
  ['ingredient:brown-rice@v2', 'Rice', 'برنج', 'g'],
  ['ingredient:chicken-breast@v2', 'Chicken', 'مرغ', 'g'],
  ['ingredient:olive-oil@v2', 'Olive oil', 'روغن زیتون', 'tsp'],
  ['ingredient:banana@v2', 'Banana', 'موز', 'piece'],
  ['ingredient:red-lentils@v2', 'Lentils', 'عدس', 'g'],
  ['ingredient:spinach@v2', 'Spinach', 'اسفناج', 'g'],
  ['ingredient:almonds@v2', 'Almonds', 'بادام', 'g'],
].map(([id, name_en, name_fa, default_unit]) => ({ id, name_en, name_fa, default_unit }))

const v2Foods = [
  {
    id: 'food:banana-almonds@v2', name_en: 'Banana almonds', name_fa: 'موز و بادام',
    meal_types: ['breakfast', 'morning_snack', 'afternoon_snack'], portable: true,
    calories: 400, protein_g: 10, carbs_g: 75, fat_g: 6, fiber_g: 8,
  },
  {
    id: 'food:chicken-rice-bowl@v2', name_en: 'Chicken rice', name_fa: 'مرغ و برنج',
    meal_types: ['lunch', 'dinner'], portable: false,
    calories: 650, protein_g: 45, carbs_g: 75, fat_g: 19, fiber_g: 7,
  },
  {
    id: 'food:lentil-stew-rice@v2', name_en: 'Lentil stew rice', name_fa: 'عدس و برنج',
    meal_types: ['lunch', 'dinner'], portable: false,
    calories: 650, protein_g: 25, carbs_g: 100, fat_g: 17, fiber_g: 18,
  },
]

const v2FoodIngredients = [
  ['food:banana-almonds@v2', 'ingredient:banana@v2'],
  ['food:banana-almonds@v2', 'ingredient:almonds@v2'],
  ['food:chicken-rice-bowl@v2', 'ingredient:brown-rice@v2'],
  ['food:chicken-rice-bowl@v2', 'ingredient:chicken-breast@v2'],
  ['food:chicken-rice-bowl@v2', 'ingredient:olive-oil@v2'],
  ['food:chicken-rice-bowl@v2', 'ingredient:spinach@v2'],
  ['food:lentil-stew-rice@v2', 'ingredient:brown-rice@v2'],
  ['food:lentil-stew-rice@v2', 'ingredient:red-lentils@v2'],
  ['food:lentil-stew-rice@v2', 'ingredient:olive-oil@v2'],
  ['food:lentil-stew-rice@v2', 'ingredient:spinach@v2'],
].map(([food_id, ingredient_id]) => ({ food_id, ingredient_id }))

const v2Exercises = [
  ['exercise:bodyweight-squat@v2', 'Squat', 'اسکوات'],
  ['exercise:wall-pushup@v2', 'Wall push-up', 'شنا دیوار'],
  ['exercise:glute-bridge@v2', 'Glute bridge', 'پل باسن'],
].map(([id, name_en, name_fa]) => ({ id, name_en, name_fa }))

function catalogRows(releaseId: 'momentum-core@v1' | 'momentum-core@v2'): PlanCatalogRows {
  if (releaseId === 'momentum-core@v1') {
    return {
      releases: [{ id: releaseId }],
      allergens: [{ id: 'allergen:milk@v1', slug: 'milk', name_en: 'Milk', name_fa: 'شیر', aliases: [] }],
      ingredients: v2Ingredients.map((row) => ({
        ...row,
        id: String(row.id).replace('@v2', '@v1'),
      })),
      ingredientAllergens: [],
      foods: v2Foods.map((food) => ({
        ...food,
        id: food.id.replace('@v2', '@v1'),
      })),
      foodIngredients: v2FoodIngredients.map((row) => ({
        food_id: String(row.food_id).replace('@v2', '@v1'),
        ingredient_id: String(row.ingredient_id).replace('@v2', '@v1'),
      })),
      equipment: [{ id: 'equipment:bodyweight@v1' }, { id: 'equipment:wall@v1' }],
      exercises: v2Exercises.map((row) => ({ ...row, id: String(row.id).replace('@v2', '@v1') })),
      exerciseEquipment: [
        { exercise_id: 'exercise:bodyweight-squat@v1', equipment_id: 'equipment:bodyweight@v1' },
        { exercise_id: 'exercise:wall-pushup@v1', equipment_id: 'equipment:bodyweight@v1' },
        { exercise_id: 'exercise:wall-pushup@v1', equipment_id: 'equipment:wall@v1' },
        { exercise_id: 'exercise:glute-bridge@v1', equipment_id: 'equipment:bodyweight@v1' },
      ],
      substitutions: [
        { exercise_id: 'exercise:bodyweight-squat@v1', substitute_exercise_id: 'exercise:glute-bridge@v1' },
        { exercise_id: 'exercise:glute-bridge@v1', substitute_exercise_id: 'exercise:bodyweight-squat@v1' },
      ],
    }
  }
  return {
    releases: [{ id: releaseId }],
    allergens: [{
      id: 'allergen:milk@v2', slug: 'milk', name_en: 'Milk', name_fa: 'شیر', aliases: ['dairy'],
    }],
    ingredients: v2Ingredients,
    ingredientAllergens: [],
    foods: v2Foods,
    foodIngredients: v2FoodIngredients,
    equipment: [{ id: 'equipment:bodyweight@v2' }, { id: 'equipment:wall@v2' }],
    exercises: v2Exercises,
    exerciseEquipment: [
      { exercise_id: 'exercise:bodyweight-squat@v2', equipment_id: 'equipment:bodyweight@v2' },
      { exercise_id: 'exercise:wall-pushup@v2', equipment_id: 'equipment:bodyweight@v2' },
      { exercise_id: 'exercise:wall-pushup@v2', equipment_id: 'equipment:wall@v2' },
      { exercise_id: 'exercise:glute-bridge@v2', equipment_id: 'equipment:bodyweight@v2' },
    ],
    substitutions: [
      { exercise_id: 'exercise:bodyweight-squat@v2', substitute_exercise_id: 'exercise:glute-bridge@v2' },
      { exercise_id: 'exercise:glute-bridge@v2', substitute_exercise_id: 'exercise:bodyweight-squat@v2' },
    ],
  }
}

function entitledProfile(userId = 'user-1'): GenerationProfile {
  return {
    userId,
    locale: 'en-US',
    timezone: 'UTC',
    productRegion: 'intl',
    onboardingStatus: 'complete',
    automationBlockReason: null,
    termsAcceptedAt: '2026-08-01T00:00:00Z',
    termsVersion: CONSENT_VERSION,
    privacyAcceptedAt: '2026-08-01T00:00:00Z',
    privacyVersion: CONSENT_VERSION,
    healthDataConsentAt: '2026-08-01T00:00:00Z',
    healthConsentVersion: CONSENT_VERSION,
    allergies: [],
    goalId: 'goal-1',
  }
}

class MemoryGenerationStore implements GenerationStore {
  profile: GenerationProfile
  catalogRelease: 'momentum-core@v1' | 'momentum-core@v2'
  entitlement: EntitlementRecord | null
  giftReserveCalls = 0
  jobs = new Map<string, GenerationJobRecord>()
  periods: PeriodRecord[] = []
  reservations = new Map<string, AiReservation>()
  importedPlans: ImportedPlan[] = []
  claimCount = new Map<string, number>()

  constructor(options: {
    profile?: GenerationProfile
    catalogRelease?: 'momentum-core@v1' | 'momentum-core@v2'
    entitlement?: EntitlementRecord | null
  } = {}) {
    this.profile = options.profile ?? entitledProfile()
    this.catalogRelease = options.catalogRelease ?? 'momentum-core@v2'
    this.entitlement = 'entitlement' in options
      ? options.entitlement ?? null
      : {
        id: 'ent-1',
        source: 'gift',
        status: 'active',
        periodStart: new Date(Date.now() - 86_400_000).toISOString(),
        periodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      }
  }

  loadProfile = async () => this.profile
  loadCatalog = async () => createPlanCatalogSnapshot(catalogRows(this.catalogRelease))
  loadActiveEntitlement = async () => this.entitlement
  reserveGift = async () => {
    this.giftReserveCalls += 1
    this.entitlement = {
      id: `gift-ent-${this.giftReserveCalls}`,
      source: 'gift',
      status: 'active',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 32 * 86_400_000).toISOString(),
    }
    return { entitlementId: this.entitlement.id }
  }
  findJobByIdempotency = async (_userId: string, key: string) =>
    [...this.jobs.values()].find((job) => job.idempotencyKey === key) ?? null
  findInFlightJob = async (userId: string, exceptJobId?: string) =>
    [...this.jobs.values()].find((job) =>
      job.userId === userId &&
      job.id !== exceptJobId &&
      ['queued', 'validating', 'importing'].includes(job.status)
    ) ?? null
  listPeriods = async () => this.periods
  upsertPeriod = async (input: { userId: string; cycleIndex: number; entitlementId: string }) => {
    const period: PeriodRecord = {
      id: `period-${input.cycleIndex}`,
      userId: input.userId,
      cycleIndex: input.cycleIndex,
      entitlementId: input.entitlementId,
      generationJobId: null,
      importedPlanVersionId: null,
      importedPlanId: null,
      status: 'reserved',
      readyAt: null,
      endsAt: null,
    }
    this.periods.push(period)
    return period
  }
  createJob = async (input: Omit<GenerationJobRecord, 'attemptCount' | 'errorCode' | 'openaiResponseId'>) => {
    const job: GenerationJobRecord = {
      ...input,
      attemptCount: 0,
      errorCode: null,
      openaiResponseId: null,
    }
    this.jobs.set(job.id, job)
    const period = this.periods.find((item) => item.id === input.periodId)
    if (period) period.generationJobId = job.id
    return job
  }
  reserveUsage = async (_userId: string, idempotencyKey: string, requestSha256: string) => {
    const existing = this.reservations.get(idempotencyKey)
    if (existing) return existing
    const reservation: AiReservation = {
      id: `res-${this.reservations.size + 1}`,
      attemptToken: `token-${this.reservations.size + 1}`,
      state: 'new',
    }
    this.reservations.set(idempotencyKey, reservation)
    void requestSha256
    return reservation
  }
  claimJob = async (_userId: string, jobId: string) => {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('missing job')
    this.claimCount.set(jobId, (this.claimCount.get(jobId) ?? 0) + 1)
    if (job.attemptCount >= 1 && job.status !== 'failed') {
      return { claimed: false, job }
    }
    job.attemptCount += 1
    job.status = 'validating'
    return { claimed: true, job }
  }
  setJobStatus = async (jobId: string, status: GenerationJobRecord['status'], patch = {}) => {
    const job = this.jobs.get(jobId)
    if (!job) return
    job.status = status
    if (patch.errorCode !== undefined) job.errorCode = patch.errorCode
    if (patch.openaiResponseId !== undefined) job.openaiResponseId = patch.openaiResponseId
    if (patch.model !== undefined) job.model = patch.model
    if (patch.promptVersion !== undefined) job.promptVersion = patch.promptVersion
  }
  importPlan = async (input) => {
    const imported: ImportedPlan = {
      planId: `plan-${this.importedPlans.length + 1}`,
      planVersionId: `version-${this.importedPlans.length + 1}`,
      importedAt: new Date().toISOString(),
    }
    this.importedPlans.push(imported)
    const period = this.periods.find((item) => item.id === input.periodId)
    if (period) {
      period.importedPlanVersionId = imported.planVersionId
      period.importedPlanId = imported.planId
      period.status = 'ready'
      period.readyAt = imported.importedAt
    }
    const job = [...this.jobs.values()].find((item) => item.id === input.jobId)
    const reservation = job ? this.reservations.get(job.idempotencyKey) : undefined
    if (reservation) reservation.state = 'completed'
    return imported
  }
}

beforeEach(() => {
  stubEnv()
})

describe('monthly generation pipeline', () => {
  it('requires momentum-core@v2 or later and rejects v1', () => {
    expect(isApprovedGenerationCatalog('momentum-core@v2')).toBe(true)
    expect(isApprovedGenerationCatalog('momentum-core@v1')).toBe(false)
    const v1 = createPlanCatalogSnapshot(catalogRows('momentum-core@v1'))
    expect(() => assertCatalogGenerationGate(v1)).toThrow(expect.objectContaining({
      code: 'CATALOG_RELEASE_REQUIRED',
      message: expect.stringContaining(REQUIRED_PLAN_CATALOG_RELEASE),
    }))
    expect(() => assertCatalogGenerationGate(createPlanCatalogSnapshot(catalogRows('momentum-core@v2'))))
      .not.toThrow()
  })

  it('imports a schema-valid stub plan for an entitled user on v2', async () => {
    const store = new MemoryGenerationStore()
    const result = await runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-001',
      store,
    })
    expect(result.httpStatus).toBe(201)
    expect(result.body.job.status).toBe('ready')
    expect(result.body.plan?.plan_version_id).toMatch(/^version-/)
    expect(store.importedPlans).toHaveLength(1)
    expect(store.claimCount.size).toBe(1)
  })

  it('imports a schema-valid FA stub without calling live HTTP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = new MemoryGenerationStore({
      profile: { ...entitledProfile('user-fa'), locale: 'fa-IR' },
    })
    const result = await runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-fa',
      locale: 'fa-IR',
      store,
    })
    expect(result.httpStatus).toBe(201)
    expect(result.body.job.status).toBe('ready')
    expect(store.importedPlans).toHaveLength(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('rejects unentitled users without importing', async () => {
    const store = new MemoryGenerationStore({ entitlement: null })
    store.reserveGift = async () => {
      store.giftReserveCalls += 1
      throw new HttpError(409, 'GIFT_BUDGET_UNAVAILABLE', 'The first-plan gift is not available.')
    }
    await expect(runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-unentitled',
      store,
    })).rejects.toMatchObject({ code: 'ENTITLEMENT_REQUIRED' })
    expect(store.importedPlans).toHaveLength(0)
  })

  it('does not import invalid stub output', async () => {
    const store = new MemoryGenerationStore()
    await expect(runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-invalid',
      invalidStub: true,
      store,
    })).rejects.toMatchObject({ code: 'PLAN_VALIDATION_FAILED' })
    expect(store.importedPlans).toHaveLength(0)
    const job = await store.findJobByIdempotency(store.profile.userId, 'generation-key-invalid')
    expect(job?.status).toBe('failed')
  })

  it('replays the same job for the same idempotency key', async () => {
    const store = new MemoryGenerationStore()
    const first = await runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-replay',
      store,
    })
    const replay = await runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-replay',
      store,
    })
    expect(first.body.job.id).toBe(replay.body.job.id)
    expect(replay.httpStatus).toBe(200)
    expect(replay.body.idempotent_replay).toBe(true)
    expect(store.importedPlans).toHaveLength(1)
    expect(store.jobs.size).toBe(1)
    expect(store.claimCount.size).toBe(1)
  })

  it('decrements gift budget only once across repeated reserve attempts', () => {
    const campaign: GiftCampaignState = {
      id: 'campaign-1',
      enabled: true,
      remainingBudgetUsd: 10,
      reservationCostUsd: 2.5,
      minRemainingUsd: 0,
      allowedMarkets: ['ir', 'intl'],
      startsAt: null,
      endsAt: null,
    }
    let state = campaign
    let reservation = null as ReturnType<typeof reserveGiftBudget>['reservation'] | null
    const first = reserveGiftBudget({
      campaign: state,
      existing: reservation,
      userId: 'user-gift',
      productRegion: 'ir',
      nowIso: '2026-08-18T00:00:00.000Z',
      newReservationId: 'gift-1',
      entitlementId: 'ent-gift-1',
    })
    state = first.campaign
    reservation = first.reservation
    expect(first.created).toBe(true)
    expect(state.remainingBudgetUsd).toBe(7.5)

    const replay = reserveGiftBudget({
      campaign: state,
      existing: reservation,
      userId: 'user-gift',
      productRegion: 'ir',
      nowIso: '2026-08-18T00:00:00.000Z',
      newReservationId: 'gift-1',
      entitlementId: 'ent-gift-1',
    })
    expect(replay.created).toBe(false)
    expect(replay.campaign.remainingBudgetUsd).toBe(7.5)
  })

  it('keeps live OpenAI hard-disabled even when env flags request it', async () => {
    stubEnv({
      AI_PLAN_PROVIDER: 'openai',
      AI_PLAN_LIVE_OPENAI: 'true',
      OPENAI_API_KEY: 'test-key',
    })
    expect(isLiveOpenAiRequested()).toBe(true)
    expect(() => assertLiveOpenAiHardDisabled()).toThrow(expect.objectContaining({
      code: 'LIVE_OPENAI_DISABLED',
    }))
    await expect(createStructuredResponse({
      model: 'gpt-test',
      reasoningEffortEnv: 'OPENAI_PLAN_REASONING_EFFORT',
      instructions: 'x',
      input: {},
      schemaName: 'plan',
      schema: { type: 'object' },
      safetyIdentifier: 'hash',
      promptCacheKey: 'plan',
      maxOutputTokens: 100,
    })).rejects.toMatchObject({ code: 'LIVE_OPENAI_DISABLED' })
    const catalog = createPlanCatalogSnapshot(catalogRows('momentum-core@v2'))
    await expect(generateMonthlyPlanFromProvider({ catalog, locale: 'en-US' }))
      .rejects.toMatchObject({ code: 'LIVE_OPENAI_DISABLED' })
  })

  it('builds a v2-aware stub payload from catalog IDs', () => {
    const catalog = createPlanCatalogSnapshot(catalogRows('momentum-core@v2'))
    const plan = buildMonthlyStubPlan(catalog, 7, 'en-US')
    const days = plan.days as Array<{ meals: Array<{ options: Array<{ food_id: string }> }> }>
    expect(days[0]?.meals[0]?.options[0]?.food_id).toBe('food:banana-almonds@v2')
  })

  it('loads consent versions from the server table when available', async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: {
          terms: '2026-08-01-alpha',
          privacy: '2026-08-01-alpha',
          health: '2026-08-01-alpha',
        },
        error: null,
      })),
    }
    await expect(assertCurrentConsents({
      terms_accepted_at: '2026-08-01T00:00:00Z',
      terms_version: '2026-08-01-alpha',
      privacy_accepted_at: '2026-08-01T00:00:00Z',
      privacy_version: '2026-08-01-alpha',
      health_data_consent_at: '2026-08-01T00:00:00Z',
      health_consent_version: '2026-08-01-alpha',
    }, admin)).resolves.toBeUndefined()
    expect(admin.rpc).toHaveBeenCalledWith('current_legal_document_versions')
  })

  it('rejects stale consent when server versions differ', async () => {
    const admin = {
      rpc: vi.fn(async () => ({
        data: {
          terms: '2026-09-01-beta',
          privacy: '2026-08-01-alpha',
          health: '2026-08-01-alpha',
        },
        error: null,
      })),
    }
    await expect(assertCurrentConsents({
      terms_accepted_at: '2026-08-01T00:00:00Z',
      terms_version: CONSENT_VERSION,
      privacy_accepted_at: '2026-08-01T00:00:00Z',
      privacy_version: CONSENT_VERSION,
      health_data_consent_at: '2026-08-01T00:00:00Z',
      health_consent_version: CONSENT_VERSION,
    }, admin)).rejects.toMatchObject({ code: 'consent_update_required' })
  })

  it('falls back to env consent versions when the table is unreachable', async () => {
    stubEnv({
      CURRENT_TERMS_VERSION: CONSENT_VERSION,
      CURRENT_PRIVACY_VERSION: CONSENT_VERSION,
      CURRENT_HEALTH_CONSENT_VERSION: CONSENT_VERSION,
    })
    const admin = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'connection refused' },
      })),
    }
    await expect(loadRequiredConsentVersions(admin)).resolves.toEqual({
      terms: CONSENT_VERSION,
      privacy: CONSENT_VERSION,
      health: CONSENT_VERSION,
    })
  })

  it('blocks generation when payment method is not collected', async () => {
    const store = new MemoryGenerationStore()
    store.reserveUsage = async () => {
      throw new HttpError(402, 'PAYMENT_METHOD_REQUIRED', 'Add a payment method before generating a plan.')
    }
    await expect(runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-payment',
      store,
    })).rejects.toMatchObject({ code: 'PAYMENT_METHOD_REQUIRED' })
    expect(store.importedPlans).toHaveLength(0)
    expect(store.jobs.size).toBe(0)
  })

  it('never imports for automation-blocked or ineligible profiles', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    for (const profile of [
      { ...entitledProfile('blocked-user'), onboardingStatus: 'automation_blocked' },
      {
        ...entitledProfile('ineligible-user'),
        onboardingStatus: 'complete',
        automationBlockReason: 'eating_disorder_history',
      },
    ] satisfies GenerationProfile[]) {
      const store = new MemoryGenerationStore({ profile })
      await expect(runMonthlyGeneration({
        userId: store.profile.userId,
        emailConfirmed: true,
        idempotencyKey: `generation-key-safety-${profile.userId}`,
        store,
      })).rejects.toMatchObject({ code: 'SAFETY_BLOCKED', status: 403 })
      expect(store.importedPlans).toHaveLength(0)
      expect(store.jobs.size).toBe(0)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('fails closed on invalid catalog IDs in FA and EN without importing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    for (const locale of ['fa-IR', 'en-US'] as const) {
      const store = new MemoryGenerationStore({
        profile: { ...entitledProfile(`invalid-${locale}`), locale },
      })
      await expect(runMonthlyGeneration({
        userId: store.profile.userId,
        emailConfirmed: true,
        idempotencyKey: `generation-key-invalid-${locale}`,
        locale,
        invalidStub: true,
        store,
      })).rejects.toMatchObject({ code: 'PLAN_VALIDATION_FAILED' })
      expect(store.importedPlans).toHaveLength(0)
      expect(store.jobs.size).toBe(1)
      expect([...store.jobs.values()][0]?.status).toBe('failed')
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('fails closed on allergen leaks in FA and EN without importing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    for (const locale of ['fa-IR', 'en-US'] as const) {
      const store = new MemoryGenerationStore({
        profile: {
          ...entitledProfile(`allergen-${locale}`),
          locale,
          allergies: locale === 'fa-IR' ? ['شیر'] : ['dairy'],
        },
      })
      store.loadCatalog = async () => createPlanCatalogSnapshot({
        ...catalogRows('momentum-core@v2'),
        ingredientAllergens: [{
          ingredient_id: 'ingredient:almonds@v2',
          allergen_id: 'allergen:milk@v2',
        }],
      })
      await expect(runMonthlyGeneration({
        userId: store.profile.userId,
        emailConfirmed: true,
        idempotencyKey: `generation-key-allergen-${locale}`,
        locale,
        store,
      })).rejects.toMatchObject({ code: 'PLAN_VALIDATION_FAILED' })
      expect(store.importedPlans).toHaveLength(0)
      expect([...store.jobs.values()][0]?.status).toBe('failed')
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('fails closed on quota without calling OpenAI or importing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = new MemoryGenerationStore()
    store.reserveUsage = async () => {
      throw new HttpError(402, 'quota_exceeded', 'The AI allowance for this period is exhausted.')
    }
    await expect(runMonthlyGeneration({
      userId: store.profile.userId,
      emailConfirmed: true,
      idempotencyKey: 'generation-key-quota',
      store,
    })).rejects.toMatchObject({ code: 'PERIOD_ALREADY_CONSUMED' })
    expect(store.importedPlans).toHaveLength(0)
    expect(store.jobs.size).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
