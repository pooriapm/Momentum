import { integerEnv, optionalEnv, requiredEnv } from './config.ts'
import { HttpError } from './http.ts'

export type AiSafetyReason =
  | 'self_harm_intent'
  | 'self_harm_instructions'
  | 'urgent_medical_symptoms'
  | 'eating_disorder_behavior'
  | 'unsafe_exercise'
  | 'body_shame'
  | 'medical_boundary'
  | 'prompt_injection'
  | 'geo_circumvention'
  | 'provider_harassment'
  | 'provider_hate'
  | 'provider_sexual'
  | 'provider_violence'
  | 'provider_illicit'
  | 'provider_self_harm'

export interface AiSafetyDecision {
  allowed: false
  level: 'blocked' | 'urgent'
  reason: AiSafetyReason
  source: 'deterministic' | 'openai_moderation'
}

export type ModerationInput =
  | string
  | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >

const PATTERNS: Array<{
  reason: AiSafetyReason
  level: AiSafetyDecision['level']
  pattern: RegExp
}> = [
  {
    reason: 'self_harm_intent',
    level: 'urgent',
    pattern:
      /(?:\b(?:i (?:want|plan|intend|am going) to (?:kill|hurt) myself)\b|\bsuicid(?:e|al)\b|\bend my life\b|(?:میخوام|می خواهم|قصد دارم).{0,20}خودم(?:و| را) بکشم|قصد خودکشی|خودکشی کنم|به زندگیم پایان)/i,
  },
  {
    reason: 'urgent_medical_symptoms',
    level: 'urgent',
    pattern:
      /(?:\b(?:can(?:not|'t) breathe|severe chest pain|overdos(?:e|ed)|passed out|signs? of (?:a )?stroke)\b|نمی ?(?:توانم|تونم) نفس بکشم|درد شدید قفسه سینه|اوردوز|بیهوش شدم|علائم سکته)/i,
  },
  {
    reason: 'self_harm_instructions',
    level: 'urgent',
    pattern:
      /(?:\bhow (?:can|do) i (?:kill|hurt) myself\b|روش (?:خودکشی|آسیب زدن به خود)|چطور خودم(?:و| را) بکشم)/i,
  },
  {
    reason: 'geo_circumvention',
    level: 'blocked',
    pattern:
      /(?:\b(?:vpn|proxy).{0,40}(?:bypass|evade|country|region)|\b(?:bypass|evade).{0,40}(?:geo|region|country)\b|دور (?:زدن|بزن).{0,40}(?:محدودیت|کشور|منطقه)|با (?:وی ?پی ?ان|فیلترشکن).{0,40}(?:فعال|استفاده|دور))/i,
  },
  {
    reason: 'prompt_injection',
    level: 'blocked',
    pattern:
      /(?:\bignore (?:all |the )?(?:(?:previous|prior) )?(?:system |developer )?instructions?\b|\breveal (?:the )?(?:system prompt|hidden instructions?)\b|دستور(?:های)? (?:قبلی|سیستم|توسعه.?دهنده) را نادیده|پرامپت (?:سیستم|مخفی) را (?:بگو|نشان بده))/i,
  },
  {
    reason: 'eating_disorder_behavior',
    level: 'blocked',
    pattern:
      /(?:\b(?:purge|pro[- ]?ana|starve myself|make myself vomit|under 800 calories|laxatives? for weight loss)\b|وادار کردن خودم به استفراغ|غذا نخورم تا لاغر|کمتر از ۸۰۰ کالری|ملین برای لاغری|پرخوری و پاکسازی)/i,
  },
  {
    reason: 'unsafe_exercise',
    level: 'blocked',
    pattern:
      /(?:\b(?:train|work out|push through).{0,35}(?:sharp pain|chest pain|dizziness|fainted)|\bexercise.{0,40}(?:without water|while dehydrated)\b|تمرین.{0,35}(?:با درد تیز|با درد قفسه سینه|با سرگیجه|بعد از بیهوشی)|(?:با درد تیز|با درد قفسه سینه|با سرگیجه|بعد از بیهوشی).{0,35}تمرین|بدون آب.{0,25}تمرین)/i,
  },
  {
    reason: 'medical_boundary',
    level: 'blocked',
    pattern:
      /(?:\b(?:diagnose me|prescribe|change my medication|what dose should i take|stop taking my medication)\b|من را تشخیص بده|برایم دارو تجویز کن|دوز دارو(?:یم)? را (?:تعیین|عوض)|دارویم را قطع کنم)/i,
  },
  {
    reason: 'body_shame',
    level: 'blocked',
    pattern:
      /(?:\b(?:punish my body|fat and disgusting|disgusting body|hate my fat body)\b|بدنم چندش(?:آور|اوره)|به خاطر چاقی تنبیه|از بدن چاقم متنفر)/i,
  },
]

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replace(/[\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function deterministicSafetyDecision(text: string): AiSafetyDecision | null {
  const normalized = normalize(text)
  for (const rule of PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return { allowed: false, level: rule.level, reason: rule.reason, source: 'deterministic' }
    }
  }
  return null
}

interface ModerationResult {
  flagged?: unknown
  categories?: Record<string, unknown>
}

function providerDecision(result: ModerationResult): AiSafetyDecision | null {
  if (result.flagged !== true || !result.categories || typeof result.categories !== 'object') {
    return null
  }
  const categories = result.categories
  const flagged = (name: string) => categories[name] === true
  if (flagged('self-harm/intent')) {
    return {
      allowed: false,
      level: 'urgent',
      reason: 'self_harm_intent',
      source: 'openai_moderation',
    }
  }
  if (flagged('self-harm/instructions')) {
    return {
      allowed: false,
      level: 'urgent',
      reason: 'self_harm_instructions',
      source: 'openai_moderation',
    }
  }
  if (flagged('self-harm')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_self_harm',
      source: 'openai_moderation',
    }
  }
  if (flagged('hate') || flagged('hate/threatening')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_hate',
      source: 'openai_moderation',
    }
  }
  if (flagged('harassment') || flagged('harassment/threatening')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_harassment',
      source: 'openai_moderation',
    }
  }
  if (flagged('sexual') || flagged('sexual/minors')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_sexual',
      source: 'openai_moderation',
    }
  }
  if (flagged('violence') || flagged('violence/graphic')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_violence',
      source: 'openai_moderation',
    }
  }
  if (flagged('illicit') || flagged('illicit/violent')) {
    return {
      allowed: false,
      level: 'blocked',
      reason: 'provider_illicit',
      source: 'openai_moderation',
    }
  }
  return {
    allowed: false,
    level: 'blocked',
    reason: 'provider_harassment',
    source: 'openai_moderation',
  }
}

export async function moderateWithOpenAI(
  input: ModerationInput,
  fetcher: typeof fetch = fetch,
): Promise<AiSafetyDecision | null> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    integerEnv('OPENAI_MODERATION_TIMEOUT_MS', 10_000, { min: 2_000, max: 30_000 }),
  )
  let response: Response
  try {
    const baseUrl = optionalEnv('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'
    response = await fetcher(`${baseUrl.replace(/\/$/, '')}/moderations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
        ...(optionalEnv('OPENAI_ORGANIZATION')
          ? { 'OpenAI-Organization': requiredEnv('OPENAI_ORGANIZATION') }
          : {}),
        ...(optionalEnv('OPENAI_PROJECT')
          ? { 'OpenAI-Project': requiredEnv('OPENAI_PROJECT') }
          : {}),
      },
      body: JSON.stringify({
        model: optionalEnv('OPENAI_MODERATION_MODEL') ?? 'omni-moderation-latest',
        input,
      }),
      signal: controller.signal,
    })
  } catch {
    throw new HttpError(
      503,
      'moderation_unavailable',
      'Safety screening is temporarily unavailable.',
    )
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) {
    throw new HttpError(
      503,
      'moderation_unavailable',
      'Safety screening is temporarily unavailable.',
    )
  }
  let payload: { results?: unknown }
  try {
    payload = await response.json() as { results?: unknown }
  } catch {
    throw new HttpError(
      503,
      'moderation_unavailable',
      'Safety screening is temporarily unavailable.',
    )
  }
  if (
    !Array.isArray(payload.results) || payload.results.length !== 1 || !payload.results[0] ||
    typeof payload.results[0] !== 'object'
  ) {
    throw new HttpError(
      503,
      'moderation_unavailable',
      'Safety screening is temporarily unavailable.',
    )
  }
  return providerDecision(payload.results[0] as ModerationResult)
}

export async function screenAiText(
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<AiSafetyDecision | null> {
  return deterministicSafetyDecision(text) ?? await moderateWithOpenAI(text, fetcher)
}

export function safetyHttpError(phase: 'input' | 'output', decision: AiSafetyDecision): HttpError {
  return new HttpError(
    422,
    `ai_safety_${phase}_${decision.reason}`,
    decision.level === 'urgent'
      ? 'This request may involve an urgent safety concern. Seek immediate local help.'
      : 'This request cannot be completed safely.',
  )
}

export function isOutputSafetyDenial(error: unknown): boolean {
  return error instanceof HttpError && error.code.startsWith('ai_safety_output_')
}

export function deterministicSafetyReply(
  locale: 'fa-IR' | 'en-US',
  decision: AiSafetyDecision,
): string {
  if (decision.level === 'urgent') {
    return locale === 'fa-IR'
      ? 'این وضعیت می‌تواند فوری باشد. همین حالا با خدمات اورژانس یا خط بحران محل زندگی‌ات تماس بگیر یا از یک فرد قابل‌اعتماد بخواه کنارت بماند. تنها نمان و برای پاسخ این چت منتظر نمان.'
      : 'This may be urgent. Contact local emergency or crisis services now, or ask a trusted person to stay with you. Do not stay alone or wait for this chat.'
  }
  const replies: Partial<Record<AiSafetyReason, { fa: string; en: string }>> = {
    eating_disorder_behavior: {
      fa:
        'نمی‌توانم در محدودیت شدید، پاکسازی یا رفتار آسیب‌زننده کمک کنم. بهتر است با پزشک یا متخصص اختلالات خوردن صحبت کنی.',
      en:
        'I can’t help with extreme restriction, purging, or other harmful eating behavior. Please talk with a clinician or eating-disorder specialist.',
    },
    unsafe_exercise: {
      fa:
        'نمی‌توانم ادامه‌ی تمرین در شرایط ناایمن را توصیه کنم. تمرین را متوقف کن و اگر درد یا علائم نگران‌کننده ادامه دارد از متخصص کمک بگیر.',
      en:
        'I can’t recommend training through unsafe symptoms. Stop exercising and seek professional help if pain or concerning symptoms continue.',
    },
    medical_boundary: {
      fa:
        'نمی‌توانم تشخیص بدهم، دارو تجویز کنم یا دوز دارو را تغییر دهم. این تصمیم را با پزشک یا داروساز بگیر.',
      en:
        'I can’t diagnose, prescribe, or change medication doses. Please make that decision with a clinician or pharmacist.',
    },
    body_shame: {
      fa:
        'در تنبیه یا تحقیر بدن همراهی نمی‌کنم. می‌توانیم روی یک اقدام سالم و پایدار بدون قضاوت تمرکز کنیم.',
      en:
        'I won’t support body punishment or shame. We can focus on a sustainable, non-judgmental health action instead.',
    },
    prompt_injection: {
      fa: 'نمی‌توانم دستورهای ایمنی یا اطلاعات داخلی را کنار بگذارم.',
      en: 'I can’t bypass safety instructions or reveal internal information.',
    },
    geo_circumvention: {
      fa: 'نمی‌توانم برای دورزدن محدودیت منطقه‌ای سرویس کمک کنم.',
      en: 'I can’t help bypass regional service restrictions.',
    },
  }
  return replies[decision.reason]?.[locale === 'fa-IR' ? 'fa' : 'en'] ??
    (locale === 'fa-IR'
      ? 'نمی‌توانم این درخواست را با اطمینان انجام دهم. اگر موضوع سلامت یا ایمنی است، از یک متخصص واجد شرایط کمک بگیر.'
      : 'I can’t safely complete this request. If this concerns health or safety, contact a qualified professional.')
}
