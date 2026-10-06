import type { AppLocale } from '../../../platform/i18n/catalog'
import type { GenerationWaitPhase } from './generation-wait'

/** Typical plan build. Real runs vary, so the show stretches and never finishes early. */
export const PLAN_BUILD_ESTIMATE_MS = 90_000
export const PLAN_BUILD_ESTIMATE_MIN_MS = 45_000
export const PLAN_BUILD_ESTIMATE_MAX_MS = 150_000
const ESTIMATE_KEY = 'momentum.planBuild.estimateMs'

/** Share of the estimate used to walk every stage except the finale. */
const CURSOR_MAIN = 0.78
/** Cursor value where the last stage begins. The tail of the estimate, and any overrun, stays there. */
const CURSOR_SPLIT = 0.88
const STAGE_AT = [0, 0.16, 0.32, 0.46, 0.58, 0.7, 0.8, CURSOR_SPLIT]
const DETAIL_BEAT_MS = 5_200
const PHASE_FLOOR: Partial<Record<GenerationWaitPhase, number>> = {
  validating: 6,
  importing: 7,
}

export interface PlanBuildStage {
  id: string
  title: Record<AppLocale, string>
  label: Record<AppLocale, string>
  details: Record<AppLocale, readonly string[]>
}

export const PLAN_BUILD_STAGES: readonly PlanBuildStage[] = [
  {
    id: 'profile',
    title: {
      fa: 'داریم شرایط شخصی‌ت رو بررسی می‌کنیم',
      en: "We're looking through what works for you",
    },
    label: { fa: 'شرایط تو', en: 'Your setup' },
    details: {
      fa: ['هدف، روزها و محدودیت‌ها رو کنار هم می‌ذاریم', 'می‌بینیم چقدر وقت برای تمرین داری', 'چیزهایی که نباید تو برنامه باشن رو جدا می‌کنیم'],
      en: ['Goals, days, and limits, side by side', 'Seeing how much time you actually have', 'Setting aside anything that should stay out'],
    },
  },
  {
    id: 'favorites',
    title: {
      fa: 'داریم با توجه به غذاهای مورد علاقه‌ت رژیم غذایی درست می‌کنیم',
      en: "We're building meals around food you actually like",
    },
    label: { fa: 'غذاهای مورد علاقه‌ت', en: 'Food you like' },
    details: {
      fa: ['غذاهایی که دوست داری می‌مونن', 'چیزهایی که نمی‌خوای کنار گذاشته می‌شن', 'الگوی وعده‌هات همون‌طور که گفتی می‌مونه'],
      en: ['The foods you like stay in', 'The ones you skip stay out', 'Your meal pattern stays the way you described it'],
    },
  },
  {
    id: 'meals',
    title: {
      fa: 'داریم وعده‌های این ماه رو کنار هم می‌چینیم',
      en: "We're lining up this month's meals",
    },
    label: { fa: 'وعده‌های ماه', en: "This month's meals" },
    details: {
      fa: ['از صبحانه تا شام، هر کدوم با چند انتخاب', 'میان‌وعده‌ها هم جا دارن', 'مقدارها با هدفت جور می‌شن'],
      en: ['Breakfast through dinner, each with a few choices', 'Snacks have a place too', 'The amounts follow your goal'],
    },
  },
  {
    id: 'training',
    title: {
      fa: 'داریم تمرین‌ها رو با وقت و وسایلت تنظیم می‌کنیم',
      en: "We're fitting the workouts to your time and gear",
    },
    label: { fa: 'تمرین‌ها', en: 'Workouts' },
    details: {
      fa: ['ست‌ها و تکرارها دارن مشخص می‌شن', 'استراحت بین حرکت‌ها هم هست', 'اگه وسیله‌ای نداری، جایگزین می‌ذاریم'],
      en: ['Sets and reps are settling into place', 'Rest between moves is in there too', "If you don't have a piece of gear, there's a stand-in"],
    },
  },
  {
    id: 'week',
    title: {
      fa: 'داریم روزهای تمرین و استراحت رو تو هفته‌ت جا می‌دیم',
      en: "We're placing training and rest on your week",
    },
    label: { fa: 'چیدمان هفته', en: 'Your week' },
    details: {
      fa: ['روزهای شلوغ سبک‌تر می‌مونن', 'روز استراحت عمداً خالیه، جا نیفتاده', 'ترتیب هفته طوری است که بشه انجامش داد'],
      en: ['Busy days stay lighter', 'Rest days are empty on purpose', 'The week is ordered so you can actually do it'],
    },
  },
  {
    id: 'grocery',
    title: {
      fa: 'داریم لیست خرید رو از همون غذاها درمیاریم',
      en: "We're turning those meals into a shopping list",
    },
    label: { fa: 'لیست خرید', en: 'Shopping list' },
    details: {
      fa: ['خرید از روی همون وعده‌هاست', 'لازم نیست خودت حساب کنی چی کم داری', 'چیزهای تکراری جمع می‌شن'],
      en: ['The list comes straight from the meals', "You don't have to work out what's missing", 'Repeated items get grouped'],
    },
  },
  {
    id: 'safety',
    title: {
      fa: 'داریم یه بار دیگه با حساسیت‌ها و محدودیت‌هات چک می‌کنیم',
      en: "We're checking it once more against your limits",
    },
    label: { fa: 'چک محدودیت‌ها', en: 'Your limits' },
    details: {
      fa: ['حساسیت‌ها خط قرمز هستن', 'حرکت نامناسب جایگزین می‌شه', 'این چک، توصیه پزشکی نیست'],
      en: ['Allergies are a hard line', 'A move that doesn’t fit gets swapped', 'This check is not medical advice'],
    },
  },
  {
    id: 'almost',
    title: {
      fa: 'برنامه اختصاصی‌ت تقریباً آماده‌ست',
      en: 'Your plan is almost ready',
    },
    label: { fa: 'تقریباً آماده', en: 'Almost ready' },
    details: {
      fa: ['آخرین هماهنگی غذا و تمرین', 'داریم نتیجه رو مرتب می‌کنیم', 'چند لحظه دیگه می‌تونی ببینی‌ش', 'هنوز روشیم؛ عجله‌ای در کار نیست'],
      en: ['One last pass on food and training', "We're tidying the result", "You'll see it in a moment", "Still on it — there's no rush"],
    },
  },
]

export interface EstimateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function clampPlanBuildEstimate(value: number) {
  if (!Number.isFinite(value)) return PLAN_BUILD_ESTIMATE_MS
  return clamp(value, PLAN_BUILD_ESTIMATE_MIN_MS, PLAN_BUILD_ESTIMATE_MAX_MS)
}

export function readPlanBuildEstimate(storage: EstimateStorage | null = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const raw = storage?.getItem(ESTIMATE_KEY)
    if (raw == null || raw === '') return PLAN_BUILD_ESTIMATE_MS
    return clampPlanBuildEstimate(Number(raw))
  } catch {
    return PLAN_BUILD_ESTIMATE_MS
  }
}

export function rememberPlanBuildDuration(elapsedMs: number, storage: EstimateStorage | null = typeof localStorage === 'undefined' ? null : localStorage) {
  if (!storage || elapsedMs < 15_000) return
  const previous = readPlanBuildEstimate(storage)
  const sample = clamp(elapsedMs, 20_000, 180_000)
  const next = clampPlanBuildEstimate(Math.round(previous * 0.6 + sample * 0.4))
  try {
    storage.setItem(ESTIMATE_KEY, String(next))
  } catch {
    /* private mode */
  }
}

export function planBuildCursor(elapsedMs: number, estimateMs = PLAN_BUILD_ESTIMATE_MS) {
  const elapsed = Math.max(0, elapsedMs)
  const estimate = clampPlanBuildEstimate(estimateMs)
  const mainWindow = estimate * CURSOR_MAIN
  if (elapsed <= mainWindow) return (elapsed / mainWindow) * CURSOR_SPLIT
  if (elapsed <= estimate) {
    const tail = (elapsed - mainWindow) / (estimate - mainWindow)
    return CURSOR_SPLIT + tail * (1 - CURSOR_SPLIT)
  }
  return 1
}

function stageIndexForCursor(cursor: number) {
  let index = 0
  for (let i = 0; i < STAGE_AT.length; i += 1) {
    if (cursor + 1e-9 >= STAGE_AT[i]) index = i
  }
  return index
}

function elapsedForCursor(cursor: number, estimateMs: number) {
  const estimate = clampPlanBuildEstimate(estimateMs)
  const mainWindow = estimate * CURSOR_MAIN
  if (cursor <= CURSOR_SPLIT) return (cursor / CURSOR_SPLIT) * mainWindow
  const tail = (cursor - CURSOR_SPLIT) / (1 - CURSOR_SPLIT)
  return mainWindow + tail * (estimate - mainWindow)
}

export function planBuildBar(elapsedMs: number, estimateMs = PLAN_BUILD_ESTIMATE_MS) {
  const elapsed = Math.max(0, elapsedMs)
  const estimate = clampPlanBuildEstimate(estimateMs)
  const cursor = planBuildCursor(elapsed, estimate)
  if (elapsed <= estimate) return Math.min(0.9, cursor * 0.9)
  const over = (elapsed - estimate) / estimate
  return Math.min(0.97, 0.9 + 0.07 * (1 - Math.exp(-over * 1.2)))
}

export interface PlanBuildFrame {
  estimateMs: number
  elapsedMs: number
  stageIndex: number
  detailIndex: number
  bar: number
  overtime: boolean
}

export function resolvePlanBuildShow(input: {
  elapsedMs: number
  estimateMs?: number
  phase?: GenerationWaitPhase
}): PlanBuildFrame {
  const estimateMs = clampPlanBuildEstimate(input.estimateMs ?? PLAN_BUILD_ESTIMATE_MS)
  const elapsedMs = Math.max(0, input.elapsedMs)
  const cursor = planBuildCursor(elapsedMs, estimateMs)
  const floor = PHASE_FLOOR[input.phase ?? 'generating'] ?? 0
  const stageIndex = Math.max(stageIndexForCursor(cursor), floor)
  const stageStart = elapsedForCursor(STAGE_AT[stageIndex] ?? 0, estimateMs)
  const details = PLAN_BUILD_STAGES[stageIndex]?.details.fa.length ?? 1
  const detailIndex = Math.floor(Math.max(0, elapsedMs - stageStart) / DETAIL_BEAT_MS) % details
  const floorBar = (STAGE_AT[stageIndex] ?? 0) * 0.9
  const bar = Math.max(planBuildBar(elapsedMs, estimateMs), floorBar)
  return {
    estimateMs,
    elapsedMs,
    stageIndex,
    detailIndex,
    bar: Math.min(input.phase === 'ready' ? 1 : 0.97, bar),
    overtime: elapsedMs > estimateMs,
  }
}

export function planBuildPace(locale: AppLocale, frame: PlanBuildFrame) {
  if (frame.overtime) {
    return locale === 'fa'
      ? 'یه کم بیشتر از معمول طول کشیده. هنوز روشیم.'
      : 'Taking a little longer than usual. Still on it.'
  }
  if (frame.stageIndex === 0) {
    return locale === 'fa' ? 'معمولاً یکی دو دقیقه طول می‌کشه.' : 'This usually takes a minute or two.'
  }
  if (frame.stageIndex >= PLAN_BUILD_STAGES.length - 1) {
    return locale === 'fa' ? 'داریم آخرین هماهنگی‌ها رو انجام می‌دیم.' : "We're on the last pass."
  }
  return locale === 'fa' ? 'داریم پیش می‌ریم.' : "We're moving through it."
}
